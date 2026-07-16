import Link from "next/link";
import { MetaPronosticProvider } from "@/contexts/metapronostic-context";
import { Activity, ChevronLeft, LogOut } from "lucide-react";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  chat,
  explorer: _explorer,
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
      <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-[#11274c] p-2 text-white min-[340px]:p-3 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <BrandLogo size="md" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-lime-300 min-[360px]:text-xs min-[360px]:tracking-[0.22em]">
                Prediction cockpit
              </p>
              <h1 className="truncate text-xl font-black tracking-normal min-[375px]:text-2xl">
                MetaPronostic
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap">
            {access.user && (
              <span className="col-span-1 inline-flex min-w-0 items-center justify-center truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-200 min-[380px]:col-span-2 sm:col-span-1 sm:px-4">
                {access.user.name}
              </span>
            )}
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-lg bg-lime-400 px-3 py-2 text-sm font-black text-white transition hover:bg-lime-300 sm:px-4"
            >
              Admin
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 sm:px-4"
            >
              Agent
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:px-4"
            >
              <ChevronLeft className="h-4 w-4" />
              Accueil
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-100 transition hover:bg-red-400/20 sm:px-4"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-3 md:grid-cols-4">
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
        <div className="min-h-[70vh] lg:h-[calc(100vh-12rem)]">
          <div className="h-full overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            {chat}
          </div>
        </div>
      </div>
    </MetaPronosticProvider>
  );
}
