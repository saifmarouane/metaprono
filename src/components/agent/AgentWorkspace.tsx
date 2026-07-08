"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Cloud,
  Code2,
  Database,
  FilePlus2,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserCircle2,
} from "lucide-react";
import { AdminInsertForm } from "@/components/admin/AdminInsertForm";
import { BrandLogo } from "@/components/BrandLogo";
import { AGENT_INSERT_COLLECTION_NAMES } from "@/lib/football-collection-guides";

type AgentWorkspaceProps = {
  user: {
    email: string;
    role: "admin" | "agent" | "user";
  };
};

type ViewKey = "insert" | "api" | "guide" | "activity";
type ThemeMode = "standard" | "light";

type FixturePreview = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
    };
  };
  league?: {
    name?: string;
    round?: string;
  };
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type MatchupResult = {
  generatedAt: string;
  timezone: string;
  years: {
    previous: number;
    current: number;
  };
  teams: {
    teamA: { id: number; name: string; country: string | null };
    teamB: { id: number; name: string; country: string | null };
  };
  teamMatches: Record<
    "teamA" | "teamB",
    Record<
      string,
      {
        count: {
          all: number;
          played: number;
          scheduledOrOther: number;
        };
        played: Array<{
          fixtureId: number | null;
          date: string | null;
          home: { name: string | null };
          away: { name: string | null };
          goals: { home: number | null; away: number | null };
          status: { short: string | null };
        }>;
      }
    >
  >;
  playedHeadToHead: {
    count: number;
    matches: Array<{
      fixtureId: number | null;
      date: string | null;
      home: { name: string | null };
      away: { name: string | null };
      goals: { home: number | null; away: number | null };
      status: { short: string | null };
    }>;
  };
};

type ApiEndpointGuide = {
  group: string;
  endpoint: string;
  title: string;
  useCase: string;
  method: "GET";
  params: Array<{
    name: string;
    required: boolean;
    example: string;
    note: string;
  }>;
  interfacePayload: Record<string, string | number | boolean>;
  cacheRule: string;
  targetCollection?: string;
};

