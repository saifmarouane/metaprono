import Link from "next/link";
import { Clock3, LogOut, ShieldCheck, Trophy } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#11274c] p-4 text-white">
      <section className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0d1b33] p-6 shadow-2xl shadow-black/30">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-300 text-[#11274c]">
            <Clock3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
              Validation requise
            </p>
            <h1 className="text-2xl font-black">Compte en attente</h1>
          </div>
        </div>

        <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
            <p className="text-sm leading-6 text-slate-200">
              Ton compte est cree, mais le chat LLM reste bloque jusqu&apos;a ce que
              l&apos;admin le valide dans le dashboard admin.
            </p>
          </div>
        </div>

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
