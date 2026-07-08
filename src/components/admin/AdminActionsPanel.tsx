import { History, ShieldAlert } from "lucide-react";
import type { PublicUserAction } from "@/lib/user-actions";

type AdminActionsPanelProps = {
  actions: PublicUserAction[];
  error?: string | null;
};

type PredictionPayload = {
  result?: {
    fixture?: {
      fixtureId?: number | null;
      date?: string | null;
      status?: {
        short?: string | null;
      } | null;
      competition?: {
        name?: string | null;
        country?: string | null;
      };
    } | null;
    percentages?: {
      teamAWin?: number;
      draw?: number;
      teamBWin?: number;
      source?: string;
    };
    teams?: {
      teamA?: {
        name?: string;
      };
      teamB?: {
        name?: string;
      };
    };
    injuries?: unknown[];
    lineups?: unknown[];
  };
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPredictionPayload(action: PublicUserAction): PredictionPayload {
  if (!action.payload || typeof action.payload !== "object") {
    return {};
  }

  return action.payload as PredictionPayload;
}

function formatPredictionSource(source: string): string {
  if (source === "ai-web-search") {
    return "llm-web-search";
  }

  return source;
}

export function AdminActionsPanel({ actions, error }: AdminActionsPanelProps) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/10 text-amber-300">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black">Historique actions utilisateurs</h2>
            <p className="text-xs text-slate-400">
              Toutes les predictions lancees par les utilisateurs et admins.
            </p>
          </div>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200">
          {actions.length} action(s)
        </span>
      </div>

      {error && (
        <div className="flex gap-2 border-b border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actions.length === 0 ? (
        <div className="p-5 text-sm text-slate-400">
          Aucune action utilisateur enregistree pour le moment.
        </div>
      ) : (
        <>
        <div className="grid gap-3 p-4 md:hidden">
          {actions.map((action) => {
            const payload = getPredictionPayload(action);
            const result = payload.result;
            const percentages = result?.percentages;
            const fixture = result?.fixture;
            const teamA = result?.teams?.teamA?.name;
            const teamB = result?.teams?.teamB?.name;

            return (
              <article
                key={action.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {action.label}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {action.userEmail}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">
                    {action.userRole}
                  </span>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-3">
                  <p className="text-sm font-black text-white">
                    {teamA ?? "-"} vs {teamB ?? "-"}
                  </p>
                  {percentages && (
                    <p className="mt-2 text-xs font-bold text-slate-300">
                      {percentages.teamAWin}% · {percentages.draw}% ·{" "}
                      {percentages.teamBWin}%
                    </p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <p className="font-black uppercase text-slate-500">Date</p>
                    <p className="mt-1">{formatDate(action.createdAt)}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-slate-500">
                      Fixture
                    </p>
                    <p className="mt-1">{fixture?.fixtureId ?? "-"}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-slate-500">Compos</p>
                    <p className="mt-1">{(result?.lineups ?? []).length}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-slate-500">Blesses</p>
                    <p className="mt-1">{(result?.injuries ?? []).length}</p>
                  </div>
                </div>
                <p className="mt-3 break-all text-[11px] text-slate-500">
                  {action.userId}
                </p>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.04]">
              <tr>
                {[
                  "Date",
                  "Utilisateur",
                  "Action",
                  "Prediction",
                  "Fixture",
                  "Donnees",
                ].map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {actions.map((action) => {
                const payload = getPredictionPayload(action);
                const result = payload.result;
                const percentages = result?.percentages;
                const fixture = result?.fixture;
                const teamA = result?.teams?.teamA?.name;
                const teamB = result?.teams?.teamB?.name;

                return (
                  <tr key={action.id} className="hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {formatDate(action.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">
                        {action.userEmail}
                      </div>
                      <div className="text-xs text-slate-400">
                        {action.userRole} · {action.userId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                        {action.actionType}
                      </span>
                      <div className="mt-2 text-xs text-slate-400">
                        {action.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">
                        {teamA ?? "-"} vs {teamB ?? "-"}
                      </div>
                      {percentages && (
                        <div className="mt-1 text-xs text-slate-300">
                          {percentages.teamAWin}% · {percentages.draw}% ·{" "}
                          {percentages.teamBWin}%
                        </div>
                      )}
                      {percentages?.source && (
                        <div className="mt-1 text-xs text-slate-500">
                          {formatPredictionSource(percentages.source)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="font-bold text-white">
                        {fixture?.fixtureId ?? "-"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {fixture?.competition?.name ?? "-"}
                        {fixture?.competition?.country
                          ? ` · ${fixture.competition.country}`
                          : ""}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fixture?.date ? formatDate(fixture.date) : "-"} ·{" "}
                        {fixture?.status?.short ?? "-"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-300">
                      {(result?.lineups ?? []).length} compo(s) ·{" "}
                      {(result?.injuries ?? []).length} blesse(s)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