const apiEndpointGuides: ApiEndpointGuide[] = [
  {
    group: "Reference",
    endpoint: "/countries",
    title: "Pays disponibles",
    useCase: "Construire le select pays et remplir football_countries.",
    method: "GET",
    params: [
      { name: "name", required: false, example: "France", note: "Recherche exacte par pays." },
      { name: "code", required: false, example: "FR", note: "Code alpha retourne par l'API." },
      { name: "search", required: false, example: "Mor", note: "Recherche partielle, minimum 3 caracteres." },
    ],
    interfacePayload: { endpoint: "countries", search: "France" },
    cacheRule: "Cache long. A rafraichir rarement.",
    targetCollection: "football_countries",
  },
  {
    group: "Reference",
    endpoint: "/leagues",
    title: "Competitions et coverage",
    useCase: "Trouver league_id, saisons disponibles, logos et flags de coverage.",
    method: "GET",
    params: [
      { name: "country", required: false, example: "France", note: "Nom exact du pays." },
      { name: "season", required: false, example: "2026", note: "Saison de depart." },
      { name: "current", required: false, example: "true", note: "Competitions actuellement actives." },
      { name: "type", required: false, example: "League", note: "League ou Cup." },
      { name: "search", required: false, example: "Ligue", note: "Recherche par nom." },
    ],
    interfacePayload: { endpoint: "leagues", country: "France", season: 2026 },
    cacheRule: "Cache quotidien. Lire coverage avant d'appeler standings, injuries, odds, predictions.",
    targetCollection: "football_leagues",
  },
  {
    group: "Reference",
    endpoint: "/teams",
    title: "Equipes",
    useCase: "Remplir football_teams et recuperer venue/logo.",
    method: "GET",
    params: [
      { name: "league", required: false, example: "61", note: "Avec season pour lister les equipes d'une competition." },
      { name: "season", required: false, example: "2026", note: "Saison cible." },
      { name: "id", required: false, example: "85", note: "Equipe precise." },
      { name: "search", required: false, example: "Paris", note: "Recherche par nom, minimum 3 caracteres." },
    ],
    interfacePayload: { endpoint: "teams", league: 61, season: 2026 },
    cacheRule: "Cache quotidien ou hebdomadaire. Les team IDs sont stables.",
    targetCollection: "football_teams",
  },
  {
    group: "Fixtures",
    endpoint: "/fixtures",
    title: "Matchs",
    useCase: "Point central du systeme. Un fixture_id permet ensuite events, stats, lineups, odds, predictions.",
    method: "GET",
    params: [
      { name: "league", required: false, example: "61", note: "Competition cible." },
      { name: "season", required: false, example: "2026", note: "Saison cible." },
      { name: "date", required: false, example: "2026-03-13", note: "Matchs d'une date." },
      { name: "next", required: false, example: "10", note: "Prochains matchs." },
      { name: "last", required: false, example: "10", note: "Derniers matchs." },
      { name: "live", required: false, example: "all", note: "Livescore global ou ligues separees par tirets." },
      { name: "timezone", required: false, example: "Africa/Casablanca", note: "Convertit les dates dans ce fuseau." },
    ],
    interfacePayload: { endpoint: "fixtures", league: 61, season: 2026, timezone: "Africa/Casablanca" },
    cacheRule: "Pre-match quotidien. Live toutes les 15-60 secondes pendant les matchs.",
    targetCollection: "football_fixtures",
  },
  {
    group: "Fixtures",
    endpoint: "/fixtures/events",
    title: "Evenements",
    useCase: "Buts, cartons, remplacements, VAR pour une timeline de match.",
    method: "GET",
    params: [
      { name: "fixture", required: true, example: "1200001", note: "ID du match." },
      { name: "team", required: false, example: "85", note: "Filtrer par equipe." },
      { name: "player", required: false, example: "276", note: "Filtrer par joueur." },
    ],
    interfacePayload: { endpoint: "fixtures/events", fixture: 1200001 },
    cacheRule: "Pendant live, poll apres changement de score ou toutes les 15-60 secondes.",
    targetCollection: "football_fixture_events",
  },
  {
    group: "Fixtures",
    endpoint: "/fixtures/statistics",
    title: "Statistiques match",
    useCase: "Possession, tirs, corners, passes par equipe.",
    method: "GET",
    params: [
      { name: "fixture", required: true, example: "1200001", note: "ID du match." },
      { name: "team", required: false, example: "85", note: "Filtrer par equipe." },
    ],
    interfacePayload: { endpoint: "fixtures/statistics", fixture: 1200001 },
    cacheRule: "Pendant live, toutes les 60 secondes. Gerer les valeurs nulles.",
    targetCollection: "football_fixture_statistics",
  },
  {
    group: "Fixtures",
    endpoint: "/fixtures/lineups",
    title: "Compositions",
    useCase: "Titularisations, formations, coachs et bancs.",
    method: "GET",
    params: [
      { name: "fixture", required: true, example: "1200001", note: "ID du match." },
      { name: "team", required: false, example: "85", note: "Filtrer par equipe." },
      { name: "player", required: false, example: "276", note: "Filtrer par joueur." },
    ],
    interfacePayload: { endpoint: "fixtures/lineups", fixture: 1200001 },
    cacheRule: "Commencer 90 minutes avant kickoff, puis toutes les 10 minutes jusqu'a disponibilite.",
    targetCollection: "football_fixture_lineups",
  },
  {
    group: "Competition",
    endpoint: "/standings",
    title: "Classements",
    useCase: "Classement, forme, points, difference de buts.",
    method: "GET",
    params: [
      { name: "league", required: true, example: "61", note: "Competition cible." },
      { name: "season", required: true, example: "2026", note: "Saison cible." },
      { name: "team", required: false, example: "85", note: "Classement d'une equipe." },
    ],
    interfacePayload: { endpoint: "standings", league: 61, season: 2026 },
    cacheRule: "Mise a jour environ horaire. Verifier coverage.standings.",
    targetCollection: "football_standings",
  },
  {
    group: "Players",
    endpoint: "/players",
    title: "Joueurs et stats saison",
    useCase: "Profil joueur et statistiques par equipe/ligue/saison.",
    method: "GET",
    params: [
      { name: "id", required: false, example: "276", note: "Joueur precis." },
      { name: "search", required: false, example: "Mbappe", note: "Recherche joueur, minimum 3 caracteres." },
      { name: "league", required: false, example: "61", note: "Competition cible." },
      { name: "season", required: true, example: "2026", note: "Obligatoire sur beaucoup de recherches joueurs." },
      { name: "page", required: false, example: "2", note: "Lire paging.total, endpoint pagine." },
    ],
    interfacePayload: { endpoint: "players", search: "Mbappe", season: 2026 },
    cacheRule: "Lire paging. Cache quotidien pour profils, plus frequent pour stats importantes.",
    targetCollection: "football_players / football_player_statistics",
  },
  {
    group: "Availability",
    endpoint: "/injuries",
    title: "Blessures et suspensions",
    useCase: "Absences par match, equipe, joueur, ligue ou date.",
    method: "GET",
    params: [
      { name: "fixture", required: false, example: "1200001", note: "Rapport d'absence pour un match." },
      { name: "league", required: false, example: "61", note: "Avec season pour une competition." },
      { name: "season", required: false, example: "2026", note: "Saison cible." },
      { name: "team", required: false, example: "85", note: "Absences d'une equipe." },
      { name: "date", required: false, example: "2026-03-13", note: "Situation a une date." },
      { name: "timezone", required: false, example: "Africa/Casablanca", note: "Convertit les dates." },
    ],
    interfacePayload: { endpoint: "injuries", fixture: 1200001, timezone: "Africa/Casablanca" },
    cacheRule: "Toutes les 4 heures. Verifier coverage.injuries.",
    targetCollection: "football_injuries",
  },
  {
    group: "Odds",
    endpoint: "/odds",
    title: "Cotes pre-match",
    useCase: "Cotes bookmakers avant match. Historique limite aux 7 derniers jours.",
    method: "GET",
    params: [
      { name: "fixture", required: false, example: "1200001", note: "Cotes d'un match." },
      { name: "league", required: false, example: "61", note: "Avec season pour une competition." },
      { name: "season", required: false, example: "2026", note: "Saison cible." },
      { name: "bookmaker", required: false, example: "1", note: "ID depuis /odds/bookmakers." },
      { name: "bet", required: false, example: "1", note: "ID depuis /odds/bets, pas live bets." },
      { name: "page", required: false, example: "2", note: "Pagination a 10 resultats par page." },
    ],
    interfacePayload: { endpoint: "odds", fixture: 1200001, bookmaker: 1 },
    cacheRule: "Toutes les 3 heures. Stocker en Mongo, pas de recuperation au-dela de 7 jours.",
    targetCollection: "football_odds",
  },
  {
    group: "Predictions",
    endpoint: "/predictions",
    title: "Predictions API",
    useCase: "Probabilites home/draw/away, advice, winner, over/under, comparaison equipe.",
    method: "GET",
    params: [
      { name: "fixture", required: true, example: "1200001", note: "ID du match a predire." },
    ],
    interfacePayload: { endpoint: "predictions", fixture: 1200001 },
    cacheRule: "Mise a jour horaire. Verifier coverage.predictions.",
  },
];

