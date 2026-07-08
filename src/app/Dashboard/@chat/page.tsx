"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  History,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { useMetaPronostic } from "@/contexts/metapronostic-context";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type MatchPreview = {
  fixtureId: number | null;
  date: string | null;
  status: { long?: string; short?: string; elapsed?: number | null } | null;
  competition: {
    id: number | null;
    name: string | null;
    country: string | null;
    logo?: string | null;
    flag?: string | null;
    round?: string | null;
  };
  home: { id: number | null; name: string | null; logo?: string | null };
  away: { id: number | null; name: string | null; logo?: string | null };
  goals: { home: number | null; away: number | null };
};

type CompetitionGroup = {
  id: number | null;
  name: string;
  country: string | null;
  logo: string | null;
  flag: string | null;
  liveCount: number;
  todayCount: number;
  nextMatches: MatchPreview[];
};

type DashboardData = {
  generatedAt: string;
  today: string;
  timezone: string;
  summary: {
    live: number;
    today: number;
    finishedToday: number;
    upcomingToday: number;
    nextToday: number;
    competitions: number;
  };
  live: MatchPreview[];
  finishedToday: MatchPreview[];
  upcomingToday: MatchPreview[];
  competitions: CompetitionGroup[];
};

type PredictionData = {
  actionId?: string;
  teams: {
    teamA: { id: number; name: string; logo: string | null };
    teamB: { id: number; name: string; logo: string | null };
  };
  fixture: MatchPreview | null;
  percentages: {
    teamAWin: number;
    draw: number;
    teamBWin: number;
    source: string;
  };
  advice: string | null;
  winner: { name?: string | null; comment?: string | null } | null;
  lineups: Array<{
    team?: { id?: number; name?: string; logo?: string };
    formation?: string;
    startXI?: Array<{ player?: { id?: number; name?: string; pos?: string } }>;
  }>;
  injuries: Array<{
    player?: { id?: number; name?: string; type?: string | null; reason?: string | null };
    team?: { id?: number; name?: string; logo?: string };
  }>;
  teamAnalytics?: {
    teamA: TeamAnalytics | null;
    teamB: TeamAnalytics | null;
  };
  headToHead: {
    count: number;
    matches: MatchPreview[];
  };
  aiAnalysis?: {
    provider: string | null;
    text: string | null;
    structured?: AiStructuredPrediction | null;
    error: string | null;
  };
};

type TeamStatisticsComparisonData = {
  generatedAt: string;
  timezone: string;
  teams: {
    teamA: { id: number; name: string; logo: string | null };
    teamB: { id: number; name: string; logo: string | null };
  };
  teamAJson: unknown;
  teamBJson: unknown;
  shared?: {
    headToHead?: unknown[];
    warnings?: Record<string, string | null>;
  };
};

type TeamStatisticsAiAnalysis = {
  outputText: string;
  outputHtml?: string;
  sentPrompt?: string;
  model?: string;
  promptName?: string;
};

type TeamStatisticsAiAnalysisResponse = {
  ok: true;
  analysis: TeamStatisticsAiAnalysis;
  actionId?: string | null;
  actionSaveError?: string | null;
};

function extractTeamStatisticsJsons(
  teamAJsonInput: unknown,
  teamBJsonInput: unknown
) {
  const teamAJson = teamAJsonInput;
  const teamBJson = teamBJsonInput;

  return {
    teamAJson,
    teamBJson,
  };
}

function normalizeAiHtmlResponse(value: string): string {
  return value
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getSavedHistoryHtml(item: UserActionHistoryItem): string {
  return item.payload?.outputHtml
    ? normalizeAiHtmlResponse(item.payload.outputHtml)
    : "";
}

async function requestPredictionNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

function notifyPredictionFinished(message: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  new Notification("Prediction terminee", {
    body: message,
    icon: "/logo.jpeg",
    tag: "metapronostic-prediction-complete",
  });
}

type JsonTableRow = {
  path: string;
  value: string;
};

function formatJsonTableValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function flattenJsonForTable(
  value: unknown,
  prefix = "",
  rows: JsonTableRow[] = [],
  maxRows = 220
): JsonTableRow[] {
  if (rows.length >= maxRows) {
    return rows;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({ path: prefix || "root", value: "[]" });
      return rows;
    }

    value.forEach((item, index) => {
      if (rows.length < maxRows) {
        flattenJsonForTable(item, `${prefix}[${index}]`, rows, maxRows);
      }
    });
    return rows;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      rows.push({ path: prefix || "root", value: "{}" });
      return rows;
    }

    for (const [key, entryValue] of entries) {
      if (rows.length >= maxRows) {
        break;
      }

      flattenJsonForTable(
        entryValue,
        prefix ? `${prefix}.${key}` : key,
        rows,
        maxRows
      );
    }

    return rows;
  }

  rows.push({ path: prefix || "value", value: formatJsonTableValue(value) });
  return rows;
}

function JsonDataTable({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  const rows = flattenJsonForTable(data);

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#10213d] shadow-lg shadow-black/15">
      <div className="border-b border-white/10 px-4 py-3">
        <h4 className="text-sm font-black text-white">{title}</h4>
        <p className="mt-1 text-xs text-slate-500">
          {rows.length} ligne(s) affichee(s)
        </p>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#10213d] text-slate-400">
            <tr>
              <th className="border-b border-white/10 px-4 py-3 font-black uppercase">
                Champ
              </th>
              <th className="border-b border-white/10 px-4 py-3 font-black uppercase">
                Valeur
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.path}-${index}`} className="border-b border-white/5">
                <td className="max-w-[260px] break-words px-4 py-2 font-bold text-cyan-100">
                  {row.path}
                </td>
                <td className="break-words px-4 py-2 text-slate-200">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type AiStructuredPrediction = {
  verdict: {
    winner: string;
    summary: string;
    confidence: number | null;
    riskLevel: "low" | "medium" | "high";
  };
  probabilities: {
    teamAWin: number | null;
    draw: number | null;
    teamBWin: number | null;
    notes: string;
  };
  teams: Array<{
    name: string;
    formSummary: string;
    strengths: string[];
    weaknesses: string[];
    tacticalIdentity: string;
  }>;
  lastMatches: Array<{
    team: string;
    date: string;
    opponent: string;
    score: string;
    competition: string;
    notes: string;
  }>;
  keyPlayers: Array<{
    team: string;
    name: string;
    role: string;
    recentImpact: string;
    status: string;
  }>;
  absences: Array<{
    team: string;
    name: string;
    reason: string;
    expectedImpact: string;
    confidence: string;
  }>;
  gamePlans: Array<{
    team: string;
    formation: string;
    attackingPlan: string;
    defensivePlan: string;
    keyDuel: string;
  }>;
  predictionFactors: Array<{
    factor: string;
    advantage: string;
    impact: string;
    evidence: string;
  }>;
  risks: string[];
  sources: Array<{
    title: string;
    url: string;
    note: string;
  }>;
};

type TeamAnalytics = {
  team: { id: number; name: string; logo: string | null };
  context: {
    leagueId: number | null;
    season: number | null;
    injuryDate: string;
  };
  teamStatistics: {
    form?: string | null;
    fixtures?: {
      played?: { total?: number };
      wins?: { total?: number };
      draws?: { total?: number };
      loses?: { total?: number };
    };
    goals?: {
      for?: {
        total?: { total?: number };
        average?: { total?: string };
      };
      against?: {
        total?: { total?: number };
        average?: { total?: string };
      };
    };
    clean_sheet?: { total?: number };
    failed_to_score?: { total?: number };
    lineups?: Array<{ formation?: string; played?: number }>;
  } | null;
  standing: {
    rank?: number;
    points?: number;
    goalsDiff?: number;
    group?: string;
    form?: string;
    all?: {
      played?: number;
      win?: number;
      draw?: number;
      lose?: number;
      goals?: { for?: number; against?: number };
    };
  } | null;
  recent: {
    summary: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
    matches: MatchPreview[];
  };
  eventsSummary?: {
    scorers: Array<{ id?: number; name: string; total: number }>;
    yellowCards: number;
    redCards: number;
    cards: Array<{ id?: number; name: string; yellow: number; red: number }>;
  };
  squad: {
    count: number;
    players: Array<{
      id?: number;
      name?: string;
      age?: number;
      number?: number | null;
      position?: string;
      photo?: string;
    }>;
  };
  injuries: Array<{
    player?: { id?: number; name?: string; type?: string | null; reason?: string | null };
    team?: { id?: number; name?: string; logo?: string };
  }>;
};

type UserActionHistoryItem = {
  id: string;
  label: string;
  actionType:
    | "football_prediction"
    | "team_statistics"
    | "team_statistics_ai_analysis";
  createdAt: string;
  payload?: {
    teams?: {
      teamA?: { name?: string; logo?: string | null };
      teamB?: { name?: string; logo?: string | null };
    };
    result?: {
      teams?: {
        teamA?: { name?: string; logo?: string | null };
        teamB?: { name?: string; logo?: string | null };
      };
      percentages?: {
        teamAWin?: number;
        draw?: number;
        teamBWin?: number;
      };
    };
    model?: string;
    promptName?: string;
    outputType?: string;
    outputLength?: number;
    outputHtml?: string;
    outputPreview?: string;
  };
};

function getHistoryActionLabel(actionType: UserActionHistoryItem["actionType"]) {
  if (actionType === "team_statistics") {
    return "Statistiques";
  }

  if (actionType === "team_statistics_ai_analysis") {
    return "Prediction";
  }

  return "Prediction";
}

type WorkspaceSection = "predictions" | "live" | "finished" | "upcoming" | "statistics";
type PredictionTargetMode = "country" | "team";
type ChatPanelMode = "chat" | "prediction";

type TeamSearchOption = {
  id: number;
  name: string;
  country: string | null;
  code: string | null;
  national: boolean;
  logo: string | null;
  city?: string | null;
  venue?: string | null;
};

type CountrySearchOption = {
  name: string;
  code: string | null;
  flag: string | null;
};

type LeagueSearchOption = {
  id: number;
  name: string;
  type: string | null;
  logo: string | null;
  country: string | null;
  season: number;
};

const promptSuggestions = [
  "Analyse les matchs live importants",
  "Quels signaux pour Maroc vs France ?",
  "Explique les blessures du prochain match",
];

const workspaceSections: Array<{
  key: WorkspaceSection;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "predictions",
    label: "Predictions",
    description: "Comparer deux equipes",
    icon: Swords,
  },
  {
    key: "finished",
    label: "Matchs termines",
    description: "Resultats du jour",
    icon: CheckCircle2,
  },
  {
    key: "upcoming",
    label: "Matchs a venir",
    description: "Prochains matchs",
    icon: CalendarDays,
  },
  {
    key: "live",
    label: "Matchs en direct",
    description: "Scores live",
    icon: Radio,
  },
  {
    key: "statistics",
    label: "Statistiques",
    description: "Competitions et equipes",
    icon: TrendingUp,
  },
];

const quickCountryChoices: CountrySearchOption[] = [
  { name: "Morocco", code: "MA", flag: "https://media.api-sports.io/flags/ma.svg" },
  { name: "France", code: "FR", flag: "https://media.api-sports.io/flags/fr.svg" },
  { name: "England", code: "GB", flag: "https://media.api-sports.io/flags/gb.svg" },
  { name: "Spain", code: "ES", flag: "https://media.api-sports.io/flags/es.svg" },
  { name: "Italy", code: "IT", flag: "https://media.api-sports.io/flags/it.svg" },
  { name: "Germany", code: "DE", flag: "https://media.api-sports.io/flags/de.svg" },
  { name: "Brazil", code: "BR", flag: "https://media.api-sports.io/flags/br.svg" },
  { name: "Argentina", code: "AR", flag: "https://media.api-sports.io/flags/ar.svg" },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function normalizeTeamLookup(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function createNationalTeamOption(country: CountrySearchOption): TeamSearchOption {
  return {
    id: 0,
    name: country.name,
    country: country.name,
    code: country.code,
    national: true,
    logo: country.flag,
    city: null,
    venue: null,
  };
}

function PercentBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TeamMark({
  src,
  name,
  className = "h-6 w-6",
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ? `${name} logo` : "Team logo"}
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <span className="text-[10px] font-black text-slate-400">
          {name?.slice(0, 2).toUpperCase() ?? "-"}
        </span>
      )}
    </span>
  );
}

function SelectedTeamPanel({
  label,
  team,
  country,
  league,
  city,
}: {
  label: string;
  team: TeamSearchOption | null;
  country: string | null;
  league: LeagueSearchOption | null;
  city: string | null;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        team
          ? "border-lime-300/25 bg-lime-300/[0.08]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <TeamMark
          src={team?.logo}
          name={team?.name}
          className="h-11 w-11 rounded-lg"
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black text-white">
              {team?.name ?? "Equipe non selectionnee"}
            </p>
            {team && (
              <span className="shrink-0 rounded-md bg-lime-300/15 px-2 py-0.5 text-[10px] font-black uppercase text-lime-100">
                Choisie
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            {[city, league?.name, country ?? team?.country]
              .filter(Boolean)
              .join(" · ") || "Filtrer puis choisir depuis l'API"}
          </p>
        </div>
      </div>
      {team && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-white/10 bg-black/15 px-2 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">API ID</p>
            <p className="mt-1 truncate text-xs font-black text-white">
              {team.id > 0 ? team.id : "Recherche par nom"}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/15 px-2 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Type</p>
            <p className="mt-1 truncate text-xs font-black text-white">
              {team.national ? "Selection" : "Club"}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/15 px-2 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Pays</p>
            <p className="mt-1 truncate text-xs font-black text-white">
              {team.country ?? "-"}
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/15 px-2 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Ville/Stade</p>
            <p className="mt-1 truncate text-xs font-black text-white">
              {team.city ?? team.venue ?? "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchStatusBadge({
  match,
  tone,
}: {
  match: MatchPreview;
  tone: "live" | "finished" | "upcoming";
}) {
  const styles = {
    live: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    finished: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    upcoming: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-black ${styles[tone]}`}
    >
      {tone === "live" && <span className="h-2 w-2 rounded-full bg-emerald-300" />}
      {match.status?.elapsed ?? match.status?.short ?? "-"}
    </span>
  );
}

