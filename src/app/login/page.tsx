import Link from "next/link";
import { LockKeyhole, ShieldCheck, Trophy } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params?.next || "/admin";
  const authenticatedUser = await getAuthenticatedUser();

  if (authenticatedUser) {
    redirect(
      authenticatedUser.role === "agent" && next.startsWith("/admin")
        ? "/agent"
        : next
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07110d] p-4 text-white">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0b1712] p-6 shadow-2xl shadow-black/30">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lime-400 text-[#07110d]">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
              Secure access
            </p>
            <h1 className="text-2xl font-black">MetaPronostic</h1>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
            <p className="text-sm leading-6 text-slate-200">
              Connecte-toi pour visualiser les collections MongoDB et le contenu
              de la base, ou pour inserer des donnees selon ton role.
            </p>
          </div>
        </div>

        {params?.error === "invalid" && (
          <div className="mb-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
            Email ou mot de passe incorrect.
          </div>
        )}

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-bold text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
              placeholder="admin@metapronostic.local ou agent@metapronostic.local"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-slate-200"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 font-black text-[#07110d] transition hover:bg-lime-300"
          >
            <LockKeyhole className="h-5 w-5" />
            Se connecter
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
