import Link from "next/link";
import { MetaPronosticProvider } from "@/contexts/metapronostic-context";
import { Activity, ChevronLeft, LogOut } from "lucide-react";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  chat,
  explorer,
}: {
  children: React.ReactNode;
  chat: React.ReactNode;
  explorer: React.ReactNode;
}) {
  const access = await getCurrentChatAccess();

  if (!access.allowed) {
    redirect(access.redirectTo);
  }

  return (
    <MetaPronosticProvider>
      <div className="min-h-screen bg-[#11274c] p-4 text-white sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
                Prediction cockpit
              </p>
              <h1 className="text-2xl font-black tracking-normal">
                MetaPronostic
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {access.user && (
              <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200">
                {access.user.name}
              </span>
            )}
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg bg-lime-400 px-4 py-2 text-sm font-black text-white transition hover:bg-lime-300"
            >
              Admin
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Agent
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Accueil
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
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          {[
            ["Live fixtures", "12", "text-lime-300"],
            ["Model confidence", "78%", "text-cyan-300"],
            ["Odds alerts", "5", "text-amber-300"],
            ["Data sync", "Active", "text-emerald-300"],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase text-slate-400">
                  {label}
                </p>
                <Activity className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`mt-2 text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {chat}
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {explorer}
          </div>
        </div>
      </div>
    </MetaPronosticProvider>
  );
}
