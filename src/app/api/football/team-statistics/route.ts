import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { recordUserAction } from "@/lib/user-actions";
import {
  type ApiFootballFixture,
  type ApiFootballFixtureEvent,
  type ApiFootballTeam,
  fetchApiFootballFixtureEvents,
  fetchApiFootballFixtures,
  fetchApiFootballInjuries,
  fetchApiFootballSquads,
  fetchApiFootballStandings,
  fetchApiFootballTeamStatistics,
  fetchApiFootballHeadToHead,
  searchApiFootballTeams,
} from "@/lib/api-football";

type TeamIdentity = {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  national: boolean;
  logo: string | null;
  alternatives: string[];
};

type LeagueContext = {
  leagueId: number;
  season: number;
  name: string | null;
  country: string | null;
  source: "selected" | "fixture";
};

function normalizeText(value = ""): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getDateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatFixture(item: ApiFootballFixture) {
  return {
    fixtureId: item.fixture?.id ?? null,
    referee: item.fixture?.referee ?? null,
    timezone: item.fixture?.timezone ?? null,
    date: item.fixture?.date ?? null,
    timestamp: item.fixture?.timestamp ?? null,
    venue: item.fixture?.venue ?? null,
    status: item.fixture?.status ?? null,
    competition: {
      id: item.league?.id ?? null,
      name: item.league?.name ?? null,
      country: item.league?.country ?? null,
      logo: item.league?.logo ?? null,
      flag: item.league?.flag ?? null,
      season: item.league?.season ?? null,
      round: item.league?.round ?? null,
    },
    home: {
      id: item.teams?.home?.id ?? null,
      name: item.teams?.home?.name ?? null,
      logo: item.teams?.home?.logo ?? null,
      winner: item.teams?.home?.winner ?? null,
    },
    away: {
      id: item.teams?.away?.id ?? null,
      name: item.teams?.away?.name ?? null,
      logo: item.teams?.away?.logo ?? null,
      winner: item.teams?.away?.winner ?? null,
    },
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null,
    },
    score: item.score ?? null,
  };
}

function sortByDate<T extends { date: string | null }>(fixtures: T[]): T[] {
  return [...fixtures].sort((first, second) => {
    return new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime();
  });
}

