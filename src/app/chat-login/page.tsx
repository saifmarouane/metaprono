import Link from "next/link";
import { LockKeyhole, ShieldCheck, Sparkles, Trophy, UserPlus } from "lucide-react";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ChatLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (error === "invalid") {
    return "Email ou mot de passe incorrect.";
  }

  if (error === "exists") {
    return "Un compte existe deja avec cet email.";
  }

  if (error === "invalid-register") {
    return "Complete le nom, l'email et un mot de passe de 8 caracteres minimum.";
  }

  return null;
}

export default async function ChatLoginPage({ searchParams }: ChatLoginPageProps) {
  const params = await searchParams;
  const access = await getCurrentChatAccess();
  const next = params?.next || "/Dashboard";
  const errorMessage = getErrorMessage(params?.error);

  if (access.allowed) {
    redirect(next);
  }

  return (
    <main className="min-h-screen bg-[#07110d] p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="grid w-full gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#0b1712] p-6">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lime-400 text-[#07110d]">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
                    Chat IA prive
                  </p>
                  <h1 className="text-2xl font-black">MetaPronostic</h1>
                </div>
              </div>
              <h2 className="text-4xl font-black tracking-normal">
                Acces valide par admin avant analyse.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Le chat IA est reserve aux comptes approuves. Cree un compte ou
                connecte-toi, puis l'admin active ton acces depuis son dashboard.
              </p>
            </div>
            <div className="mt-8 rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <p className="text-sm leading-6 text-slate-200">
                  Statuts possibles : en attente, valide, bloque. Seuls les
                  comptes valides peuvent ouvrir le cockpit IA.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0b1712] p-5">
              <div className="mb-5 flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-lime-300" />
                <h2 className="font-black">Connexion chat</h2>
              </div>

              {errorMessage && (
                <div className="mb-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {errorMessage}
                </div>
              )}

              <form action="/api/chat-auth/login" method="post" className="space-y-4">
                <input type="hidden" name="next" value={next} />
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200" htmlFor="login-email">
                    Email
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="username"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
                    placeholder="client@exemple.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200" htmlFor="login-password">
                    Mot de passe
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
                    placeholder="********"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 font-black text-[#07110d] transition hover:bg-lime-300"
                >
                  <Sparkles className="h-5 w-5" />
                  Entrer dans le chat
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0b1712] p-5">
              <div className="mb-5 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-300" />
                <h2 className="font-black">Nouveau compte</h2>
              </div>
              <form action="/api/chat-auth/register" method="post" className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200" htmlFor="name">
                    Nom complet
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="Nom et prenom"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200" htmlFor="register-email">
                    Email
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="client@exemple.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-200" htmlFor="register-password">
                    Mot de passe
                  </label>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="8 caracteres minimum"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 font-black text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  <UserPlus className="h-5 w-5" />
                  Demander l'acces
                </button>
              </form>
            </div>
          </section>

          <div className="lg:col-span-2">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              Retour a l'accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