function MatchCard({
  match,
  tone,
}: {
  match: MatchPreview;
  tone: "live" | "finished" | "upcoming";
}) {
  const accent = {
    live: "from-emerald-300/35",
    finished: "from-cyan-300/35",
    upcoming: "from-amber-300/35",
  };

  return (
    <article className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0f223f] p-3 shadow-lg shadow-black/15">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent[tone]} via-white/10 to-transparent`} />
      <div className="mb-3 flex items-start justify-between gap-3">
        <MatchStatusBadge match={match} tone={tone} />
        <span className="whitespace-nowrap text-xs font-bold text-slate-500">
          {formatDate(match.date)}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <TeamMark src={match.home.logo} name={match.home.name} />
          <p className="min-w-0 truncate text-sm font-black text-white" title={match.home.name ?? ""}>
            {match.home.name ?? "-"}
          </p>
        </div>
        <p className="rounded-md bg-white/[0.08] px-2 py-1 text-sm font-black text-cyan-100">
          {match.goals.home ?? "-"} - {match.goals.away ?? "-"}
        </p>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <p className="min-w-0 truncate text-right text-sm font-black text-white" title={match.away.name ?? ""}>
            {match.away.name ?? "-"}
          </p>
          <TeamMark src={match.away.logo} name={match.away.name} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-bold text-slate-300">
          {match.competition.name ?? "-"}
        </p>
        <p className="shrink-0 text-xs text-slate-500">
          {match.competition.country ?? "Global"}
        </p>
      </div>
    </article>
  );
}

function MatchZone({
  title,
  description,
  matches,
  tone,
  icon: Icon,
}: {
  title: string;
  description: string;
  matches: MatchPreview[];
  tone: "live" | "finished" | "upcoming";
  icon: typeof Radio;
}) {
  const zoneStyles = {
    live: {
      icon: "bg-emerald-300/10 text-emerald-200",
      count: "bg-emerald-300/10 text-emerald-100",
    },
    finished: {
      icon: "bg-cyan-300/10 text-cyan-200",
      count: "bg-cyan-300/10 text-cyan-100",
    },
    upcoming: {
      icon: "bg-amber-300/10 text-amber-200",
      count: "bg-amber-300/10 text-amber-100",
    },
  };

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${zoneStyles[tone].icon}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-white">{title}</h3>
            <p className="truncate text-xs text-slate-400">{description}</p>
          </div>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-black ${zoneStyles[tone].count}`}>
          {matches.length}
        </span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {matches.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400 sm:col-span-2 xl:col-span-3">
            Aucun match dans cette categorie pour le moment.
          </p>
        )}
        {matches.slice(0, 6).map((match) => (
          <MatchCard key={`${tone}-${match.fixtureId}`} match={match} tone={tone} />
        ))}
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value ?? "-"}</p>
    </div>
  );
}

function TeamAnalyticsCard({ analytics }: { analytics: TeamAnalytics }) {
  const stats = analytics.teamStatistics;
  const standing = analytics.standing;
  const recent = analytics.recent.summary;
  const eventsSummary = analytics.eventsSummary;
  const favoriteLineup = stats?.lineups?.[0];

  return (
    <article className="rounded-xl border border-white/10 bg-[#10213d] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamMark src={analytics.team.logo} name={analytics.team.name} className="h-10 w-10" />
          <div className="min-w-0">
          <p className="truncate text-lg font-black text-white">
            {analytics.team.name}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            League {analytics.context.leagueId ?? "-"} · Saison{" "}
            {analytics.context.season ?? "-"}
          </p>
          </div>
        </div>
        <span className="rounded-md border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-xs font-black text-lime-100">
          Form {stats?.form ?? standing?.form ?? "-"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Classement" value={standing?.rank ? `#${standing.rank}` : "-"} />
        <StatTile label="Points" value={standing?.points} />
        <StatTile label="Matches" value={stats?.fixtures?.played?.total ?? standing?.all?.played} />
        <StatTile label="V / N / D" value={`${stats?.fixtures?.wins?.total ?? recent.wins} / ${stats?.fixtures?.draws?.total ?? recent.draws} / ${stats?.fixtures?.loses?.total ?? recent.losses}`} />
        <StatTile label="Buts pour" value={stats?.goals?.for?.total?.total ?? recent.goalsFor} />
        <StatTile label="Buts contre" value={stats?.goals?.against?.total?.total ?? recent.goalsAgainst} />
        <StatTile label="Moy. buts" value={stats?.goals?.for?.average?.total} />
        <StatTile label="Moy. encaisses" value={stats?.goals?.against?.average?.total} />
        <StatTile label="Clean sheets" value={stats?.clean_sheet?.total} />
        <StatTile label="Sans marquer" value={stats?.failed_to_score?.total} />
        <StatTile label="Cartons jaunes" value={eventsSummary?.yellowCards} />
        <StatTile label="Cartons rouges" value={eventsSummary?.redCards} />
        <StatTile label="Diff. buts" value={standing?.goalsDiff} />
        <StatTile
          label="Buts classement"
          value={
            standing?.all?.goals
              ? `${standing.all.goals.for ?? 0}-${standing.all.goals.against ?? 0}`
              : null
          }
        />
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Forme recente
          </p>
          <p className="mt-2 text-sm font-bold text-slate-200">
            {recent.played} joues · {recent.wins}V · {recent.draws}N ·{" "}
            {recent.losses}D · {recent.goalsFor}-{recent.goalsAgainst} buts
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Derniers matchs joues
          </p>
          <div className="mt-3 grid gap-2">
            {analytics.recent.matches.length === 0 && (
              <p className="text-xs text-slate-500">
                Aucun match recent disponible.
              </p>
            )}
            {analytics.recent.matches.slice(0, 5).map((match) => {
              const isHome = match.home.id === analytics.team.id;
              const opponent = isHome ? match.away : match.home;
              const teamGoals = isHome ? match.goals.home : match.goals.away;
              const opponentGoals = isHome ? match.goals.away : match.goals.home;

              return (
                <div
                  key={match.fixtureId ?? `${match.date}-${opponent.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamMark src={opponent.logo} name={opponent.name} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-white">
                        {isHome ? "vs" : "@"} {opponent.name ?? "-"}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {match.competition.name ?? "-"} · {formatDate(match.date)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-white/[0.07] px-2 py-1 text-xs font-black text-cyan-100">
                    {teamGoals ?? "-"}-{opponentGoals ?? "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Effectif
          </p>
          <p className="mt-2 text-sm font-bold text-slate-200">
            {analytics.squad.count} joueur(s)
            {favoriteLineup?.formation
              ? ` · formation frequente ${favoriteLineup.formation}`
              : ""}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
            {analytics.squad.players
              .slice(0, 8)
              .map((player) => player.name)
              .filter(Boolean)
              .join(", ") || "Effectif non disponible"}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Buteurs recents
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
            {eventsSummary?.scorers.length
              ? eventsSummary.scorers
                  .map((scorer) => `${scorer.name} (${scorer.total})`)
                  .join(", ")
              : "Buteurs non disponibles pour les derniers matchs."}
          </p>
        </div>

        <div className="rounded-lg border border-amber-300/15 bg-amber-300/10 p-3">
          <p className="text-xs font-black uppercase text-amber-100/70">
            Discipline recente
          </p>
          <p className="mt-2 text-sm font-bold text-amber-100">
            {eventsSummary?.yellowCards ?? 0} jaunes ·{" "}
            {eventsSummary?.redCards ?? 0} rouges
          </p>
          {eventsSummary?.cards.length ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-amber-100/80">
              {eventsSummary.cards
                .map((card) => `${card.name}: ${card.yellow}J/${card.red}R`)
                .join(", ")}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-red-300/15 bg-red-400/10 p-3">
          <p className="text-xs font-black uppercase text-red-100/70">
            Blesses / absences
          </p>
          <p className="mt-2 text-sm font-bold text-red-100">
            {analytics.injuries.length} joueur(s)
          </p>
          {analytics.injuries.length > 0 && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-100/80">
              {analytics.injuries
                .slice(0, 5)
                .map((injury) => injury.player?.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-black uppercase text-slate-500">
            Joueurs existants
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {analytics.squad.players.slice(0, 12).map((player) => (
              <div
                key={player.id ?? player.name}
                className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2"
              >
                <TeamMark
                  src={player.photo}
                  name={player.name}
                  className="h-8 w-8"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">
                    {player.name ?? "Joueur"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {player.position ?? "-"}
                    {player.number ? ` · #${player.number}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {analytics.squad.players.length === 0 && (
              <p className="text-sm text-slate-400 sm:col-span-2">
                Effectif non disponible.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function AiList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="text-xs text-slate-500">Non disponible</span>
        )}
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AiProbabilityBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: string;
}) {
  if (value == null) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/15 p-3">
        <div className="flex items-center justify-between gap-3 text-xs font-black uppercase text-slate-300">
          <span>{label}</span>
          <span className="text-slate-500">Non disponible</span>
        </div>
      </div>
    );
  }

  return <PercentBar label={label} value={value} tone={tone} />;
}

