import Link from "next/link";
import { LogOut, ShieldCheck, Trophy } from "lucide-react";
import { AdminInsertForm } from "@/components/admin/AdminInsertForm";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/agent");
  }

  return (
    <main className="min-h-screen bg-[#07110d] p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lime-400 text-[#07110d]">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
                Agent insertion
              </p>
              <h1 className="text-2xl font-black tracking-normal">
                MetaPronostic Agent
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-lg bg-lime-400 px-4 py-2 text-sm font-black text-[#07110d] transition hover:bg-lime-300"
              >
                Admin
              </Link>
            )}
            <Link
              href="/Dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Dashboard
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-400/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </header>

        <section className="mb-6 rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
            <div>
              <h2 className="font-black">Role agent</h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Tu peux uniquement inserer des donnees dans les collections
                football autorisees. La visualisation complete des tables reste
                reservee au role admin.
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-white/10 bg-[#0b1712] p-5">
          <AdminInsertForm defaultCollection="football_fixtures" />
        </div>
      </div>
    </main>
  );
}

