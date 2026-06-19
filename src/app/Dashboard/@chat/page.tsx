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

type WorkspaceSection = "predictions" | "live" | "finished" | "upcoming" | "statistics";
type PredictionTargetMode = "country" | "team";

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
            Les donnees completes arrivent apres l'appel prediction.
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

function PredictionEvidenceSection({ prediction }: { prediction: PredictionData }) {
  const teamA = prediction.teamAnalytics?.teamA;
  const teamB = prediction.teamAnalytics?.teamB;

  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1b33] p-4 shadow-lg shadow-black/15">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-white">Contexte et preuves</h3>
          <p className="text-xs text-slate-400">
            Fixture trouve, confrontations directes et derniers matchs disponibles.
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <StatTile
          label="Match cible"
          value={
            prediction.fixture
              ? `${prediction.fixture.home.name ?? "-"} vs ${
                  prediction.fixture.away.name ?? "-"
                }`
              : "Non trouve"
          }
        />
        <StatTile
          label="Competition"
          value={prediction.fixture?.competition.name ?? "-"}
        />
        <StatTile
          label="Confrontations"
          value={prediction.headToHead.count}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-black/15 p-3 xl:col-span-1">
          <p className="text-xs font-black uppercase text-slate-500">
            Head-to-head
          </p>
          <div className="mt-3 grid gap-2">
            {prediction.headToHead.matches.length === 0 && (
              <p className="text-sm text-slate-400">
                Aucune confrontation directe terminee disponible.
              </p>
            )}
            {prediction.headToHead.matches.slice(0, 5).map((match) => (
              <div
                key={match.fixtureId ?? `${match.date}-${match.home.id}-${match.away.id}`}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs font-black text-white">
                    {match.home.name ?? "-"} vs {match.away.name ?? "-"}
                  </p>
                  <span className="shrink-0 rounded-md bg-white/[0.07] px-2 py-1 text-xs font-black text-cyan-100">
                    {match.goals.home ?? "-"}-{match.goals.away ?? "-"}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {match.competition.name ?? "-"} · {formatDate(match.date)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {[teamA, teamB].map((analytics, index) => (
          <div
            key={analytics?.team.id ?? `analytics-placeholder-${index}`}
            className="rounded-lg border border-white/10 bg-black/15 p-3"
          >
            <p className="text-xs font-black uppercase text-slate-500">
              {analytics?.team.name ?? "Equipe"}: forme recente
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile label="Joues" value={analytics?.recent.summary.played} />
              <StatTile label="Victoires" value={analytics?.recent.summary.wins} />
              <StatTile label="Nuls" value={analytics?.recent.summary.draws} />
              <StatTile label="Defaites" value={analytics?.recent.summary.losses} />
              <StatTile label="Buts pour" value={analytics?.recent.summary.goalsFor} />
              <StatTile label="Buts contre" value={analytics?.recent.summary.goalsAgainst} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExpectedLineupsSection({ prediction }: { prediction: PredictionData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lime-300/10 text-lime-200">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-black text-white">Joueurs qui vont jouer</h3>
          <p className="text-xs text-slate-400">
            Compositions API-FOOTBALL si elles sont publiees pour le fixture.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {prediction.lineups.length === 0 && (
          <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-slate-400 lg:col-span-2">
            Compositions non disponibles pour ce match.
          </p>
        )}
        {prediction.lineups.map((lineup) => (
          <article
            key={lineup.team?.id ?? lineup.team?.name}
            className="rounded-xl border border-white/10 bg-[#10213d] p-4"
          >
            <div className="mb-4 flex items-center gap-3">
              <TeamMark src={lineup.team?.logo} name={lineup.team?.name} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="truncate font-black text-white">
                  {lineup.team?.name ?? "Equipe"}
                </p>
                <p className="text-xs text-slate-400">
                  Formation {lineup.formation ?? "-"}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(lineup.startXI ?? []).slice(0, 11).map((item) => (
                <div
                  key={item.player?.id ?? item.player?.name}
                  className="rounded-lg border border-white/10 bg-black/15 p-2"
                >
                  <p className="truncate text-xs font-black text-white">
                    {item.player?.name ?? "Joueur"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.player?.pos ?? "-"}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
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
    mode === "country" && query.trim()
      ? countries.filter((country) =>
          normalizeTeamLookup(country.name).includes(normalizeTeamLookup(query))
        )
      : countries;

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

            {mode === "team" && leagues.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Ligues
                </p>
                {leagues.map((league) => (
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

            {mode === "team" && cities.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Villes
                </p>
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {cities.map((city) => (
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

            {mode === "team" && options.length > 0 && (
              <div>
                <p className="px-3 py-2 text-[11px] font-black uppercase text-slate-500">
                  Equipes
                </p>
            {options.map((team) => (
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
              leagues.length === 0 &&
              cities.length === 0 &&
              options.length === 0 && (
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
  const [teamASearchLoading, setTeamASearchLoading] = useState(false);
  const [teamBSearchLoading, setTeamBSearchLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionStatus, setPredictionStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [history, setHistory] = useState<UserActionHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("predictions");
  const [chatOpen, setChatOpen] = useState(false);
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
    } finally {
      setHistoryLoaded(true);
    }
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

    setPredictionStatus({
      type: "loading",
      message: "Recherche equipes, prediction, compositions et blessures...",
    });
    setPrediction(null);

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
      setHistoryLoaded(false);
      await loadPredictionHistory();
    } catch (error) {
      setPredictionStatus({
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

    const timeoutId = window.setTimeout(() => {
      searchTeams({
        query: teamAMode === "country" ? "" : teamA,
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

    const timeoutId = window.setTimeout(() => {
      searchTeams({
        query: teamBMode === "country" ? "" : teamB,
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
                    Prediction center
                  </p>
                  <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
                    Analyse avancee de match
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Filtre par pays, ville, ligue et equipe. La prediction affiche les probabilites, les statistiques, les joueurs disponibles, les absences et les evenements recents.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/15 p-2">
                {[
                  ["Equipe A", resolvedTeamA ? "OK" : "-"],
                  ["Equipe B", resolvedTeamB ? "OK" : "-"],
                  ["Source", prediction?.percentages.source ?? "API"],
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
                  }}
                  onCitySelect={(city) => {
                    setTeamA(city);
                    setSelectedTeamA(null);
                    setTeamACityFilter(city);
                    setTeamACountries([]);
                    setTeamALeagues([]);
                    setTeamAOptions([]);
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
                  }}
                  onCitySelect={(city) => {
                    setTeamB(city);
                    setSelectedTeamB(null);
                    setTeamBCityFilter(city);
                    setTeamBCountries([]);
                    setTeamBLeagues([]);
                    setTeamBOptions([]);
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
                    ? "Deux equipes API sont selectionnees. Tu peux lancer la prediction."
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
            </div>

              <div className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15">
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

            <div className="min-w-0 space-y-5">
              {!prediction && (resolvedTeamA || resolvedTeamB) && (
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

              {!prediction && (
                <div className="min-h-[520px] rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15 sm:p-6">
                  <div className="grid h-full gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
                    <div>
                      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/15">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <h3 className="max-w-2xl text-2xl font-black text-white">
                        Choisis deux equipes pour lancer une analyse complete
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                        Le resultat affichera les probabilites de victoire, la source de prediction, les statistiques des equipes, les buteurs recents, la discipline, l'effectif, les compositions et les blessures.
                      </p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {[
                          ["1", "Filtrer", "Pays, ville, ligue ou nom d'equipe"],
                          ["2", "Selectionner", "Choisir uniquement une equipe API"],
                          ["3", "Predire", "Comparer probabilites et statistiques"],
                          ["4", "Analyser", "Voir joueurs, forme, buts et cartons"],
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

              {prediction && (
                <>
                  <div className="rounded-xl border border-white/10 bg-[#10213d] p-4 shadow-lg shadow-black/15 sm:p-5">
                    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-center">
                      <div>
                        <p className="text-xs font-black uppercase text-lime-100/80">
                          Resultat prediction
                        </p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-black/15 p-3">
                            <TeamMark
                              src={prediction.teams.teamA.logo}
                              name={prediction.teams.teamA.name}
                              className="h-12 w-12 rounded-lg"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-white">
                                {prediction.teams.teamA.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {prediction.percentages.teamAWin}% victoire
                              </p>
                            </div>
                          </div>
                          <span className="self-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase text-slate-400">
                            vs
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-black/15 p-3">
                            <TeamMark
                              src={prediction.teams.teamB.logo}
                              name={prediction.teams.teamB.name}
                              className="h-12 w-12 rounded-lg"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-white">
                                {prediction.teams.teamB.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {prediction.percentages.teamBWin}% victoire
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">
                          Source: {prediction.percentages.source}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                        <p className="text-xs font-black uppercase text-slate-500">
                          Probabilites
                        </p>
                        <div className="mt-4 grid gap-4">
                          <PercentBar label={`${prediction.teams.teamA.name} gagne`} value={prediction.percentages.teamAWin} tone="bg-emerald-300" />
                          <PercentBar label="Egalite" value={prediction.percentages.draw} tone="bg-amber-300" />
                          <PercentBar label={`${prediction.teams.teamB.name} gagne`} value={prediction.percentages.teamBWin} tone="bg-cyan-300" />
                        </div>
                      </div>
                    </div>
                    {prediction.advice && (
                      <p className="mt-5 rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100">
                        {prediction.advice}
                      </p>
                    )}
                  </div>

                  <PredictionEvidenceSection prediction={prediction} />
                  <TeamAnalyticsSection prediction={prediction} />
                  <ExpectedLineupsSection prediction={prediction} />

                  <div className="rounded-xl border border-red-300/15 bg-red-400/10 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-black text-red-100">
                      <ShieldAlert className="h-4 w-4" />
                      Joueurs blesses
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {prediction.injuries.length === 0 && (
                        <p className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-red-100/80 md:col-span-2">
                          Aucun blesse retourne par API-FOOTBALL pour ce match.
                        </p>
                      )}
                      {prediction.injuries.slice(0, 12).map((injury) => (
                        <div key={`${injury.team?.id}-${injury.player?.id}-${injury.player?.name}`} className="rounded-lg border border-red-300/15 bg-black/15 p-3 text-sm">
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
                </>
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