function AiAnalysisSection({ prediction }: { prediction: PredictionData }) {
  const structured = prediction.aiAnalysis?.structured;

  return (
    <section className="rounded-xl border border-lime-300/20 bg-lime-300/[0.06] p-4 shadow-lg shadow-black/15">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-300/15 text-lime-100">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-white">Prediction LLM dediee</h3>
          <p className="truncate text-xs text-lime-100/70">
            {prediction.aiAnalysis?.provider
              ? "Pipeline LLM actif"
              : "API-FOOTBALL utilise uniquement pour equipes et logos"}
          </p>
        </div>
      </div>

      {structured ? (
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase text-lime-100/75">
                Verdict LLM
              </p>
              <h4 className="mt-2 text-xl font-black text-white">
                {structured.verdict.winner}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {structured.verdict.summary}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatTile
                  label="Confiance"
                  value={
                    structured.verdict.confidence == null
                      ? "Non disponible"
                      : `${structured.verdict.confidence}%`
                  }
                />
                <StatTile
                  label="Risque"
                  value={structured.verdict.riskLevel}
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Probabilites LLM
              </p>
              <div className="mt-4 grid gap-4">
                <AiProbabilityBar
                  label={`${prediction.teams.teamA.name} gagne`}
                  value={structured.probabilities.teamAWin}
                  tone="bg-emerald-300"
                />
                <AiProbabilityBar
                  label="Egalite"
                  value={structured.probabilities.draw}
                  tone="bg-amber-300"
                />
                <AiProbabilityBar
                  label={`${prediction.teams.teamB.name} gagne`}
                  value={structured.probabilities.teamBWin}
                  tone="bg-cyan-300"
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                {structured.probabilities.notes}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {structured.teams.map((team) => (
              <article
                key={team.name}
                className="rounded-xl border border-white/10 bg-[#10213d] p-4"
              >
                <h4 className="font-black text-white">{team.name}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {team.formSummary}
                </p>
                <p className="mt-3 text-xs font-black uppercase text-cyan-100/75">
                  Identite tactique
                </p>
                <p className="mt-1 text-sm leading-6 text-cyan-50/90">
                  {team.tacticalIdentity}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <AiList title="Forces" items={team.strengths} />
                  <AiList title="Faiblesses" items={team.weaknesses} />
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h4 className="font-black text-white">10 derniers matchs joues</h4>
              <p className="text-xs font-bold text-slate-500">
                Jusqu&apos;a 10 matchs par equipe selon les sources trouvees
              </p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2">Equipe</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Adversaire</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Competition</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {structured.lastMatches.map((match, index) => (
                    <tr
                      key={`${match.team}-${match.date}-${match.opponent}-${index}`}
                      className="border-b border-white/5 text-slate-200"
                    >
                      <td className="px-3 py-2 font-bold">{match.team}</td>
                      <td className="px-3 py-2 text-slate-400">{match.date}</td>
                      <td className="px-3 py-2">{match.opponent}</td>
                      <td className="px-3 py-2 font-black text-lime-100">
                        {match.score}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {match.competition}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{match.notes}</td>
                    </tr>
                  ))}
                  {structured.lastMatches.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={6}>
                        Derniers matchs non disponibles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-4">
            <h4 className="font-black text-cyan-50">
              Informations utilisees pour predire
            </h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {structured.predictionFactors.map((factor, index) => (
                <div
                  key={`${factor.factor}-${index}`}
                  className="rounded-lg border border-cyan-300/15 bg-black/15 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-black text-white">
                      {factor.factor}
                    </p>
                    <span className="shrink-0 rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">
                      {factor.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-cyan-100/75">
                    Avantage: {factor.advantage}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {factor.evidence}
                  </p>
                </div>
              ))}
              {structured.predictionFactors.length === 0 && (
                <p className="rounded-lg border border-cyan-300/15 bg-black/15 p-3 text-sm text-cyan-100/75 md:col-span-2">
                  Facteurs non disponibles. Le LLM n&apos;a pas retourne de details
                  exploitables.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
              <h4 className="font-black text-white">Joueurs cles</h4>
              <div className="mt-3 grid gap-2">
                {structured.keyPlayers.map((player, index) => (
                  <div
                    key={`${player.team}-${player.name}-${index}`}
                    className="rounded-lg border border-white/10 bg-black/15 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-black text-white">
                        {player.name}
                      </p>
                      <span className="shrink-0 rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-100">
                        {player.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {player.team} · {player.role}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {player.recentImpact}
                    </p>
                  </div>
                ))}
                {structured.keyPlayers.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Joueurs cles non disponibles.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-red-300/15 bg-red-400/10 p-4">
              <h4 className="font-black text-red-100">Absences et blesses</h4>
              <div className="mt-3 grid gap-2">
                {structured.absences.map((absence, index) => (
                  <div
                    key={`${absence.team}-${absence.name}-${index}`}
                    className="rounded-lg border border-red-300/15 bg-black/15 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-black text-red-50">
                        {absence.name}
                      </p>
                      <span className="shrink-0 rounded-md bg-red-300/10 px-2 py-1 text-xs font-black text-red-100">
                        {absence.confidence}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-red-100/70">
                      {absence.team} · {absence.reason}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-red-50/85">
                      {absence.expectedImpact}
                    </p>
                  </div>
                ))}
                {structured.absences.length === 0 && (
                  <p className="text-sm text-red-100/75">
                    Absences non disponibles ou non confirmees.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {structured.gamePlans.map((plan) => (
              <article
                key={plan.team}
                className="rounded-xl border border-white/10 bg-[#10213d] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="min-w-0 truncate font-black text-white">
                    Plan de jeu: {plan.team}
                  </h4>
                  <span className="shrink-0 rounded-md border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-xs font-black text-lime-100">
                    {plan.formation}
                  </span>
                </div>
                <div className="grid gap-3">
                  <StatTile label="Offensif" value={plan.attackingPlan} />
                  <StatTile label="Defensif" value={plan.defensivePlan} />
                  <StatTile label="Duel cle" value={plan.keyDuel} />
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 p-4">
              <h4 className="font-black text-amber-100">Risques et limites</h4>
              <ul className="mt-3 grid gap-2">
                {structured.risks.map((risk) => (
                  <li
                    key={risk}
                    className="rounded-lg border border-amber-300/15 bg-black/15 p-3 text-sm leading-6 text-amber-50/90"
                  >
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <h4 className="font-black text-white">Sources LLM</h4>
              <div className="mt-3 grid gap-2">
                {structured.sources.map((source, index) => (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
                  >
                    <p className="truncate text-sm font-black text-cyan-100">
                      {source.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      {source.note}
                    </p>
                  </a>
                ))}
                {structured.sources.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Sources non disponibles.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : prediction.aiAnalysis?.text ? (
        <div className="whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100">
          {prediction.aiAnalysis.text}
        </div>
      ) : (
        <p className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
          Analyse LLM non disponible
          {prediction.aiAnalysis?.error ? `: ${prediction.aiAnalysis.error}` : "."}
        </p>
      )}
    </section>
  );
}

function TeamAnalyticsSection({ prediction }: { prediction: PredictionData }) {
  const teamA = prediction.teamAnalytics?.teamA;
  const teamB = prediction.teamAnalytics?.teamB;

  if (!teamA && !teamB) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#10213d] p-4">
        <p className="text-sm font-bold text-slate-400">
          Statistiques equipes non disponibles pour ce match.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-white">Statistiques des equipes</h3>
          <p className="text-xs text-slate-400">
            Donnees API-FOOTBALL: team statistics, standings, forme, effectif et absences.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {teamA && <TeamAnalyticsCard analytics={teamA} />}
        {teamB && <TeamAnalyticsCard analytics={teamB} />}
      </div>
    </section>
  );
}

function SelectedTeamsInsight({
  selectedTeamA,
  selectedTeamB,
  teamACountryFilter,
  teamBCountryFilter,
  teamALeagueFilter,
  teamBLeagueFilter,
  teamACityFilter,
  teamBCityFilter,
}: {
  selectedTeamA: TeamSearchOption | null;
  selectedTeamB: TeamSearchOption | null;
  teamACountryFilter: string | null;
  teamBCountryFilter: string | null;
  teamALeagueFilter: LeagueSearchOption | null;
  teamBLeagueFilter: LeagueSearchOption | null;
  teamACityFilter: string | null;
  teamBCityFilter: string | null;
}) {
  const bothSelected = selectedTeamA && selectedTeamB;

  return (
    <section className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-white">Apercu avant prediction</h3>
          <p className="text-xs text-slate-400">
            Les donnees completes arrivent apres l&apos;appel prediction.
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <SelectedTeamPanel
          label="Equipe A"
          team={selectedTeamA}
          country={teamACountryFilter}
          league={teamALeagueFilter}
          city={teamACityFilter}
        />
        <SelectedTeamPanel
          label="Equipe B"
          team={selectedTeamB}
          country={teamBCountryFilter}
          league={teamBLeagueFilter}
          city={teamBCityFilter}
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <StatTile
          label="Type A"
          value={
            selectedTeamA
              ? selectedTeamA.national
                ? "Selection nationale"
                : "Club"
              : null
          }
        />
        <StatTile
          label="Type B"
          value={
            selectedTeamB
              ? selectedTeamB.national
                ? "Selection nationale"
                : "Club"
              : null
          }
        />
        <StatTile
          label="Pret"
          value={bothSelected ? "Oui, lancer la prediction" : "Deux equipes requises"}
        />
      </div>
    </section>
  );
}

function TeamSearchSelect({
  label,
  mode,
  onModeChange,
  query,
  onQueryChange,
  selectedTeam,
  onSelect,
  onCountrySelect,
  onNationalTeamSelect,
  onLeagueSelect,
  onCitySelect,
  countries,
  leagues,
  cities,
  options,
  isLoading,
}: {
  label: string;
  mode: PredictionTargetMode;
  onModeChange: (mode: PredictionTargetMode) => void;
  query: string;
  onQueryChange: (value: string) => void;
  selectedTeam: TeamSearchOption | null;
  onSelect: (team: TeamSearchOption) => void;
  onCountrySelect: (country: CountrySearchOption) => void;
  onNationalTeamSelect: (country: CountrySearchOption) => void;
  onLeagueSelect: (league: LeagueSearchOption) => void;
  onCitySelect: (city: string) => void;
  countries: CountrySearchOption[];
  leagues: LeagueSearchOption[];
  cities: string[];
  options: TeamSearchOption[];
  isLoading: boolean;
}) {
  const displayedCountries =
    query.trim()
      ? countries.filter((country) =>
          normalizeTeamLookup(country.name).includes(normalizeTeamLookup(query))
        )
      : countries;
  const displayedLeagues =
    mode === "team" && query.trim()
      ? leagues.filter((league) =>
          normalizeTeamLookup(league.name).includes(normalizeTeamLookup(query))
        )
      : leagues;
  const displayedCities =
    mode === "team" && query.trim()
      ? cities.filter((city) =>
          normalizeTeamLookup(city).includes(normalizeTeamLookup(query))
        )
      : cities;
  const displayedOptions =
    mode === "team" && query.trim()
      ? options.filter((team) =>
          [
            team.name,
            team.country ?? "",
            team.city ?? "",
            team.venue ?? "",
          ].some((value) =>
            normalizeTeamLookup(value).includes(normalizeTeamLookup(query))
          )
        )
      : options;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="block text-xs font-black uppercase text-slate-500">
          {label}
        </label>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-white/10 bg-black/20">
          {[
            ["country", "Pays"],
            ["team", "Equipe"],
          ].map(([value, title]) => {
            const isActive = mode === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value as PredictionTargetMode)}
                className={`px-2 py-1 text-[11px] font-black uppercase transition ${
                  isActive
                    ? "bg-lime-300/15 text-lime-100"
                    : "text-slate-400 hover:bg-white/[0.06]"
                }`}
              >
                {title}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative">
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 transition focus-within:ring-2 focus-within:ring-cyan-300/10 ${
            selectedTeam
              ? "border-lime-300/35 bg-lime-300/[0.08]"
              : "border-white/10 bg-black/20 focus-within:border-cyan-300/50"
          }`}
        >
          <TeamMark
            src={selectedTeam?.logo}
            name={selectedTeam?.name ?? query}
            className="h-7 w-7"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
            placeholder={
              mode === "country"
                ? "Filtrer la liste des pays..."
                : "Chercher une equipe..."
            }
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
          {selectedTeam && !isLoading && (
            <span className="hidden rounded-md bg-lime-300/15 px-2 py-1 text-[10px] font-black uppercase text-lime-100 sm:inline">
              Selectionnee
            </span>
          )}
        </div>

        {selectedTeam && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-lime-300/20 bg-lime-300/[0.07] px-3 py-2">
            <TeamMark src={selectedTeam.logo} name={selectedTeam.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-lime-50">
                {selectedTeam.name}
              </p>
              <p className="truncate text-[11px] text-lime-100/70">
                {[selectedTeam.city, selectedTeam.country]
                  .filter(Boolean)
                  .join(" · ") || "Equipe API selectionnee"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="shrink-0 rounded-md border border-lime-300/20 bg-black/15 px-2 py-1 text-[10px] font-black uppercase text-lime-100 hover:bg-black/25"
            >
              Changer
            </button>
          </div>
        )}

        {!selectedTeam && (
          <div className="mt-2 max-h-[420px] overflow-y-auto rounded-lg border border-white/10 bg-[#0d1b33] p-2 shadow-xl shadow-black/20">
            {mode === "team" && (
            <div className="mb-2 rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-3">
              <p className="text-xs font-black uppercase text-cyan-100">
                Parcours guide
              </p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/75">
                Commence par un pays rapide ou tape une lettre. Ensuite clique une vraie equipe dans la section Equipes.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quickCountryChoices.map((country) => (
                  <button
                    key={country.code ?? country.name}
                    type="button"
                    onClick={() => onNationalTeamSelect(country)}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-black/15 px-2 py-2 text-left hover:bg-white/[0.07]"
                  >
                    <TeamMark
                      src={country.flag}
                      name={country.name}
                      className="h-5 w-5"
                    />
                    <span className="truncate text-xs font-black text-white">
                      {country.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold text-cyan-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des options API...
              </div>
            )}

            {displayedCountries.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  {mode === "country" ? "Tous les pays" : "Pays"}
                </p>
                {displayedCountries.map((country) => (
                  <div
                    key={`${country.name}-${country.code ?? "country"}`}
                    className="rounded-lg px-2 py-2 transition hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center gap-3">
                      <TeamMark
                        src={country.flag}
                        name={country.name}
                        className="h-6 w-6"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white">
                          {country.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          Selection nationale ou filtre clubs
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 pl-9">
                      <button
                        type="button"
                        onClick={() => onNationalTeamSelect(country)}
                        className={`${mode === "country" ? "col-span-2" : ""} rounded-md bg-lime-300/15 px-2 py-1.5 text-[11px] font-black uppercase text-lime-100 hover:bg-lime-300/20`}
                      >
                        {mode === "country" ? "Choisir ce pays" : "Selectionner pays"}
                      </button>
                      {mode === "team" && (
                      <button
                        type="button"
                        onClick={() => onCountrySelect(country)}
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] font-black uppercase text-slate-200 hover:bg-white/[0.08]"
                      >
                        Voir clubs
                      </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mode === "team" && displayedLeagues.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Ligues
                </p>
                {displayedLeagues.map((league) => (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => onLeagueSelect(league)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.07]"
                  >
                    <TeamMark src={league.logo} name={league.name} className="h-6 w-6" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white">
                        {league.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        Filtre ligue · {league.country ?? "Global"} · {league.season}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {mode === "team" && displayedCities.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Villes
                </p>
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {displayedCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => onCitySelect(city)}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-slate-200 hover:bg-white/[0.08]"
                    >
                      Filtrer: {city}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "team" && displayedOptions.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Equipes
                </p>
            {displayedOptions.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => onSelect(team)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.07]"
            >
                <TeamMark src={team.logo} name={team.name} />
                  <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-white">
                    {team.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {team.city ? `${team.city} · ` : ""}{team.country ?? "Global"}
                    {team.national ? " · National" : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-lime-300/15 px-2 py-1 text-[10px] font-black uppercase text-lime-100">
                  Choisir
                </span>
              </button>
            ))}
              </div>
            )}

            {!isLoading &&
              (query.trim().length >= 1 || mode === "country") &&
              displayedCountries.length === 0 &&
              displayedLeagues.length === 0 &&
              displayedCities.length === 0 &&
              displayedOptions.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400">
                  Aucun resultat. Essaie une autre lettre, un pays rapide ou un nom de ligue.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatSlotPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "Les donnees se chargent quand tu ouvres une section.",
  });
  const [dashboardRequested, setDashboardRequested] = useState(false);
  const [teamA, setTeamA] = useState("Morocco");
  const [teamB, setTeamB] = useState("France");
  const [teamAMode, setTeamAMode] = useState<PredictionTargetMode>("country");
  const [teamBMode, setTeamBMode] = useState<PredictionTargetMode>("country");
  const [selectedTeamA, setSelectedTeamA] = useState<TeamSearchOption | null>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<TeamSearchOption | null>(null);
  const [teamACountries, setTeamACountries] = useState<CountrySearchOption[]>([]);
  const [teamBCountries, setTeamBCountries] = useState<CountrySearchOption[]>([]);
  const [teamALeagues, setTeamALeagues] = useState<LeagueSearchOption[]>([]);
  const [teamBLeagues, setTeamBLeagues] = useState<LeagueSearchOption[]>([]);
  const [teamACities, setTeamACities] = useState<string[]>([]);
  const [teamBCities, setTeamBCities] = useState<string[]>([]);
  const [teamACountryFilter, setTeamACountryFilter] = useState<string | null>(null);
  const [teamBCountryFilter, setTeamBCountryFilter] = useState<string | null>(null);
  const [teamALeagueFilter, setTeamALeagueFilter] = useState<LeagueSearchOption | null>(null);
  const [teamBLeagueFilter, setTeamBLeagueFilter] = useState<LeagueSearchOption | null>(null);
  const [teamACityFilter, setTeamACityFilter] = useState<string | null>(null);
  const [teamBCityFilter, setTeamBCityFilter] = useState<string | null>(null);
  const [teamAOptions, setTeamAOptions] = useState<TeamSearchOption[]>([]);
  const [teamBOptions, setTeamBOptions] = useState<TeamSearchOption[]>([]);
  const [teamALoadedSearchKey, setTeamALoadedSearchKey] = useState<string | null>(null);
  const [teamBLoadedSearchKey, setTeamBLoadedSearchKey] = useState<string | null>(null);
  const [teamASearchLoading, setTeamASearchLoading] = useState(false);
  const [teamBSearchLoading, setTeamBSearchLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [statisticsReport, setStatisticsReport] =
    useState<TeamStatisticsComparisonData | null>(null);
  const [statisticsAiHtml, setStatisticsAiHtml] = useState("");
  const [statisticsAiRawResponse, setStatisticsAiRawResponse] = useState("");
  const [historyHtmlPreview, setHistoryHtmlPreview] = useState("");
  const [statisticsAiStatus, setStatisticsAiStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [predictionStatus, setPredictionStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [aiPrediction, setAiPrediction] = useState<PredictionData | null>(null);
  const [aiPredictionStatus, setAiPredictionStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [history, setHistory] = useState<UserActionHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("predictions");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPanelMode, setChatPanelMode] = useState<ChatPanelMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setIsThinking } = useMetaPronostic();
  const resolvedTeamA =
    selectedTeamA ??
    teamAOptions.find(
      (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamA)
    ) ??
    null;
  const resolvedTeamB =
    selectedTeamB ??
    teamBOptions.find(
      (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamB)
    ) ??
    null;
  const blockingLoadingMessage =
    predictionStatus.type === "loading"
      ? "Extraction des statistiques depuis API-FOOTBALL, lecture des donnees CRM, liaison avec le LLM et preparation de la prediction..."
      : statisticsAiStatus.type === "loading"
        ? "Effectuer les calcules pour les statistiques, connexion au LLM, lecture des statistiques et generation de la reponse finale..."
        : aiPredictionStatus.type === "loading"
          ? aiPredictionStatus.message
          : dashboardStatus.type === "loading"
            ? dashboardStatus.message
            : "";
  const isScreenBlocked = Boolean(blockingLoadingMessage);

  async function loadDashboard() {
    setDashboardRequested(true);
    setDashboardStatus({ type: "loading", message: "Chargement API-FOOTBALL..." });

    try {
      const response = await fetch("/api/football/dashboard");
      const result = (await response.json()) as
        | ({ ok: true } & DashboardData)
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error("error" in result && result.error ? result.error : "Erreur API-FOOTBALL");
      }

      setDashboardData(result);
      setDashboardStatus({
        type: "success",
        message: `Mis a jour: ${formatDate(result.generatedAt)}`,
      });
    } catch (error) {
      setDashboardStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  async function loadPredictionHistory() {
    try {
      const response = await fetch("/api/user-actions?limit=12");
      const result = (await response.json()) as
        | { ok: true; actions: UserActionHistoryItem[] }
        | { ok?: false; error?: string };

      if (response.ok && result.ok === true) {
        setHistory(result.actions);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoaded(true);
    }
  }

  async function reloadPredictionHistoryAfterSave() {
    await loadPredictionHistory();
    window.setTimeout(() => {
      void loadPredictionHistory();
    }, 900);
  }

  async function searchTeams({
    query,
    country,
    league,
    city,
    allCountries,
    setCountries,
    setLeagues,
    setCities,
    setOptions,
    setLoading,
  }: {
    query: string;
    country: string | null;
    league: LeagueSearchOption | null;
    city: string | null;
    allCountries?: boolean;
    setCountries: (countries: CountrySearchOption[]) => void;
    setLeagues: (leagues: LeagueSearchOption[]) => void;
    setCities: (cities: string[]) => void;
    setOptions: (teams: TeamSearchOption[]) => void;
    setLoading: (loading: boolean) => void;
  }) {
    if (query.trim().length < 1 && !country && !league && !city && !allCountries) {
      setCountries([]);
      setLeagues([]);
      setCities([]);
      setOptions([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (allCountries) params.set("countries", "all");
      if (query.trim()) params.set("q", query.trim());
      if (country) params.set("country", country);
      if (league) {
        params.set("league", String(league.id));
        params.set("season", String(league.season));
      }
      if (city) params.set("city", city);

      const response = await fetch(`/api/football/teams/search?${params}`);
      const result = (await response.json()) as
        | {
            ok: true;
            countries: CountrySearchOption[];
            leagues: LeagueSearchOption[];
            cities: string[];
            teams: TeamSearchOption[];
          }
        | { ok?: false; error?: string };

      if (response.ok && result.ok === true) {
        setCountries(result.countries);
        setLeagues(result.leagues);
        setCities(result.cities);
        setOptions(result.teams);
      } else {
        setCountries([]);
        setLeagues([]);
        setCities([]);
        setOptions([]);
      }
    } catch {
      setCountries([]);
      setLeagues([]);
      setCities([]);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }

  async function runPrediction(event: React.FormEvent) {
    event.preventDefault();
    const resolvedTeamA =
      selectedTeamA ??
      teamAOptions.find(
        (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamA)
      ) ??
      null;
    const resolvedTeamB =
      selectedTeamB ??
      teamBOptions.find(
        (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamB)
      ) ??
      null;

    if (resolvedTeamA && !selectedTeamA) {
      setSelectedTeamA(resolvedTeamA);
    }

    if (resolvedTeamB && !selectedTeamB) {
      setSelectedTeamB(resolvedTeamB);
    }

    if (!resolvedTeamA || !resolvedTeamB) {
      setPredictionStatus({
        type: "error",
        message:
          "Dans chaque champ, clique une ligne dans la section Equipes avec le badge Choisir avant de predire.",
      });
      return;
    }

    void requestPredictionNotificationPermission();
    setPredictionStatus({
      type: "loading",
      message: "Chargement statistiques globales, effectifs, blessures et matchs...",
    });
    setPrediction(null);
    setStatisticsReport(null);
    setStatisticsAiHtml("");
    setStatisticsAiRawResponse("");
    setStatisticsAiStatus({ type: "idle", message: "" });

    try {
      const params = new URLSearchParams({
        teamA: resolvedTeamA.name,
        teamB: resolvedTeamB.name,
      });
      if (resolvedTeamA.id) {
        params.set("teamAId", String(resolvedTeamA.id));
        if (resolvedTeamA.logo) params.set("teamALogo", resolvedTeamA.logo);
        if (resolvedTeamA.country) params.set("teamACountry", resolvedTeamA.country);
      }
      if (resolvedTeamB.id) {
        params.set("teamBId", String(resolvedTeamB.id));
        if (resolvedTeamB.logo) params.set("teamBLogo", resolvedTeamB.logo);
        if (resolvedTeamB.country) params.set("teamBCountry", resolvedTeamB.country);
      }
      if (teamALeagueFilter?.id && teamALeagueFilter.season) {
        params.set("teamALeagueId", String(teamALeagueFilter.id));
        params.set("teamASeason", String(teamALeagueFilter.season));
      }
      if (teamBLeagueFilter?.id && teamBLeagueFilter.season) {
        params.set("teamBLeagueId", String(teamBLeagueFilter.id));
        params.set("teamBSeason", String(teamBLeagueFilter.season));
      }
      const response = await fetch(`/api/football/team-statistics?${params}`);
      const result = (await response.json()) as
        | ({ ok: true } & TeamStatisticsComparisonData)
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Erreur statistiques"
        );
      }

      const { teamAJson, teamBJson } = extractTeamStatisticsJsons(
        result.teamAJson,
        result.teamBJson
      );
      setStatisticsReport(result);
      setPredictionStatus({
        type: "success",
        message: `Statistiques chargees pour ${result.teams.teamA.name} et ${result.teams.teamB.name}: ${teamAJson ? "JSON A OK" : "JSON A vide"}, ${teamBJson ? "JSON B OK" : "JSON B vide"}.`,
      });
      setHistoryLoaded(false);
      void loadPredictionHistory();
      await runStatisticsAiAnalysis(result);
      notifyPredictionFinished(
        `Voila, la prediction ${result.teams.teamA.name} vs ${result.teams.teamB.name} est terminee.`
      );
    } catch (error) {
      setPredictionStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  async function runStatisticsAiAnalysis(reportInput?: TeamStatisticsComparisonData) {
    const report = reportInput ?? statisticsReport;

    if (!report) {
      return;
    }

    setStatisticsAiStatus({
      type: "loading",
      message: "Generation HTML LLM...",
    });
    setStatisticsAiHtml("");
    setStatisticsAiRawResponse("");

    try {
      const response = await fetch("/api/football/analyze-statistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAJson: report.teamAJson,
          teamBJson: report.teamBJson,
        }),
      });
      const result = (await response.json()) as
        | TeamStatisticsAiAnalysisResponse
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Erreur analyse LLM"
        );
      }

      const renderedHtml =
        result.analysis.outputHtml ??
        normalizeAiHtmlResponse(result.analysis.outputText);
      setStatisticsAiRawResponse(result.analysis.outputText);
      setStatisticsAiHtml(renderedHtml);
      setStatisticsAiStatus({
        type: result.actionSaveError ? "error" : "success",
        message: result.actionSaveError
          ? `HTML LLM genere, mais non sauvegarde dans l'historique: ${result.actionSaveError}`
          : "HTML LLM genere et sauvegarde dans l'historique.",
      });
      setHistoryLoaded(false);
      await reloadPredictionHistoryAfterSave();
    } catch (error) {
      setStatisticsAiStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  async function runAiPrediction(event: React.FormEvent) {
    event.preventDefault();
    const resolvedTeamA =
      selectedTeamA ??
      teamAOptions.find(
        (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamA)
      ) ??
      null;
    const resolvedTeamB =
      selectedTeamB ??
      teamBOptions.find(
        (team) => normalizeTeamLookup(team.name) === normalizeTeamLookup(teamB)
      ) ??
      null;

    if (resolvedTeamA && !selectedTeamA) {
      setSelectedTeamA(resolvedTeamA);
    }

    if (resolvedTeamB && !selectedTeamB) {
      setSelectedTeamB(resolvedTeamB);
    }

    if (!resolvedTeamA || !resolvedTeamB) {
      setAiPredictionStatus({
        type: "error",
        message:
          "Choisis deux equipes API. Ici API-FOOTBALL sert seulement aux equipes et logos.",
      });
      return;
    }

    setAiPredictionStatus({
      type: "loading",
      message: "Le LLM cherche les resultats, blessures, joueurs et plan de jeu...",
    });
    setAiPrediction(null);

    try {
      const params = new URLSearchParams({
        teamA: resolvedTeamA.name,
        teamB: resolvedTeamB.name,
      });
      if (resolvedTeamA.id) {
        params.set("teamAId", String(resolvedTeamA.id));
        if (resolvedTeamA.logo) params.set("teamALogo", resolvedTeamA.logo);
        if (resolvedTeamA.country) params.set("teamACountry", resolvedTeamA.country);
      }
      if (resolvedTeamB.id) {
        params.set("teamBId", String(resolvedTeamB.id));
        if (resolvedTeamB.logo) params.set("teamBLogo", resolvedTeamB.logo);
        if (resolvedTeamB.country) params.set("teamBCountry", resolvedTeamB.country);
      }

      const response = await fetch(`/api/football/ai-predict?${params}`);
      const result = (await response.json()) as
        | ({ ok: true } & PredictionData)
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error(
          "error" in result && result.error ? result.error : "Erreur prediction LLM"
        );
      }

      setAiPrediction(result);
      setAiPredictionStatus({
        type: "success",
        message: `Prediction LLM prete pour ${result.teams.teamA.name} vs ${result.teams.teamB.name}.`,
      });
    } catch (error) {
      setAiPredictionStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  useEffect(() => {
    const needsMatchData = activeSection !== "predictions";

    if (
      needsMatchData &&
      !dashboardData &&
      !dashboardRequested &&
      dashboardStatus.type !== "loading"
    ) {
      loadDashboard();
    }

    if (activeSection === "predictions" && !historyLoaded) {
      loadPredictionHistory();
    }
  }, [
    activeSection,
    dashboardData,
    dashboardRequested,
    dashboardStatus.type,
    historyLoaded,
  ]);

  useEffect(() => {
    if (activeSection !== "predictions") {
      return;
    }

    if (resolvedTeamA) {
      return;
    }

    const trimmedQuery = teamA.trim();
    if (teamAMode === "team" && trimmedQuery.length < 1) {
      setTeamACountries([]);
      setTeamALeagues([]);
      setTeamACities([]);
      setTeamAOptions([]);
      setTeamALoadedSearchKey(null);
      return;
    }

    const searchSeed =
      teamAMode === "country" ? "" : normalizeTeamLookup(trimmedQuery).slice(0, 1);
    const searchKey =
      teamAMode === "country"
        ? "countries:all"
        : [
            "team",
            searchSeed,
            teamACountryFilter ?? "",
            teamALeagueFilter?.id ?? "",
            teamALeagueFilter?.season ?? "",
            teamACityFilter ?? "",
          ].join(":");

    if (teamALoadedSearchKey === searchKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTeamALoadedSearchKey(searchKey);
      searchTeams({
        query: searchSeed,
        country: teamAMode === "country" ? null : teamACountryFilter,
        league: teamAMode === "country" ? null : teamALeagueFilter,
        city: teamAMode === "country" ? null : teamACityFilter,
        allCountries: teamAMode === "country",
        setCountries: setTeamACountries,
        setLeagues: setTeamALeagues,
        setCities: setTeamACities,
        setOptions: setTeamAOptions,
        setLoading: setTeamASearchLoading,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeSection,
    resolvedTeamA,
    teamAMode,
    teamA,
    teamALoadedSearchKey,
    teamACountryFilter,
    teamALeagueFilter,
    teamACityFilter,
  ]);

  useEffect(() => {
    if (activeSection !== "predictions") {
      return;
    }

    if (resolvedTeamB) {
      return;
    }

    const trimmedQuery = teamB.trim();
    if (teamBMode === "team" && trimmedQuery.length < 1) {
      setTeamBCountries([]);
      setTeamBLeagues([]);
      setTeamBCities([]);
      setTeamBOptions([]);
      setTeamBLoadedSearchKey(null);
      return;
    }

    const searchSeed =
      teamBMode === "country" ? "" : normalizeTeamLookup(trimmedQuery).slice(0, 1);
    const searchKey =
      teamBMode === "country"
        ? "countries:all"
        : [
            "team",
            searchSeed,
            teamBCountryFilter ?? "",
            teamBLeagueFilter?.id ?? "",
            teamBLeagueFilter?.season ?? "",
            teamBCityFilter ?? "",
          ].join(":");

    if (teamBLoadedSearchKey === searchKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTeamBLoadedSearchKey(searchKey);
      searchTeams({
        query: searchSeed,
        country: teamBMode === "country" ? null : teamBCountryFilter,
        league: teamBMode === "country" ? null : teamBLeagueFilter,
        city: teamBMode === "country" ? null : teamBCityFilter,
        allCountries: teamBMode === "country",
        setCountries: setTeamBCountries,
        setLeagues: setTeamBLeagues,
        setCities: setTeamBCities,
        setOptions: setTeamBOptions,
        setLoading: setTeamBSearchLoading,
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeSection,
    resolvedTeamB,
    teamBMode,
    teamB,
    teamBLoadedSearchKey,
    teamBCountryFilter,
    teamBLeagueFilter,
    teamBCityFilter,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsThinking(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      let fullContent = "";
      const conversationHistory = [...messages, userMessage]
        .filter((msg) => msg.content.trim().length > 0)
        .slice(-10)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          namespace: "uploads",
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? response.statusText);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent, isStreaming: true }
              : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: error instanceof Error ? error.message : "Failed to get response",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="relative h-full overflow-y-auto px-3 py-4 sm:px-6 lg:px-8">
      {isScreenBlocked && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06101f]/85 px-4 text-white backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#10213d] p-5 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-lime-300/10 text-lime-200 ring-1 ring-lime-300/20">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h3 className="mt-4 text-lg font-black">Prediction en cours</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {blockingLoadingMessage}
            </p>
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">
              Extraction data · LLM · Generation
            </p>
          </div>
        </div>
      )}
      {historyHtmlPreview && (
        <div className="fixed inset-0 z-[110] bg-[#06101f]/90 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#10213d] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-black text-white">
                Historique
              </h3>
              <button
                type="button"
                onClick={() => setHistoryHtmlPreview("")}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-black text-white hover:bg-white/10"
              >
                Fermer
              </button>
            </div>
            <iframe
              title="Historique HTML"
              srcDoc={historyHtmlPreview}
              sandbox=""
              className="min-h-0 flex-1 border-0 bg-white"
            />
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#10213d] shadow-2xl shadow-black/20">
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/15">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-lime-300/20 bg-lime-300/10 px-2 py-1 text-xs font-black uppercase text-lime-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Match control center
                </div>
                <h2 className="text-xl font-black text-white sm:text-2xl">
                  Tableau live football
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                  Suis les matchs en cours, les rencontres terminees et les
                  prochains coups d&apos;envoi depuis API-FOOTBALL.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </button>
              {/* <button
                type="button"
                onClick={() => setChatOpen((current) => !current)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-400 px-3 text-sm font-black text-white transition hover:bg-lime-300"
              >
                <MessageCircle className="h-4 w-4" />
                Chat LLM
              </button> */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              {
                label: "Live",
                value: dashboardData?.summary.live ?? 0,
                color: "text-emerald-200",
                icon: Radio,
              },
              {
                label: "Finished",
                value: dashboardData?.summary.finishedToday ?? 0,
                color: "text-cyan-200",
                icon: CheckCircle2,
              },
              {
                label: "Upcoming",
                value: dashboardData?.summary.upcomingToday ?? 0,
                color: "text-amber-200",
                icon: CalendarDays,
              },
              {
                label: "Total today",
                value: dashboardData?.summary.today ?? 0,
                color: "text-lime-200",
                icon: TrendingUp,
              },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div key={stat.label} className="bg-[#0d1b33] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase text-slate-500">
                      {stat.label}
                    </p>
                    <StatIcon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className={`mt-2 text-2xl font-black ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {dashboardStatus.type !== "success" && dashboardStatus.type !== "idle" && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
              dashboardStatus.type === "error"
                ? "border-red-400/25 bg-red-400/10 text-red-200"
                : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
            }`}
          >
            {dashboardStatus.type === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {dashboardStatus.message}
          </div>
        )}

        <nav className="rounded-xl border border-white/10 bg-[#0d1b33] p-2 shadow-xl shadow-black/15">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {workspaceSections.map((section) => {
              const SectionIcon = section.icon;
              const isActive = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  className={`flex min-h-[76px] items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-lime-300/30 bg-lime-300/[0.12] text-white shadow-lg shadow-lime-950/20"
                      : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-lime-300/15 text-lime-100"
                        : "bg-black/20 text-slate-300"
                    }`}
                  >
                    <SectionIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {section.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {activeSection === "predictions" && (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#09182d] shadow-xl shadow-black/20">
          <div className="border-b border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200 ring-1 ring-lime-300/15">
                  <Swords className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-lime-100/80">
                    Data center
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Statistiques globales des equipes
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Filtre par pays, ville, ligue et equipe. Le resultat affiche deux JSON avec les donnees statistiques disponibles pour chaque equipe.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/15 p-2">
                {[
                  ["Equipe A", resolvedTeamA ? "OK" : "-"],
                  ["Equipe B", resolvedTeamB ? "OK" : "-"],
                  ["Source", statisticsReport ? "API-FOOTBALL" : "API"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-white/[0.04] px-3 py-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-xs font-black text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(340px,430px)_1fr]">
            <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-white">
                    Choix des equipes
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Selection obligatoire depuis les resultats API.
                  </p>
                </div>
                <Search className="h-5 w-5 text-cyan-200" />
              </div>

              <form onSubmit={runPrediction} className="grid gap-4">
                <TeamSearchSelect
                  label="Equipe A"
                  mode={teamAMode}
                  onModeChange={(mode) => {
                    setTeamAMode(mode);
                    setTeamA("");
                    setSelectedTeamA(null);
                    setTeamACountryFilter(null);
                    setTeamALeagueFilter(null);
                    setTeamACityFilter(null);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamACities([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  query={teamA}
                  onQueryChange={(value) => {
                    setTeamA(value);
                    setSelectedTeamA(null);
                    setTeamACountryFilter(null);
                    setTeamALeagueFilter(null);
                    setTeamACityFilter(null);
                  }}
                  selectedTeam={resolvedTeamA}
                  countries={teamACountries}
                  leagues={teamALeagues}
                  cities={teamACities}
                  onSelect={(team) => {
                    setSelectedTeamA(team);
                    setTeamA(team.name);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamACities([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  onCountrySelect={(country) => {
                    setTeamA(country.name);
                    setSelectedTeamA(null);
                    setTeamACountryFilter(country.name);
                    setTeamALeagueFilter(null);
                    setTeamACityFilter(null);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamACities([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  onNationalTeamSelect={(country) => {
                    const nationalTeam = createNationalTeamOption(country);
                    setSelectedTeamA(nationalTeam);
                    setTeamA(nationalTeam.name);
                    setTeamACountryFilter(country.name);
                    setTeamALeagueFilter(null);
                    setTeamACityFilter(null);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamACities([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  onLeagueSelect={(league) => {
                    setTeamA(league.name);
                    setSelectedTeamA(null);
                    setTeamALeagueFilter(league);
                    setTeamACountryFilter(league.country);
                    setTeamACityFilter(null);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamACities([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  onCitySelect={(city) => {
                    setTeamA(city);
                    setSelectedTeamA(null);
                    setTeamACityFilter(city);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamAOptions([]);
                    setTeamALoadedSearchKey(null);
                  }}
                  options={teamAOptions}
                  isLoading={teamASearchLoading}
                />
                <TeamSearchSelect
                  label="Equipe B"
                  mode={teamBMode}
                  onModeChange={(mode) => {
                    setTeamBMode(mode);
                    setTeamB("");
                    setSelectedTeamB(null);
                    setTeamBCountryFilter(null);
                    setTeamBLeagueFilter(null);
                    setTeamBCityFilter(null);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBCities([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  query={teamB}
                  onQueryChange={(value) => {
                    setTeamB(value);
                    setSelectedTeamB(null);
                    setTeamBCountryFilter(null);
                    setTeamBLeagueFilter(null);
                    setTeamBCityFilter(null);
                  }}
                  selectedTeam={resolvedTeamB}
                  countries={teamBCountries}
                  leagues={teamBLeagues}
                  cities={teamBCities}
                  onSelect={(team) => {
                    setSelectedTeamB(team);
                    setTeamB(team.name);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBCities([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  onCountrySelect={(country) => {
                    setTeamB(country.name);
                    setSelectedTeamB(null);
                    setTeamBCountryFilter(country.name);
                    setTeamBLeagueFilter(null);
                    setTeamBCityFilter(null);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBCities([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  onNationalTeamSelect={(country) => {
                    const nationalTeam = createNationalTeamOption(country);
                    setSelectedTeamB(nationalTeam);
                    setTeamB(nationalTeam.name);
                    setTeamBCountryFilter(country.name);
                    setTeamBLeagueFilter(null);
                    setTeamBCityFilter(null);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBCities([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  onLeagueSelect={(league) => {
                    setTeamB(league.name);
                    setSelectedTeamB(null);
                    setTeamBLeagueFilter(league);
                    setTeamBCountryFilter(league.country);
                    setTeamBCityFilter(null);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBCities([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  onCitySelect={(city) => {
                    setTeamB(city);
                    setSelectedTeamB(null);
                    setTeamBCityFilter(city);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBOptions([]);
                    setTeamBLoadedSearchKey(null);
                  }}
                  options={teamBOptions}
                  isLoading={teamBSearchLoading}
                />

                <div className="grid gap-3">
                  <SelectedTeamPanel
                    label="Selection A"
                    team={resolvedTeamA}
                    country={teamACountryFilter}
                    league={teamALeagueFilter}
                    city={teamACityFilter}
                  />
                  <div className="flex items-center justify-center">
                    <span className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase text-slate-400">
                      contre
                    </span>
                  </div>
                  <SelectedTeamPanel
                    label="Selection B"
                    team={resolvedTeamB}
                    country={teamBCountryFilter}
                    league={teamBLeagueFilter}
                    city={teamBCityFilter}
                  />
                </div>

                <div
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                    resolvedTeamA && resolvedTeamB
                      ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                      : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                  }`}
                >
                  {resolvedTeamA && resolvedTeamB
                    ? "Deux equipes API sont selectionnees. Tu peux charger leurs statistiques."
                    : "Pour valider, clique une ligne dans la section Equipes avec le badge Choisir. Les pays, ligues et villes sont seulement des filtres."}
                </div>
                <button
                  type="submit"
                  disabled={
                    predictionStatus.type === "loading" ||
                    !resolvedTeamA ||
                    !resolvedTeamB
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {predictionStatus.type === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Lancer la prediction
                </button>
              </form>

              {predictionStatus.type !== "idle" && (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm font-bold ${
                    predictionStatus.type === "error"
                      ? "border-red-400/25 bg-red-400/10 text-red-200"
                      : "border-lime-300/25 bg-lime-300/10 text-lime-100"
                  }`}
                >
                  {predictionStatus.message}
                </div>
              )}
            </div>

              <div className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15">
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-300" />
                  <h4 className="text-sm font-black text-white">
                    Historique activite
                  </h4>
                </div>
                <div className="grid gap-2">
                  {history.length === 0 && (
                    <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400">
                      Aucune activite enregistree pour cet utilisateur.
                    </p>
                  )}
                  {history.map((item) => {
                    const percentages = item.payload?.result?.percentages;
                    const resultTeams =
                      item.payload?.result?.teams ?? item.payload?.teams;
                    const actionLabel = getHistoryActionLabel(item.actionType);
                    const savedHistoryHtml = getSavedHistoryHtml(item);

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-black/15 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            {resultTeams?.teamA ? (
                              <TeamMark
                                src={resultTeams.teamA.logo}
                                name={resultTeams.teamA.name}
                                className="h-5 w-5"
                              />
                            ) : (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                                <Bot className="h-3 w-3" />
                              </span>
                            )}
                            <p className="min-w-0 truncate text-sm font-black text-white">
                              {item.label}
                            </p>
                            {resultTeams?.teamB && (
                              <TeamMark
                                src={resultTeams.teamB.logo}
                                name={resultTeams.teamB.name}
                                className="h-5 w-5"
                              />
                            )}
                          </div>
                          <span className="whitespace-nowrap text-xs text-slate-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-amber-300/15 bg-amber-300/10 px-2 py-1 text-[11px] font-black uppercase text-amber-100">
                            {actionLabel}
                          </span>
                        </div>
                        {percentages && (
                          <p className="mt-2 text-xs font-bold text-slate-300">
                            {percentages.teamAWin}% · {percentages.draw}% ·{" "}
                            {percentages.teamBWin}%
                          </p>
                        )}
                        {item.actionType === "team_statistics_ai_analysis" && (
                          savedHistoryHtml ? (
                            <button
                              type="button"
                              onClick={() => setHistoryHtmlPreview(savedHistoryHtml)}
                              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/20"
                            >
                              Cliquer ici pour voir l&apos;historique
                            </button>
                          ) : (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Historique HTML indisponible pour cette ancienne entree.
                            </p>
                          )
                        )}
                        {item.actionType === "team_statistics" && (
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            Deux JSON statistiques generes et envoyes au flux LLM.
                          </p>
                        )}
                        {item.actionType === "football_prediction" &&
                          item.payload?.outputPreview && (
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                              {item.payload.outputPreview}
                            </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              {!statisticsReport && (resolvedTeamA || resolvedTeamB) && (
                <SelectedTeamsInsight
                  selectedTeamA={resolvedTeamA}
                  selectedTeamB={resolvedTeamB}
                  teamACountryFilter={teamACountryFilter}
                  teamBCountryFilter={teamBCountryFilter}
                  teamALeagueFilter={teamALeagueFilter}
                  teamBLeagueFilter={teamBLeagueFilter}
                  teamACityFilter={teamACityFilter}
                  teamBCityFilter={teamBCityFilter}
                />
              )}

              {!statisticsReport && (
                <div className="min-h-[520px] rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15 sm:p-6">
                  <div className="grid h-full gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
                    <div>
                      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/15">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h3 className="max-w-2xl text-2xl font-black text-white">
                        Choisis deux equipes pour charger leurs donnees
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Le resultat affichera deux JSON separes avec les matchs recents et a venir, statistiques par competition, classement, effectif, blessures et evenements recents.
                      </p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {[
                          ["1", "Filtrer", "Pays, ville, ligue ou nom d'equipe"],
                          ["2", "Selectionner", "Choisir uniquement une equipe API"],
                          ["3", "Charger", "Appeler les APIs de statistiques"],
                          ["4", "Analyser", "Lire les deux JSON equipes"],
                        ].map(([step, title, text]) => (
                          <div
                            key={step}
                            className="rounded-lg border border-white/10 bg-black/15 p-3"
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-300/10 text-xs font-black text-lime-100">
                                {step}
                              </span>
                              <p className="text-sm font-black text-white">{title}</p>
                            </div>
                            <p className="text-xs leading-5 text-slate-500">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                      <p className="text-xs font-black uppercase text-slate-500">
                        Match preview
                      </p>
                      <div className="mt-4 grid gap-3">
                        <SelectedTeamPanel
                          label="Equipe A"
                          team={resolvedTeamA}
                          country={teamACountryFilter}
                          league={teamALeagueFilter}
                          city={teamACityFilter}
                        />
                        <div className="flex justify-center text-xs font-black uppercase text-slate-500">
                          vs
                        </div>
                        <SelectedTeamPanel
                          label="Equipe B"
                          team={resolvedTeamB}
                          country={teamBCountryFilter}
                          league={teamBLeagueFilter}
                          city={teamBCityFilter}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {statisticsReport && (
                <div className="grid gap-5">
                  <div className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15 sm:p-5">
                    <p className="text-xs font-black uppercase text-lime-100/80">
                      Donnees statistiques
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-black/15 p-3">
                        <TeamMark
                          src={statisticsReport.teams.teamA.logo}
                          name={statisticsReport.teams.teamA.name}
                          className="h-12 w-12 rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">
                            {statisticsReport.teams.teamA.name}
                          </p>
                          <p className="text-xs text-slate-500">JSON equipe A</p>
                        </div>
                      </div>
                      <span className="self-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase text-slate-400">
                        vs
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-black/15 p-3">
                        <TeamMark
                          src={statisticsReport.teams.teamB.logo}
                          name={statisticsReport.teams.teamB.name}
                          className="h-12 w-12 rounded-lg"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-base font-black text-white">
                            {statisticsReport.teams.teamB.name}
                          </p>
                          <p className="text-xs text-slate-500">JSON equipe B</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Source: API-FOOTBALL · Genere:{" "}
                      {formatDate(statisticsReport.generatedAt)} · H2H:{" "}
                      {statisticsReport.shared?.headToHead?.length ?? 0} match(s)
                    </p>
                  </div>

                  <section className="overflow-hidden rounded-xl border border-white/10 bg-[#10213d] shadow-lg shadow-black/15">
                    <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">
                            Analyse  HTML
                          </h4>
                          <p className="text-xs text-slate-500">
                            {statisticsAiStatus.message ||
                              "Demarre automatiquement apres les statistiques"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => runStatisticsAiAnalysis()}
                        disabled={statisticsAiStatus.type === "loading"}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-black text-white transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {statisticsAiStatus.type === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Relancer la prediction
                      </button>
                    </div>

                    {statisticsAiStatus.type === "error" && (
                      <p className="m-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm font-bold text-red-200">
                        {statisticsAiStatus.message}
                      </p>
                    )}

                    {statisticsAiHtml ? (
                      <iframe
                        title="Analyse HTML"
                        srcDoc={statisticsAiHtml}
                        sandbox=""
                        className="h-[720px] w-full border-0 bg-white"
                      />
                    ) : (
                      <div className="min-h-[220px] p-4">
                        <div className="flex min-h-[188px] items-center justify-center rounded-lg border border-white/10 bg-black/15 text-sm font-bold text-slate-400">
                          HTML LLM non genere
                        </div>
                      </div>
                    )}
                  </section>

                  {statisticsAiRawResponse && (
                    <section className="min-w-0 rounded-xl border border-white/10 bg-[#10213d] shadow-lg shadow-black/15">
                      <div className="border-b border-white/10 px-4 py-3">
                        <h4 className="text-sm font-black text-white">
                          Reponse LLM
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Contenu retourne avant affichage HTML.
                        </p>
                      </div>
                      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-5 text-slate-200">
                        {statisticsAiRawResponse}
                      </pre>
                    </section>
                  )}

                  <div className="grid gap-5 2xl:grid-cols-2">
                    <section className="min-w-0 rounded-xl border border-white/10 bg-[#10213d] shadow-lg shadow-black/15">
                      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                        <TeamMark
                          src={statisticsReport.teams.teamA.logo}
                          name={statisticsReport.teams.teamA.name}
                          className="h-8 w-8 rounded-lg"
                        />
                        <h4 className="min-w-0 truncate text-sm font-black text-white">
                          JSON {statisticsReport.teams.teamA.name}
                        </h4>
                      </div>
                      <pre className="max-h-[720px] overflow-auto p-4 text-xs leading-5 text-slate-200">
                        {JSON.stringify(statisticsReport.teamAJson, null, 2)}
                      </pre>
                    </section>

                    <section className="min-w-0 rounded-xl border border-white/10 bg-[#10213d] shadow-lg shadow-black/15">
                      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                        <TeamMark
                          src={statisticsReport.teams.teamB.logo}
                          name={statisticsReport.teams.teamB.name}
                          className="h-8 w-8 rounded-lg"
                        />
                        <h4 className="min-w-0 truncate text-sm font-black text-white">
                          JSON {statisticsReport.teams.teamB.name}
                        </h4>
                      </div>
                      <pre className="max-h-[720px] overflow-auto p-4 text-xs leading-5 text-slate-200">
                        {JSON.stringify(statisticsReport.teamBJson, null, 2)}
                      </pre>
                    </section>
                  </div>

                  <div className="grid gap-5 2xl:grid-cols-2">
                    <JsonDataTable
                      title={`Table ${statisticsReport.teams.teamA.name}`}
                      data={statisticsReport.teamAJson}
                    />
                    <JsonDataTable
                      title={`Table ${statisticsReport.teams.teamB.name}`}
                      data={statisticsReport.teamBJson}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {activeSection !== "predictions" && (
        <section className="grid gap-5">
          <div className="space-y-5">
            {activeSection === "live" && (
              <MatchZone
                title="Matchs live"
                description="Scores et temps de jeu en cours"
                matches={dashboardData?.live ?? []}
                tone="live"
                icon={Radio}
              />
            )}

            {activeSection === "finished" && (
              <MatchZone
                title="Matchs finished"
                description="Matchs termines aujourd'hui"
                matches={dashboardData?.finishedToday ?? []}
                tone="finished"
                icon={CheckCircle2}
              />
            )}

            {activeSection === "upcoming" && (
              <MatchZone
                title="Matchs upcoming"
                description="Prochains matchs programmes aujourd'hui"
                matches={dashboardData?.upcomingToday ?? []}
                tone="upcoming"
                icon={CalendarDays}
              />
            )}

            {activeSection === "statistics" && prediction && (
              <TeamAnalyticsSection prediction={prediction} />
            )}

            {activeSection === "statistics" && !prediction && (
              <div className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-white">Statistiques equipes</h3>
                    <p className="text-sm text-slate-400">
                      Lance une prediction pour afficher les statistiques detaillees des deux equipes selectionnees.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "statistics" && (
            <div className="grid gap-3">
              {(dashboardData?.competitions ?? []).map((competition) => (
                <article key={`${competition.id}-${competition.name}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-white">{competition.name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                        {competition.country ?? "International"} · {competition.todayCount} match(s) aujourd&apos;hui · {competition.liveCount} live
                      </p>
                    </div>
                    <Clock3 className="h-5 w-5 text-amber-300" />
                  </div>
                  <div className="mt-4 grid gap-2 lg:grid-cols-3">
                    {competition.nextMatches.length === 0 && (
                      <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-3 text-sm text-slate-400 lg:col-span-3">
                        Aucun prochain match aujourd&apos;hui pour cette competition.
                      </div>
                    )}
                    {competition.nextMatches.map((match) => (
                      <div key={match.fixtureId} className="rounded-lg border border-white/10 bg-black/15 p-3">
                        <p className="text-xs font-black uppercase text-amber-200">
                          {formatDate(match.date)}
                        </p>
                        <p className="mt-2 text-sm font-black text-white">
                          {match.home.name ?? "-"} vs {match.away.name ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {match.competition.round ?? match.status?.long ?? ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            )}
          </div>

        </section>
        )}
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className={`fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33] shadow-2xl shadow-black/50 sm:inset-x-auto sm:bottom-5 sm:right-5 ${
              chatPanelMode === "prediction"
                ? "sm:h-[680px] sm:w-[min(760px,calc(100vw-2.5rem))]"
                : "sm:h-[560px] sm:w-[min(420px,calc(100vw-2.5rem))]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-lime-300" />
                <h3 className="font-black text-white">
                  {chatPanelMode === "prediction" ? "Prediction LLM" : "Chat LLM"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                aria-label="Masquer le chat"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
              {[
                ["chat", "Chat"],
                ["prediction", "Prediction LLM"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChatPanelMode(mode as ChatPanelMode)}
                  className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                    chatPanelMode === mode
                      ? "bg-lime-300/15 text-lime-100"
                      : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {chatPanelMode === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {messages.length === 0 && (
                    <div className="grid gap-2">
                      {promptSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setInput(suggestion)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-white/10"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 ${
                            message.role === "user"
                              ? "bg-lime-400 text-white"
                              : "border border-white/10 bg-white/[0.05] text-slate-100"
                          }`}
                        >
                          {message.content}
                          {message.isStreaming && <span className="ml-1 inline-block h-3 w-1 bg-current" />}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      disabled={isLoading}
                      placeholder="Question football..."
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-300/50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-white hover:bg-lime-300 disabled:opacity-50"
                      aria-label="Envoyer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            )}

            {chatPanelMode === "prediction" && (
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={runAiPrediction} className="grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TeamSearchSelect
                      label="Equipe ou pays A"
                      mode={teamAMode}
                      onModeChange={(mode) => {
                        setTeamAMode(mode);
                        setTeamA("");
                        setSelectedTeamA(null);
                        setTeamACountryFilter(null);
                        setTeamALeagueFilter(null);
                        setTeamACityFilter(null);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamACities([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      query={teamA}
                      onQueryChange={(value) => {
                        setTeamA(value);
                        setSelectedTeamA(null);
                        setTeamACountryFilter(null);
                        setTeamALeagueFilter(null);
                        setTeamACityFilter(null);
                      }}
                      selectedTeam={resolvedTeamA}
                      countries={teamACountries}
                      leagues={teamALeagues}
                      cities={teamACities}
                      onSelect={(team) => {
                        setSelectedTeamA(team);
                        setTeamA(team.name);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamACities([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      onCountrySelect={(country) => {
                        setTeamA(country.name);
                        setSelectedTeamA(null);
                        setTeamACountryFilter(country.name);
                        setTeamALeagueFilter(null);
                        setTeamACityFilter(null);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamACities([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      onNationalTeamSelect={(country) => {
                        const nationalTeam = createNationalTeamOption(country);
                        setSelectedTeamA(nationalTeam);
                        setTeamA(nationalTeam.name);
                        setTeamACountryFilter(country.name);
                        setTeamALeagueFilter(null);
                        setTeamACityFilter(null);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamACities([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      onLeagueSelect={(league) => {
                        setTeamA(league.name);
                        setSelectedTeamA(null);
                        setTeamALeagueFilter(league);
                        setTeamACountryFilter(league.country);
                        setTeamACityFilter(null);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamACities([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      onCitySelect={(city) => {
                        setTeamA(city);
                        setSelectedTeamA(null);
                        setTeamACityFilter(city);
                        setTeamACountries([]);
                        setTeamALeagues([]);
                        setTeamAOptions([]);
                        setTeamALoadedSearchKey(null);
                      }}
                      options={teamAOptions}
                      isLoading={teamASearchLoading}
                    />
                    <TeamSearchSelect
                      label="Equipe ou pays B"
                      mode={teamBMode}
                      onModeChange={(mode) => {
                        setTeamBMode(mode);
                        setTeamB("");
                        setSelectedTeamB(null);
                        setTeamBCountryFilter(null);
                        setTeamBLeagueFilter(null);
                        setTeamBCityFilter(null);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBCities([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      query={teamB}
                      onQueryChange={(value) => {
                        setTeamB(value);
                        setSelectedTeamB(null);
                        setTeamBCountryFilter(null);
                        setTeamBLeagueFilter(null);
                        setTeamBCityFilter(null);
                      }}
                      selectedTeam={resolvedTeamB}
                      countries={teamBCountries}
                      leagues={teamBLeagues}
                      cities={teamBCities}
                      onSelect={(team) => {
                        setSelectedTeamB(team);
                        setTeamB(team.name);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBCities([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      onCountrySelect={(country) => {
                        setTeamB(country.name);
                        setSelectedTeamB(null);
                        setTeamBCountryFilter(country.name);
                        setTeamBLeagueFilter(null);
                        setTeamBCityFilter(null);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBCities([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      onNationalTeamSelect={(country) => {
                        const nationalTeam = createNationalTeamOption(country);
                        setSelectedTeamB(nationalTeam);
                        setTeamB(nationalTeam.name);
                        setTeamBCountryFilter(country.name);
                        setTeamBLeagueFilter(null);
                        setTeamBCityFilter(null);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBCities([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      onLeagueSelect={(league) => {
                        setTeamB(league.name);
                        setSelectedTeamB(null);
                        setTeamBLeagueFilter(league);
                        setTeamBCountryFilter(league.country);
                        setTeamBCityFilter(null);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBCities([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      onCitySelect={(city) => {
                        setTeamB(city);
                        setSelectedTeamB(null);
                        setTeamBCityFilter(city);
                        setTeamBCountries([]);
                        setTeamBLeagues([]);
                        setTeamBOptions([]);
                        setTeamBLoadedSearchKey(null);
                      }}
                      options={teamBOptions}
                      isLoading={teamBSearchLoading}
                    />
                  </div>

                  {aiPredictionStatus.message && (
                    <p
                      className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                        aiPredictionStatus.type === "error"
                          ? "border-red-300/20 bg-red-400/10 text-red-100"
                          : aiPredictionStatus.type === "success"
                            ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                            : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                      }`}
                    >
                      {aiPredictionStatus.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      aiPredictionStatus.type === "loading" ||
                      !resolvedTeamA ||
                      !resolvedTeamB
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {aiPredictionStatus.type === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generer prediction LLM complete
                  </button>
                </form>

                {aiPrediction && (
                  <div className="mt-4 grid gap-4">
                    <AiAnalysisSection prediction={aiPrediction} />
                  </div>
                )}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
