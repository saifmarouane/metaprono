import Link from "next/link";
import { Ban, LogOut, Trophy } from "lucide-react";

export default function AccessBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11274c] p-4 text-white">
      <section className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0d1b33] p-6 shadow-2xl shadow-black/30">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-300 text-[#11274c]">
            <Ban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">
              Acces bloque
            </p>
            <h1 className="text-2xl font-black">Chat IA indisponible</h1>
          </div>
        </div>

        <p className="rounded-lg border border-red-300/20 bg-red-300/10 p-4 text-sm leading-6 text-slate-200">
          Ton compte n'a pas acces au chat IA actuellement. L'admin peut le
          reactiver depuis le dashboard admin si necessaire.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-black text-white transition hover:bg-lime-300"
          >
            <Trophy className="h-4 w-4" />
            Accueil
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Deconnexion
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