const views: Array<{
  key: ViewKey;
  label: string;
  description: string;
  icon: typeof FilePlus2;
}> = [
  {
    key: "insert",
    label: "Insertion",
    description: "Remplir les tables football",
    icon: FilePlus2,
  },
  {
    key: "api",
    label: "API Football",
    description: "Tester fixtures API-SPORTS",
    icon: Cloud,
  },
  {
    key: "guide",
    label: "Guide",
    description: "Ordre et bonnes pratiques",
    icon: BookOpen,
  },
  {
    key: "activity",
    label: "Activite",
    description: "Suivi du role agent",
    icon: BarChart3,
  },
];

function getShellClasses(mode: ThemeMode) {
  const isLight = mode === "light";

  return {
    page: isLight
      ? "bg-[#f4f7f2] text-[#11274c]"
      : "bg-[#11274c] text-white",
    nav: isLight
      ? "border-[#11274c]/10 bg-white/90 shadow-sm"
      : "border-white/10 bg-[#11274c]/85",
    sidebar: isLight
      ? "border-[#11274c]/10 bg-white text-[#11274c] shadow-sm"
      : "border-white/10 bg-[#0d1b33] text-white",
    panel: isLight
      ? "border-[#11274c]/10 bg-white text-[#11274c] shadow-sm"
      : "border-white/10 bg-[#0d1b33] text-white",
    muted: isLight ? "text-slate-600" : "text-slate-400",
    softPanel: isLight
      ? "border-[#11274c]/10 bg-[#f7faf5]"
      : "border-white/10 bg-white/[0.04]",
    activeNav: isLight
      ? "border-lime-500/35 bg-lime-100 text-[#11274c]"
      : "border-lime-300/35 bg-lime-300/10 text-lime-100",
    idleNav: isLight
      ? "border-[#11274c]/10 bg-white text-slate-700 hover:bg-slate-50"
      : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
  };
}

