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
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  Radio,
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
  squad: {
    count: number;
    players: Array<{
      id?: number;
      name?: string;
      age?: number;
      number?: number | null;
      position?: string;
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
  actionType: "football_prediction";
  createdAt: string;
  payload?: {
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
  };
};

type MatchBoardView = "all" | "live" | "finished" | "upcoming";

const promptSuggestions = [
  "Analyse les matchs live importants",
  "Quels signaux pour Maroc vs France ?",
  "Explique les blessures du prochain match",
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
        <StatTile label="Clean sheets" value={stats?.clean_sheet?.total} />
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
      </div>
    </article>
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

export default function ChatSlotPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<{
    type: "loading" | "success" | "error";
    message: string;
  }>({ type: "loading", message: "Chargement API-FOOTBALL..." });
  const [teamA, setTeamA] = useState("Morocco");
  const [teamB, setTeamB] = useState("France");
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionStatus, setPredictionStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [history, setHistory] = useState<UserActionHistoryItem[]>([]);
  const [matchBoardView, setMatchBoardView] = useState<MatchBoardView>("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setIsThinking } = useMetaPronostic();

  async function loadDashboard() {
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
      const response = await fetch(
        "/api/user-actions?actionType=football_prediction&limit=8"
      );
      const result = (await response.json()) as
        | { ok: true; actions: UserActionHistoryItem[] }
        | { ok?: false; error?: string };

      if (response.ok && result.ok === true) {
        setHistory(result.actions);
      }
    } catch {
      setHistory([]);
    }
  }

  async function runPrediction(event: React.FormEvent) {
    event.preventDefault();
    if (!teamA.trim() || !teamB.trim()) return;

    setPredictionStatus({
      type: "loading",
      message: "Recherche equipes, prediction, compositions et blessures...",
    });
    setPrediction(null);

    try {
      const params = new URLSearchParams({ teamA, teamB });
      const response = await fetch(`/api/football/predict?${params}`);
      const result = (await response.json()) as
        | ({ ok: true } & PredictionData)
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error("error" in result && result.error ? result.error : "Erreur prediction");
      }

      setPrediction(result);
      setPredictionStatus({
        type: "success",
        message: `Prediction prete pour ${result.teams.teamA.name} vs ${result.teams.teamB.name}.`,
      });
      await loadPredictionHistory();
    } catch (error) {
      setPredictionStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  useEffect(() => {
    loadDashboard();
    loadPredictionHistory();
  }, []);

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
                  prochains coups d'envoi depuis API-FOOTBALL.
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
              <button
                type="button"
                onClick={() => setChatOpen((current) => !current)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-400 px-3 text-sm font-black text-white transition hover:bg-lime-300"
              >
                <MessageCircle className="h-4 w-4" />
                Chat IA
              </button>
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

        {dashboardStatus.type !== "success" && (
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

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-[#0d1b33] p-3 shadow-xl shadow-black/15">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["all", "Tout"],
                  ["live", "Live"],
                  ["finished", "Finished"],
                  ["upcoming", "Upcoming"],
                ].map(([value, label]) => {
                  const isActive = matchBoardView === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMatchBoardView(value as MatchBoardView)}
                      className={`h-10 rounded-lg text-sm font-black transition ${
                        isActive
                          ? "bg-lime-400 text-white shadow-lg shadow-lime-950/30"
                          : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(matchBoardView === "all" || matchBoardView === "live") && (
              <MatchZone
                title="Matchs live"
                description="Scores et temps de jeu en cours"
                matches={dashboardData?.live ?? []}
                tone="live"
                icon={Radio}
              />
            )}

            {(matchBoardView === "all" || matchBoardView === "finished") && (
              <MatchZone
                title="Matchs finished"
                description="Matchs termines aujourd'hui"
                matches={dashboardData?.finishedToday ?? []}
                tone="finished"
                icon={CheckCircle2}
              />
            )}

            {(matchBoardView === "all" || matchBoardView === "upcoming") && (
              <MatchZone
                title="Matchs upcoming"
                description="Prochains matchs programmes aujourd'hui"
                matches={dashboardData?.upcomingToday ?? []}
                tone="upcoming"
                icon={CalendarDays}
              />
            )}

            <div className="grid gap-3">
              {(dashboardData?.competitions ?? []).map((competition) => (
                <article key={`${competition.id}-${competition.name}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-white">{competition.name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                        {competition.country ?? "International"} · {competition.todayCount} match(s) aujourd'hui · {competition.liveCount} live
                      </p>
                    </div>
                    <Clock3 className="h-5 w-5 text-amber-300" />
                  </div>
                  <div className="mt-4 grid gap-2 lg:grid-cols-3">
                    {competition.nextMatches.length === 0 && (
                      <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-3 text-sm text-slate-400 lg:col-span-3">
                        Aucun prochain match aujourd'hui pour cette competition.
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
          </div>

          <aside className="h-max overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33] shadow-xl shadow-black/20">
            <div className="border-b border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-white">Prediction match</h3>
                  <p className="text-xs text-slate-400">
                    Probabilites, compositions et blesses.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <form onSubmit={runPrediction} className="grid gap-3">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-slate-500">
                    Equipe A
                  </label>
                  <input
                    value={teamA}
                    onChange={(event) => setTeamA(event.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                    placeholder="Equipe A"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-slate-500">
                    Equipe B
                  </label>
                  <input
                    value={teamB}
                    onChange={(event) => setTeamB(event.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                    placeholder="Equipe B"
                  />
                </div>
                <button
                  type="submit"
                  disabled={predictionStatus.type === "loading"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-white transition hover:bg-lime-300 disabled:opacity-60"
                >
                  {predictionStatus.type === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Predire
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

              {prediction && (
                <div className="mt-5 space-y-5">
                <div className="rounded-lg border border-white/10 bg-black/15 p-4">
                  <p className="text-sm font-black text-white">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <TeamMark
                        src={prediction.teams.teamA.logo}
                        name={prediction.teams.teamA.name}
                      />
                      <span>{prediction.teams.teamA.name}</span>
                      <span className="text-slate-500">vs</span>
                      <TeamMark
                        src={prediction.teams.teamB.logo}
                        name={prediction.teams.teamB.name}
                      />
                      <span>{prediction.teams.teamB.name}</span>
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Source: {prediction.percentages.source}
                  </p>
                  <div className="mt-4 space-y-4">
                    <PercentBar label={`${prediction.teams.teamA.name} gagne`} value={prediction.percentages.teamAWin} tone="bg-emerald-300" />
                    <PercentBar label="Egalite" value={prediction.percentages.draw} tone="bg-amber-300" />
                    <PercentBar label={`${prediction.teams.teamB.name} gagne`} value={prediction.percentages.teamBWin} tone="bg-cyan-300" />
                  </div>
                  {prediction.advice && (
                    <p className="mt-4 rounded-lg bg-cyan-300/10 p-3 text-sm text-cyan-100">
                      {prediction.advice}
                    </p>
                  )}
                </div>

                <TeamAnalyticsSection prediction={prediction} />

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                    <Users className="h-4 w-4 text-cyan-300" />
                    Joueurs prevus
                  </div>
                  <div className="grid gap-2">
                    {prediction.lineups.length === 0 && (
                      <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400">
                        Compositions non disponibles pour ce match.
                      </p>
                    )}
                    {prediction.lineups.map((lineup) => (
                      <div key={lineup.team?.id ?? lineup.team?.name} className="rounded-lg border border-white/10 bg-black/15 p-3">
                        <div className="flex items-center gap-2">
                          <TeamMark
                            src={lineup.team?.logo}
                            name={lineup.team?.name}
                          />
                          <p className="min-w-0 truncate text-sm font-black text-white">
                            {lineup.team?.name ?? "Equipe"}{" "}
                            {lineup.formation ? `· ${lineup.formation}` : ""}
                          </p>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-300">
                          {(lineup.startXI ?? [])
                            .slice(0, 11)
                            .map((item) => item.player?.name)
                            .filter(Boolean)
                            .join(", ") || "XI non publie"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                    <ShieldAlert className="h-4 w-4 text-red-300" />
                    Joueurs blesses
                  </div>
                  <div className="grid gap-2">
                    {prediction.injuries.length === 0 && (
                      <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400">
                        Aucun blesse retourne par API-FOOTBALL pour ce match.
                      </p>
                    )}
                    {prediction.injuries.slice(0, 8).map((injury) => (
                      <div key={`${injury.team?.id}-${injury.player?.id}-${injury.player?.name}`} className="rounded-lg border border-red-300/15 bg-red-400/10 p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <TeamMark
                            src={injury.team?.logo}
                            name={injury.team?.name}
                          />
                          <p className="min-w-0 truncate font-black text-red-100">
                            {injury.player?.name ?? "Joueur"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-red-100/80">
                          {injury.team?.name ?? "Equipe"} · {injury.player?.type ?? "Absence"} · {injury.player?.reason ?? "Raison non precisee"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-amber-300" />
                <h4 className="text-sm font-black text-white">
                  Historique predictions
                </h4>
              </div>
              <div className="grid gap-2">
                {history.length === 0 && (
                  <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400">
                    Aucune prediction enregistree pour cet utilisateur.
                  </p>
                )}
                {history.map((item) => {
                  const percentages = item.payload?.result?.percentages;
                  const resultTeams = item.payload?.result?.teams;

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-black/15 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <TeamMark
                            src={resultTeams?.teamA?.logo}
                            name={resultTeams?.teamA?.name}
                            className="h-5 w-5"
                          />
                          <p className="min-w-0 truncate text-sm font-black text-white">
                            {item.label}
                          </p>
                          <TeamMark
                            src={resultTeams?.teamB?.logo}
                            name={resultTeams?.teamB?.name}
                            className="h-5 w-5"
                          />
                        </div>
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      {percentages && (
                        <p className="mt-2 text-xs font-bold text-slate-300">
                          {percentages.teamAWin}% · {percentages.draw}% ·{" "}
                          {percentages.teamBWin}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            className="fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33] shadow-2xl shadow-black/50 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[min(420px,calc(100vw-2.5rem))]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-lime-300" />
                <h3 className="font-black text-white">Chat IA</h3>
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
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