async function findTeam(name: string): Promise<TeamIdentity> {
  const result = await searchApiFootballTeams(name);
  const teams = result.response;
  const nationalTeams = teams.filter((item) => item.team?.national === true);
  const candidates = nationalTeams.length > 0 ? nationalTeams : teams;
  const exact = candidates.find(
    (item) => normalizeText(item.team?.name) === normalizeText(name)
  );
  const selected = exact ?? candidates[0];

  if (!selected?.team?.id) {
    throw new Error(`Equipe introuvable: ${name}`);
  }

  return {
    id: selected.team.id,
    name: selected.team.name ?? name,
    code: selected.team.code ?? null,
    country: selected.team.country ?? null,
    national: selected.team.national ?? false,
    logo: selected.team.logo ?? null,
    alternatives: candidates
      .slice(0, 5)
      .map((item: ApiFootballTeam) => item.team?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

async function findTeamByInput(input: {
  name: string;
  teamId?: number | null;
  logo?: string | null;
  country?: string | null;
}): Promise<TeamIdentity> {
  if (!input.teamId) {
    return findTeam(input.name);
  }

  return {
    id: input.teamId,
    name: input.name,
    code: null,
    country: input.country ?? null,
    national: false,
    logo: input.logo ?? null,
    alternatives: [],
  };
}

function summarizeForm(teamId: number, fixtures: ReturnType<typeof formatFixture>[]) {
  return fixtures.reduce(
    (summary, fixture) => {
      const homeGoals = fixture.goals.home;
      const awayGoals = fixture.goals.away;
      const isHome = fixture.home.id === teamId;

      if (homeGoals == null || awayGoals == null) {
        return summary;
      }

      const goalsFor = isHome ? homeGoals : awayGoals;
      const goalsAgainst = isHome ? awayGoals : homeGoals;

      summary.played += 1;
      summary.goalsFor += goalsFor;
      summary.goalsAgainst += goalsAgainst;

      if (goalsFor > goalsAgainst) {
        summary.wins += 1;
      } else if (goalsFor === goalsAgainst) {
        summary.draws += 1;
      } else {
        summary.losses += 1;
      }

      return summary;
    },
    {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }
  );
}

function summarizeEvents(teamId: number, events: ApiFootballFixtureEvent[]) {
  const scorers = new Map<string, { id?: number; name: string; total: number }>();
  const cards = new Map<
    string,
    { id?: number; name: string; yellow: number; red: number }
  >();
  let substitutions = 0;

  for (const event of events) {
    if (event.team?.id !== teamId) {
      continue;
    }

    const playerName = event.player?.name ?? "Joueur";
    const playerKey = String(event.player?.id ?? playerName);

    if (event.type === "Goal") {
      const current = scorers.get(playerKey) ?? {
        id: event.player?.id,
        name: playerName,
        total: 0,
      };
      current.total += 1;
      scorers.set(playerKey, current);
    }

    if (event.type === "Card") {
      const current = cards.get(playerKey) ?? {
        id: event.player?.id,
        name: playerName,
        yellow: 0,
        red: 0,
      };

      if (event.detail?.toLowerCase().includes("red")) {
        current.red += 1;
      } else {
        current.yellow += 1;
      }

      cards.set(playerKey, current);
    }

    if (event.type === "subst") {
      substitutions += 1;
    }
  }

  const cardList = [...cards.values()].sort(
    (first, second) =>
      second.red + second.yellow - (first.red + first.yellow)
  );

  return {
    scorers: [...scorers.values()]
      .sort((first, second) => second.total - first.total)
      .slice(0, 10),
    yellowCards: cardList.reduce((total, card) => total + card.yellow, 0),
    redCards: cardList.reduce((total, card) => total + card.red, 0),
    cards: cardList.slice(0, 10),
    substitutions,
  };
}

function buildLeagueContexts(input: {
  selectedLeagueId?: number | null;
  selectedSeason?: number | null;
  fixtures: ReturnType<typeof formatFixture>[];
}): LeagueContext[] {
  const contexts = new Map<string, LeagueContext>();

  if (input.selectedLeagueId && input.selectedSeason) {
    contexts.set(`${input.selectedLeagueId}-${input.selectedSeason}`, {
      leagueId: input.selectedLeagueId,
      season: input.selectedSeason,
      name: null,
      country: null,
      source: "selected",
    });
  }

  for (const fixture of input.fixtures) {
    const leagueId = fixture.competition.id;
    const season = fixture.competition.season;

    if (!leagueId || !season) {
      continue;
    }

    const key = `${leagueId}-${season}`;
    if (!contexts.has(key)) {
      contexts.set(key, {
        leagueId,
        season,
        name: fixture.competition.name,
        country: fixture.competition.country,
        source: "fixture",
      });
    }
  }

  return [...contexts.values()].slice(0, 4);
}

async function collectTeamStatistics(input: {
  team: TeamIdentity;
  selectedLeagueId?: number | null;
  selectedSeason?: number | null;
  timezone: string;
  today: string;
}) {
  const warnings: Record<string, string> = {};

  const [recentResult, upcomingResult, squadResult, injuriesResult] =
    await Promise.allSettled([
      fetchApiFootballFixtures({
        team: input.team.id,
        last: 10,
        timezone: input.timezone,
      }),
      fetchApiFootballFixtures({
        team: input.team.id,
        next: 10,
        timezone: input.timezone,
      }),
      fetchApiFootballSquads(input.team.id),
      fetchApiFootballInjuries({
        team: input.team.id,
        date: input.today,
        timezone: input.timezone,
      }),
    ]);

  const recentMatches =
    recentResult.status === "fulfilled"
      ? sortByDate(recentResult.value.response.map(formatFixture)).reverse()
      : [];
  const upcomingMatches =
    upcomingResult.status === "fulfilled"
      ? sortByDate(upcomingResult.value.response.map(formatFixture))
      : [];
  const squad =
    squadResult.status === "fulfilled" ? squadResult.value.response[0] : null;
  const injuries =
    injuriesResult.status === "fulfilled" ? injuriesResult.value.response : [];

  if (recentResult.status === "rejected") {
    warnings.recentFixtures =
      recentResult.reason instanceof Error
        ? recentResult.reason.message
        : "Recent fixtures unavailable";
  }
  if (upcomingResult.status === "rejected") {
    warnings.upcomingFixtures =
      upcomingResult.reason instanceof Error
        ? upcomingResult.reason.message
        : "Upcoming fixtures unavailable";
  }
  if (squadResult.status === "rejected") {
    warnings.squad =
      squadResult.reason instanceof Error
        ? squadResult.reason.message
        : "Squad unavailable";
  }
  if (injuriesResult.status === "rejected") {
    warnings.injuries =
      injuriesResult.reason instanceof Error
        ? injuriesResult.reason.message
        : "Injuries unavailable";
  }

  const leagueContexts = buildLeagueContexts({
    selectedLeagueId: input.selectedLeagueId,
    selectedSeason: input.selectedSeason,
    fixtures: [...upcomingMatches, ...recentMatches],
  });

  const leagueStatistics = await Promise.all(
    leagueContexts.map(async (context) => {
      const [statisticsResult, standingsResult] = await Promise.allSettled([
        fetchApiFootballTeamStatistics({
          team: input.team.id,
          league: context.leagueId,
          season: context.season,
        }),
        fetchApiFootballStandings({
          team: input.team.id,
          league: context.leagueId,
          season: context.season,
        }),
      ]);

      return {
        context,
        teamStatistics:
          statisticsResult.status === "fulfilled"
            ? statisticsResult.value.response[0] ?? null
            : null,
        standings:
          standingsResult.status === "fulfilled"
            ? standingsResult.value.response[0] ?? null
            : null,
        errors: {
          teamStatistics:
            statisticsResult.status === "rejected"
              ? statisticsResult.reason instanceof Error
                ? statisticsResult.reason.message
                : "Team statistics unavailable"
              : null,
          standings:
            standingsResult.status === "rejected"
              ? standingsResult.reason instanceof Error
                ? standingsResult.reason.message
                : "Standings unavailable"
              : null,
        },
      };
    })
  );

  const eventResults = await Promise.allSettled(
    recentMatches
      .slice(0, 5)
      .map((match) =>
        match.fixtureId
          ? fetchApiFootballFixtureEvents(match.fixtureId)
          : Promise.resolve(null)
      )
  );
  const recentEvents = eventResults.flatMap((result) =>
    result.status === "fulfilled" && result.value ? result.value.response : []
  );

  return {
    team: input.team,
    generatedAt: new Date().toISOString(),
    timezone: input.timezone,
    coverage: {
      recentFixturesRequested: 10,
      upcomingFixturesRequested: 10,
      eventFixturesAnalyzed: Math.min(recentMatches.length, 5),
      leagueContexts: leagueContexts.length,
      injuryDate: input.today,
    },
    selectedContext: {
      leagueId: input.selectedLeagueId ?? null,
      season: input.selectedSeason ?? null,
    },
    fixtures: {
      recent: recentMatches,
      upcoming: upcomingMatches,
      formSummary: summarizeForm(input.team.id, recentMatches),
    },
    leagueStatistics,
    squad: {
      count: squad?.players?.length ?? 0,
      players: squad?.players ?? [],
    },
    injuries,
    recentEvents: {
      summary: summarizeEvents(input.team.id, recentEvents),
      raw: recentEvents,
    },
    warnings,
    apiSources: [
      "/fixtures?team={id}&last=10",
      "/fixtures?team={id}&next=10",
      "/teams/statistics?team={id}&league={id}&season={year}",
      "/standings?team={id}&league={id}&season={year}",
      "/players/squads?team={id}",
      "/injuries?team={id}&date={today}",
      "/fixtures/events?fixture={id}",
    ],
  };
}

export async function GET(req: NextRequest) {
  const access = await getCurrentChatAccess();
  const sessionUser = await getAuthenticatedUser();

  if (!access.allowed || !sessionUser) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  const teamA = req.nextUrl.searchParams.get("teamA")?.trim();
  const teamB = req.nextUrl.searchParams.get("teamB")?.trim();
  const teamAId = Number(req.nextUrl.searchParams.get("teamAId"));
  const teamBId = Number(req.nextUrl.searchParams.get("teamBId"));
  const teamALogo = req.nextUrl.searchParams.get("teamALogo");
  const teamBLogo = req.nextUrl.searchParams.get("teamBLogo");
  const teamACountry = req.nextUrl.searchParams.get("teamACountry");
  const teamBCountry = req.nextUrl.searchParams.get("teamBCountry");
  const teamALeagueId = Number(req.nextUrl.searchParams.get("teamALeagueId"));
  const teamBLeagueId = Number(req.nextUrl.searchParams.get("teamBLeagueId"));
  const teamASeason = Number(req.nextUrl.searchParams.get("teamASeason"));
  const teamBSeason = Number(req.nextUrl.searchParams.get("teamBSeason"));
  const timezone =
    req.nextUrl.searchParams.get("timezone")?.trim() || "Africa/Casablanca";
  const today = getDateInTimezone(timezone);

  if (!teamA || !teamB) {
    return NextResponse.json(
      { ok: false, error: "teamA and teamB are required" },
      { status: 400 }
    );
  }

  try {
    const [firstTeam, secondTeam] = await Promise.all([
      findTeamByInput({
        name: teamA,
        teamId: Number.isFinite(teamAId) ? teamAId : null,
        logo: teamALogo,
        country: teamACountry,
      }),
      findTeamByInput({
        name: teamB,
        teamId: Number.isFinite(teamBId) ? teamBId : null,
        logo: teamBLogo,
        country: teamBCountry,
      }),
    ]);

    const [teamAStatistics, teamBStatistics, headToHeadResult] =
      await Promise.allSettled([
        collectTeamStatistics({
          team: firstTeam,
          selectedLeagueId: Number.isFinite(teamALeagueId)
            ? teamALeagueId
            : null,
          selectedSeason: Number.isFinite(teamASeason) ? teamASeason : null,
          timezone,
          today,
        }),
        collectTeamStatistics({
          team: secondTeam,
          selectedLeagueId: Number.isFinite(teamBLeagueId)
            ? teamBLeagueId
            : null,
          selectedSeason: Number.isFinite(teamBSeason) ? teamBSeason : null,
          timezone,
          today,
        }),
        fetchApiFootballHeadToHead({
          firstTeamId: firstTeam.id,
          secondTeamId: secondTeam.id,
          timezone,
        }),
      ]);

    if (teamAStatistics.status === "rejected") {
      throw teamAStatistics.reason;
    }

    if (teamBStatistics.status === "rejected") {
      throw teamBStatistics.reason;
    }

    const responsePayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      timezone,
      teams: {
        teamA: firstTeam,
        teamB: secondTeam,
      },
      teamAJson: teamAStatistics.value,
      teamBJson: teamBStatistics.value,
      shared: {
        headToHead:
          headToHeadResult.status === "fulfilled"
            ? sortByDate(headToHeadResult.value.response.map(formatFixture)).reverse()
            : [],
        warnings: {
          headToHead:
            headToHeadResult.status === "rejected"
              ? headToHeadResult.reason instanceof Error
                ? headToHeadResult.reason.message
                : "Head-to-head unavailable"
              : null,
        },
      },
    };

    let actionId: string | null = null;
    let actionSaveError: string | null = null;

    try {
      actionId = await recordUserAction({
        user: sessionUser,
        actionType: "team_statistics",
        label: `${firstTeam.name} vs ${secondTeam.name}`,
        payload: {
          requestedTeams: {
            teamA,
            teamB,
          },
          generatedAt: responsePayload.generatedAt,
          teams: responsePayload.teams,
          shared: responsePayload.shared,
        },
      });
    } catch (error) {
      actionSaveError =
        error instanceof Error ? error.message : "Action history save failed";
    }

    return NextResponse.json({
      ...responsePayload,
      actionId,
      actionSaveError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Team statistics request failed",
      },
      { status: 500 }
    );
  }
}