export function AgentWorkspace({ user }: AgentWorkspaceProps) {
  const [activeView, setActiveView] = useState<ViewKey>("insert");
  const [mode, setMode] = useState<ThemeMode>("standard");
  const [leagueId, setLeagueId] = useState("61");
  const [season, setSeason] = useState("2026");
  const [teamA, setTeamA] = useState("Brazil");
  const [teamB, setTeamB] = useState("Morocco");
  const [timezone, setTimezone] = useState("Africa/Casablanca");
  const [apiStatus, setApiStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [fixtures, setFixtures] = useState<FixturePreview[]>([]);
  const [matchupStatus, setMatchupStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [matchupResult, setMatchupResult] = useState<MatchupResult | null>(null);
  const classes = getShellClasses(mode);

  async function fetchFixtures() {
    setApiStatus({ type: "loading", message: "Chargement API-FOOTBALL..." });
    setFixtures([]);

    try {
      const params = new URLSearchParams({
        league: leagueId,
        season,
      });
      const response = await fetch(`/api/football/fixtures?${params}`);
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: {
          results?: number;
          response?: FixturePreview[];
        };
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Erreur API-FOOTBALL");
      }

      setFixtures(result.data?.response?.slice(0, 20) ?? []);
      setApiStatus({
        type: "success",
        message: `${result.data?.results ?? 0} fixture(s) recu(s).`,
      });
    } catch (error) {
      setApiStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erreur inconnue API-FOOTBALL.",
      });
    }
  }

  async function fetchTeamMatchup() {
    setMatchupStatus({
      type: "loading",
      message: "Recherche des equipes et recuperation des matchs...",
    });
    setMatchupResult(null);

    try {
      const params = new URLSearchParams({
        teamA,
        teamB,
        timezone,
      });
      const response = await fetch(`/api/football/team-matchup?${params}`);
      const result = (await response.json()) as
        | ({ ok: true } & MatchupResult)
        | { ok?: false; error?: string };

      if (!response.ok || result.ok !== true) {
        throw new Error(
          "error" in result && result.error
            ? result.error
            : "Erreur matchup API-FOOTBALL"
        );
      }

      setMatchupResult(result);
      setMatchupStatus({
        type: "success",
        message: `Donnees recues pour ${result.teams.teamA.name} vs ${result.teams.teamB.name}.`,
      });
    } catch (error) {
      setMatchupStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant la recuperation.",
      });
    }
  }

  return (
    <main className={`min-h-screen ${classes.page}`}>
      <nav
        className={`sticky top-0 z-40 border-b backdrop-blur-2xl ${classes.nav}`}
      >
        <div className="mx-auto flex h-22 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black uppercase sm:text-base">
                MetaPronostic Agent
              </p>
              <p className={`truncate text-xs font-semibold ${classes.muted}`}>
                Espace insertion football
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`hidden items-center gap-2 rounded-lg border px-3 py-2 md:flex ${classes.softPanel}`}
            >
              <UserCircle2 className="h-4 w-4 text-lime-500" />
              <span className={`max-w-[220px] truncate text-xs font-bold ${classes.muted}`}>
                {user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setMode((current) =>
                  current === "standard" ? "light" : "standard"
                )
              }
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition ${classes.softPanel}`}
              aria-label="Changer le mode d'affichage"
            >
              {mode === "standard" ? (
                <Moon className="h-4 w-4 text-lime-300" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span className="hidden sm:inline">
                {mode === "standard" ? "Standard" : "Light"}
              </span>
            </button>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 text-sm font-bold text-red-500 transition hover:bg-red-400/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8">
        <aside
          className={`h-max rounded-xl border p-4 lg:sticky lg:top-24 ${classes.sidebar}`}
        >
          <div className={`mb-4 rounded-lg border p-4 ${classes.softPanel}`}>
            <p className="text-xs font-black uppercase text-lime-500">
              Role agent
            </p>
            <p className={`mt-2 text-sm leading-6 ${classes.muted}`}>
              Tu peux inserer uniquement les donnees metier. Les pays,
              competitions, equipes, stades et joueurs viennent d&apos;API-FOOTBALL.
            </p>
          </div>

          <div className="space-y-2">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.key;

              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setActiveView(view.key)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                    isActive ? classes.activeNav : classes.idleNav
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {view.label}
                    </span>
                    <span className={`block truncate text-xs ${classes.muted}`}>
                      {view.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href="/"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${classes.idleNav}`}
            >
              <Home className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              href="/documentation"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${classes.idleNav}`}
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-400 text-sm font-black text-white transition hover:bg-lime-300"
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className={`rounded-xl border p-5 ${classes.panel}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-500">
                  Agent cockpit
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-normal md:text-3xl">
                  Organiser et inserer les donnees
                </h1>
                <p className={`mt-2 max-w-2xl text-sm leading-6 ${classes.muted}`}>
                  Une interface claire pour remplir les collections football
                  avec des champs guides, des selects et un apercu JSON.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Tables", String(AGENT_INSERT_COLLECTION_NAMES.length)],
                  ["Mode", mode === "standard" ? "STD" : "Light"],
                  ["Acces", "Insert"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-lg border px-4 py-3 ${classes.softPanel}`}
                  >
                    <p className="text-lg font-black">{value}</p>
                    <p className={`text-xs font-bold uppercase ${classes.muted}`}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeView === "insert" && (
            <div className={`rounded-xl border p-5 ${classes.panel}`}>
              <AdminInsertForm
                defaultCollection="football_fixtures"
                collectionNames={AGENT_INSERT_COLLECTION_NAMES}
                redirectAfterSubmit="/agent"
              />
            </div>
          )}

          {activeView === "api" && (
            <div className={`rounded-xl border p-5 ${classes.panel}`}>
              <div className="mb-5 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-cyan-400" />
                <h2 className="font-black">API Football</h2>
              </div>
              <p className={`mb-5 text-sm leading-6 ${classes.muted}`}>
                La cle reste cote serveur. L&apos;agent envoie seulement les filtres,
                puis Next.js ajoute le header xapisportskey.
              </p>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className={`mb-2 block text-xs font-black uppercase ${classes.muted}`}>
                    League ID
                  </label>
                  <input
                    value={leagueId}
                    onChange={(event) => setLeagueId(event.target.value)}
                    inputMode="numeric"
                    className={`w-full rounded-lg border px-3 py-3 text-sm font-bold outline-none ${classes.softPanel}`}
                    placeholder="61"
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-xs font-black uppercase ${classes.muted}`}>
                    Season
                  </label>
                  <input
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                    inputMode="numeric"
                    className={`w-full rounded-lg border px-3 py-3 text-sm font-bold outline-none ${classes.softPanel}`}
                    placeholder="2026"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchFixtures}
                  disabled={apiStatus.type === "loading"}
                  className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-lime-400 px-5 text-sm font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60 md:mt-6"
                >
                  <Search className="h-4 w-4" />
                  Tester
                </button>
              </div>

              {apiStatus.type !== "idle" && (
                <div
                  className={`mt-5 rounded-lg border px-4 py-3 text-sm font-bold ${
                    apiStatus.type === "error"
                      ? "border-red-400/25 bg-red-400/10 text-red-200"
                      : "border-lime-300/25 bg-lime-300/10 text-lime-200"
                  }`}
                >
                  {apiStatus.message}
                </div>
              )}

              {fixtures.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                    <thead className="bg-white/[0.04]">
                      <tr>
                        {["ID", "Match", "Competition", "Date", "Status"].map(
                          (column) => (
                            <th
                              key={column}
                              className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                            >
                              {column}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {fixtures.map((fixture) => (
                        <tr key={fixture.fixture?.id} className="hover:bg-white/[0.03]">
                          <td className="px-4 py-3 font-bold">
                            {fixture.fixture?.id}
                          </td>
                          <td className="px-4 py-3">
                            {fixture.teams?.home?.name ?? "-"} vs{" "}
                            {fixture.teams?.away?.name ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {fixture.league?.name ?? "-"}
                            <span className={`block text-xs ${classes.muted}`}>
                              {fixture.league?.round ?? ""}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {fixture.fixture?.date
                              ? new Date(fixture.fixture.date).toLocaleString("fr-FR")
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {fixture.fixture?.status?.short ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="mb-5 flex items-center gap-2">
                  <Database className="h-5 w-5 text-lime-500" />
                  <div>
                    <h3 className="font-black">Recuperer par deux equipes</h3>
                    <p className={`mt-1 text-sm ${classes.muted}`}>
                      Saisis Equipe A et Equipe B. Le backend cherche les IDs
                      via /teams, puis recupere leurs matchs et le head-to-head.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <label className={`mb-2 block text-xs font-black uppercase ${classes.muted}`}>
                      Equipe A
                    </label>
                    <input
                      value={teamA}
                      onChange={(event) => setTeamA(event.target.value)}
                      className={`w-full rounded-lg border px-3 py-3 text-sm font-bold outline-none ${classes.softPanel}`}
                      placeholder="Brazil"
                    />
                  </div>
                  <div>
                    <label className={`mb-2 block text-xs font-black uppercase ${classes.muted}`}>
                      Equipe B
                    </label>
                    <input
                      value={teamB}
                      onChange={(event) => setTeamB(event.target.value)}
                      className={`w-full rounded-lg border px-3 py-3 text-sm font-bold outline-none ${classes.softPanel}`}
                      placeholder="Morocco"
                    />
                  </div>
                  <div>
                    <label className={`mb-2 block text-xs font-black uppercase ${classes.muted}`}>
                      Timezone
                    </label>
                    <input
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                      className={`w-full rounded-lg border px-3 py-3 text-sm font-bold outline-none ${classes.softPanel}`}
                      placeholder="Africa/Casablanca"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchTeamMatchup}
                    disabled={matchupStatus.type === "loading"}
                    className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-lime-400 px-5 text-sm font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-6"
                  >
                    <Search className="h-4 w-4" />
                    Recuperer
                  </button>
                </div>

                {matchupStatus.type !== "idle" && (
                  <div
                    className={`mt-5 rounded-lg border px-4 py-3 text-sm font-bold ${
                      matchupStatus.type === "error"
                        ? "border-red-400/25 bg-red-400/10 text-red-200"
                        : "border-lime-300/25 bg-lime-300/10 text-lime-200"
                    }`}
                  >
                    {matchupStatus.message}
                  </div>
                )}

                {matchupResult && (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        [
                          matchupResult.teams.teamA.name,
                          `ID ${matchupResult.teams.teamA.id}`,
                        ],
                        [
                          matchupResult.teams.teamB.name,
                          `ID ${matchupResult.teams.teamB.id}`,
                        ],
                        [
                          "Head-to-head joues",
                          String(matchupResult.playedHeadToHead.count),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className={`rounded-lg border p-4 ${classes.softPanel}`}
                        >
                          <p className={`text-xs font-black uppercase ${classes.muted}`}>
                            {label}
                          </p>
                          <p className="mt-2 text-xl font-black">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                        <thead className="bg-white/[0.04]">
                          <tr>
                            {["Equipe", "Annee", "Tous", "Joues", "Planifies/autres"].map(
                              (column) => (
                                <th
                                  key={column}
                                  className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                                >
                                  {column}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {(["teamA", "teamB"] as const).flatMap((teamKey) =>
                            Object.entries(matchupResult.teamMatches[teamKey]).map(
                              ([year, entry]) => (
                                <tr key={`${teamKey}-${year}`}>
                                  <td className="px-4 py-3 font-bold">
                                    {matchupResult.teams[teamKey].name}
                                  </td>
                                  <td className="px-4 py-3">{year}</td>
                                  <td className="px-4 py-3">{entry.count.all}</td>
                                  <td className="px-4 py-3">{entry.count.played}</td>
                                  <td className="px-4 py-3">
                                    {entry.count.scheduledOrOther}
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {matchupResult.playedHeadToHead.matches.length > 0 && (
                      <div className="rounded-lg border border-white/10 p-4">
                        <h4 className="mb-3 font-black">
                          Confrontations terminees
                        </h4>
                        <div className="grid gap-2">
                          {matchupResult.playedHeadToHead.matches
                            .slice(0, 8)
                            .map((match) => (
                              <div
                                key={match.fixtureId}
                                className={`rounded-lg border px-3 py-2 text-sm ${classes.softPanel}`}
                              >
                                <span className="font-bold">
                                  {match.home.name} {match.goals.home} -{" "}
                                  {match.goals.away} {match.away.name}
                                </span>
                                <span className={`ml-2 text-xs ${classes.muted}`}>
                                  {match.date
                                    ? new Date(match.date).toLocaleDateString("fr-FR")
                                    : ""}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="mb-5 flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-lime-500" />
                  <div>
                    <h3 className="font-black">Guide endpoints API-FOOTBALL</h3>
                    <p className={`mt-1 text-sm ${classes.muted}`}>
                      Chaque bloc explique quoi saisir dans l&apos;interface, quels
                      parametres envoyer et ou stocker les donnees dans MongoDB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {apiEndpointGuides.map((guide) => (
                    <article
                      key={guide.endpoint}
                      className={`rounded-xl border p-4 ${classes.softPanel}`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-lime-400 px-2 py-1 text-xs font-black text-white">
                              {guide.method}
                            </span>
                            <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs font-black text-cyan-200">
                              {guide.group}
                            </span>
                            <code className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold">
                              {guide.endpoint}
                            </code>
                          </div>
                          <h4 className="mt-3 text-lg font-black">
                            {guide.title}
                          </h4>
                          <p className={`mt-1 text-sm leading-6 ${classes.muted}`}>
                            {guide.useCase}
                          </p>
                        </div>
                        <div className="min-w-[220px] rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-xs font-black uppercase text-slate-400">
                            Cache / polling
                          </p>
                          <p className="mt-2 text-sm leading-5">
                            {guide.cacheRule}
                          </p>
                          {guide.targetCollection && (
                            <p className="mt-3 text-xs font-black text-lime-300">
                              MongoDB: {guide.targetCollection}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                            <thead className="bg-white/[0.04]">
                              <tr>
                                {["Parametre", "Req.", "Exemple", "Note"].map(
                                  (column) => (
                                    <th
                                      key={column}
                                      className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                                    >
                                      {column}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {guide.params.map((param) => (
                                <tr key={param.name}>
                                  <td className="px-4 py-3 font-black">
                                    {param.name}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-md px-2 py-1 text-xs font-black ${
                                        param.required
                                          ? "bg-lime-300/15 text-lime-200"
                                          : "bg-white/[0.06] text-slate-300"
                                      }`}
                                    >
                                      {param.required ? "Oui" : "Non"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <code className="rounded bg-black/20 px-2 py-1 text-xs">
                                      {param.example}
                                    </code>
                                  </td>
                                  <td className={`px-4 py-3 ${classes.muted}`}>
                                    {param.note}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                          <p className="text-xs font-black uppercase text-slate-400">
                            Payload interface
                          </p>
                          <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs leading-6">
                            {JSON.stringify(guide.interfacePayload, null, 2)}
                          </pre>
                          <p className={`mt-3 text-xs leading-5 ${classes.muted}`}>
                            URL finale cote serveur :{" "}
                            <code className="rounded bg-black/20 px-1">
                              {`https://v3.football.api-sports.io${guide.endpoint}`}
                            </code>
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === "guide" && (
            <div className={`rounded-xl border p-5 ${classes.panel}`}>
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <h2 className="font-black">Guide rapide</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Remplir les pays, competitions, saisons, stades et equipes avant les matchs.",
                  "Utiliser les selects pour eviter les erreurs sur les IDs de pays, ligues, equipes et joueurs.",
                  "Verifier les champs obligatoires avant insertion.",
                  "Ajouter scores, statuts, cotes et blessures pour ameliorer les reponses LLM.",
                ].map((item) => (
                  <div
                    key={item}
                    className={`rounded-lg border p-4 text-sm leading-6 ${classes.softPanel}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/documentation"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-white transition hover:bg-lime-300"
              >
                <BookOpen className="h-4 w-4" />
                Ouvrir la documentation complete
              </Link>
            </div>
          )}

          {activeView === "activity" && (
            <div className={`rounded-xl border p-5 ${classes.panel}`}>
              <div className="mb-5 flex items-center gap-2">
                <Database className="h-5 w-5 text-lime-500" />
                <h2 className="font-black">Activite agent</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Permission", "Insertion uniquement"],
                  ["Collections", "Matchs et stats"],
                  ["References", "API-FOOTBALL"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-lg border p-4 ${classes.softPanel}`}
                  >
                    <p className={`text-xs font-black uppercase ${classes.muted}`}>
                      {label}
                    </p>
                    <p className="mt-2 text-lg font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
