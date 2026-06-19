import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { recordUserAction } from "@/lib/user-actions";
import {
  type ApiFootballFixture,
  type ApiFootballFixtureEvent,
  type ApiFootballTeam,
  fetchApiFootballFixtureEvents,
  fetchApiFootballHeadToHead,
  fetchApiFootballInjuries,
  fetchApiFootballLineups,
  fetchApiFootballPredictions,
  fetchApiFootballSquads,
  fetchApiFootballStandings,
  fetchApiFootballTeamStatistics,
  fetchApiFootballFixtures,
  searchApiFootballTeams,
} from "@/lib/api-football";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const SCHEDULED_STATUSES = new Set(["TBD", "NS"]);

function normalizeText(value = ""): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function formatFixture(item: ApiFootballFixture) {
  return {
    fixtureId: item.fixture?.id ?? null,
    date: item.fixture?.date ?? null,
    timestamp: item.fixture?.timestamp ?? null,
    timezone: item.fixture?.timezone ?? null,
    venue: item.fixture?.venue ?? null,
    status: item.fixture?.status ?? null,
    competition: {
      id: item.league?.id ?? null,
      name: item.league?.name ?? null,
      country: item.league?.country ?? null,
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
  };
}

function sortByDate<T extends { date: string | null }>(fixtures: T[]): T[] {
  return [...fixtures].sort((first, second) => {
    return new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime();
  });
}

async function findTeam(name: string) {
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
      .filter(Boolean),
  };
}

async function findTeamByInput(input: {
  name: string;
  teamId?: number | null;
  logo?: string | null;
  country?: string | null;
}) {
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

function calculateFallbackPercentages(
  teamAId: number,
  teamBId: number,
  playedMatches: ReturnType<typeof formatFixture>[]
) {
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;

  for (const match of playedMatches) {
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;

    if (homeGoals == null || awayGoals == null) {
      continue;
    }

    if (homeGoals === awayGoals) {
      draws += 1;
      continue;
    }

    const homeWon = homeGoals > awayGoals;
    const winnerId = homeWon ? match.home.id : match.away.id;

    if (winnerId === teamAId) {
      teamAWins += 1;
    } else if (winnerId === teamBId) {
      teamBWins += 1;
    }
  }

  const total = teamAWins + teamBWins + draws;
  if (total === 0) {
    return {
      teamAWin: 34,
      draw: 32,
      teamBWin: 34,
      source: "neutral",
    };
  }

  return {
    teamAWin: Math.round((teamAWins / total) * 100),
    draw: Math.round((draws / total) * 100),
    teamBWin: Math.round((teamBWins / total) * 100),
    source: "head-to-head",
  };
}

function parsePercent(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
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

function summarizeRecentForm(
  teamId: number,
  fixtures: ReturnType<typeof formatFixture>[]
) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const fixture of fixtures) {
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;

    if (homeGoals == null || awayGoals == null) {
      continue;
    }

    const isHome = fixture.home.id === teamId;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const opponentGoals = isHome ? awayGoals : homeGoals;

    goalsFor += teamGoals;
    goalsAgainst += opponentGoals;

    if (teamGoals > opponentGoals) {
      wins += 1;
    } else if (teamGoals === opponentGoals) {
      draws += 1;
    } else {
      losses += 1;
    }
  }

  return {
    played: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
  };
}

function extractStanding(teamId: number, standingsResponse: unknown) {
  const standingGroups =
    (standingsResponse as {
      response?: Array<{
        league?: {
          standings?: Array<Array<{ team?: { id?: number } }>>;
        };
      }>;
    })?.response?.[0]?.league?.standings ?? [];

  return standingGroups.flat().find((standing) => standing.team?.id === teamId) ?? null;
}

function summarizeFixtureEvents(teamId: number, events: ApiFootballFixtureEvent[]) {
  const scorerMap = new Map<string, { id?: number; name: string; total: number }>();
  const cardMap = new Map<
    string,
    { id?: number; name: string; yellow: number; red: number }
  >();

  for (const event of events) {
    if (event.team?.id !== teamId) {
      continue;
    }

    const playerName = event.player?.name ?? "Joueur";
    const playerKey = String(event.player?.id ?? playerName);

    if (event.type === "Goal") {
      const current = scorerMap.get(playerKey) ?? {
        id: event.player?.id,
        name: playerName,
        total: 0,
      };
      current.total += 1;
      scorerMap.set(playerKey, current);
    }

    if (event.type === "Card") {
      const current = cardMap.get(playerKey) ?? {
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

      cardMap.set(playerKey, current);
    }
  }

  const cards = [...cardMap.values()].sort(
    (first, second) =>
      second.red + second.yellow - (first.red + first.yellow)
  );

  return {
    scorers: [...scorerMap.values()]
      .sort((first, second) => second.total - first.total)
      .slice(0, 8),
    yellowCards: cards.reduce((total, card) => total + card.yellow, 0),
    redCards: cards.reduce((total, card) => total + card.red, 0),
    cards: cards.slice(0, 8),
  };
}

async function getTeamAnalytics(params: {
  team: Awaited<ReturnType<typeof findTeam>>;
  leagueId: number | null;
  season: number | null;
  timezone: string;
}) {
  const today = getDateInTimezone(params.timezone);

  const [
    recentResult,
    squadResult,
    injuriesResult,
    statisticsResult,
    standingsResult,
  ] = await Promise.allSettled([
    fetchApiFootballFixtures({
      team: params.team.id,
      last: 10,
      timezone: params.timezone,
    }),
    fetchApiFootballSquads(params.team.id),
    fetchApiFootballInjuries({
      team: params.team.id,
      date: today,
      timezone: params.timezone,
    }),
    params.leagueId && params.season
      ? fetchApiFootballTeamStatistics({
          team: params.team.id,
          league: params.leagueId,
          season: params.season,
        })
      : Promise.resolve(null),
    params.leagueId && params.season
      ? fetchApiFootballStandings({
          team: params.team.id,
          league: params.leagueId,
          season: params.season,
        })
      : Promise.resolve(null),
  ]);

  const recentMatches =
    recentResult.status === "fulfilled"
      ? sortByDate(recentResult.value.response.map(formatFixture)).reverse()
      : [];
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
    result.status === "fulfilled" && result.value
      ? result.value.response
      : []
  );
  const squad =
    squadResult.status === "fulfilled" ? squadResult.value.response[0] : null;
  const injuries =
    injuriesResult.status === "fulfilled" ? injuriesResult.value.response : [];
  const statistics =
    statisticsResult.status === "fulfilled" && statisticsResult.value
      ? statisticsResult.value.response
      : [];
  const standingsPayload =
    standingsResult.status === "fulfilled" && standingsResult.value
      ? standingsResult.value
      : null;

  return {
    team: params.team,
    context: {
      leagueId: params.leagueId,
      season: params.season,
      injuryDate: today,
    },
    teamStatistics: statistics[0] ?? null,
    standing: standingsPayload
      ? extractStanding(params.team.id, standingsPayload)
      : null,
    recent: {
      summary: summarizeRecentForm(params.team.id, recentMatches),
      matches: recentMatches.slice(0, 5),
    },
    eventsSummary: summarizeFixtureEvents(params.team.id, recentEvents),
    squad: {
      count: squad?.players?.length ?? 0,
      players: (squad?.players ?? []).slice(0, 24),
    },
    injuries,
    warnings: {
      recent:
        recentResult.status === "rejected"
          ? recentResult.reason instanceof Error
            ? recentResult.reason.message
            : "Recent fixtures unavailable"
          : null,
      squad:
        squadResult.status === "rejected"
          ? squadResult.reason instanceof Error
            ? squadResult.reason.message
            : "Squad unavailable"
          : null,
      injuries:
        injuriesResult.status === "rejected"
          ? injuriesResult.reason instanceof Error
            ? injuriesResult.reason.message
            : "Team injuries unavailable"
          : null,
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
  const timezone =
    req.nextUrl.searchParams.get("timezone")?.trim() || "Africa/Casablanca";

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

    const headToHeadResult = await fetchApiFootballHeadToHead({
      firstTeamId: firstTeam.id,
      secondTeamId: secondTeam.id,
      timezone,
    });

    const headToHead = sortByDate(headToHeadResult.response.map(formatFixture));
    const playedHeadToHead = headToHead.filter((fixture) =>
      FINISHED_STATUSES.has(fixture.status?.short ?? "")
    );
    const scheduledHeadToHead = headToHead.filter((fixture) =>
      SCHEDULED_STATUSES.has(fixture.status?.short ?? "")
    );
    const targetFixture = scheduledHeadToHead[0] ?? headToHead.at(-1) ?? null;
    const fixtureId = targetFixture?.fixtureId ?? null;
    const contextLeagueId = targetFixture?.competition.id ?? null;
    const contextSeason = targetFixture?.competition.season ?? null;

    const [
      predictionResult,
      lineupResult,
      injuryResult,
      firstTeamAnalyticsResult,
      secondTeamAnalyticsResult,
    ] = await Promise.allSettled([
      fixtureId ? fetchApiFootballPredictions(fixtureId) : Promise.resolve(null),
      fixtureId ? fetchApiFootballLineups(fixtureId) : Promise.resolve(null),
      fixtureId
        ? fetchApiFootballInjuries({ fixture: fixtureId, timezone })
        : Promise.resolve(null),
      getTeamAnalytics({
        team: firstTeam,
        leagueId: contextLeagueId,
        season: contextSeason,
        timezone,
      }),
      getTeamAnalytics({
        team: secondTeam,
        leagueId: contextLeagueId,
        season: contextSeason,
        timezone,
      }),
    ]);

    const prediction =
      predictionResult.status === "fulfilled" && predictionResult.value
        ? predictionResult.value.response[0]
        : null;
    const percent = prediction?.predictions?.percent;
    const fallback = calculateFallbackPercentages(
      firstTeam.id,
      secondTeam.id,
      playedHeadToHead
    );

    const percentages = {
      teamAWin: parsePercent(percent?.home) ?? fallback.teamAWin,
      draw: parsePercent(percent?.draw) ?? fallback.draw,
      teamBWin: parsePercent(percent?.away) ?? fallback.teamBWin,
      source: percent ? "api-football-predictions" : fallback.source,
    };

    const responsePayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      timezone,
      teams: {
        teamA: firstTeam,
        teamB: secondTeam,
      },
      fixture: targetFixture,
      percentages,
      advice: prediction?.predictions?.advice ?? null,
      winner: prediction?.predictions?.winner ?? null,
      lineups:
        lineupResult.status === "fulfilled" && lineupResult.value
          ? lineupResult.value.response
          : [],
      injuries:
        injuryResult.status === "fulfilled" && injuryResult.value
          ? injuryResult.value.response
          : [],
      teamAnalytics: {
        teamA:
          firstTeamAnalyticsResult.status === "fulfilled"
            ? firstTeamAnalyticsResult.value
            : null,
        teamB:
          secondTeamAnalyticsResult.status === "fulfilled"
            ? secondTeamAnalyticsResult.value
            : null,
      },
      headToHead: {
        count: playedHeadToHead.length,
        matches: playedHeadToHead.slice(-8).reverse(),
      },
      warnings: {
        prediction:
          predictionResult.status === "rejected"
            ? predictionResult.reason instanceof Error
              ? predictionResult.reason.message
              : "Prediction unavailable"
            : null,
        lineups:
          lineupResult.status === "rejected"
            ? lineupResult.reason instanceof Error
              ? lineupResult.reason.message
              : "Lineups unavailable"
            : null,
        injuries:
          injuryResult.status === "rejected"
            ? injuryResult.reason instanceof Error
              ? injuryResult.reason.message
              : "Injuries unavailable"
            : null,
        teamAAnalytics:
          firstTeamAnalyticsResult.status === "rejected"
            ? firstTeamAnalyticsResult.reason instanceof Error
              ? firstTeamAnalyticsResult.reason.message
              : "Team A analytics unavailable"
            : null,
        teamBAnalytics:
          secondTeamAnalyticsResult.status === "rejected"
            ? secondTeamAnalyticsResult.reason instanceof Error
              ? secondTeamAnalyticsResult.reason.message
              : "Team B analytics unavailable"
            : null,
      },
    };

    let actionId: string | null = null;
    let actionSaveError: string | null = null;

    try {
      actionId = await recordUserAction({
        user: sessionUser,
        actionType: "football_prediction",
        label: `${firstTeam.name} vs ${secondTeam.name}`,
        payload: {
          requestedTeams: {
            teamA,
            teamB,
          },
          result: responsePayload,
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
            : "API-FOOTBALL prediction request failed",
      },
      { status: 500 }
    );
  }
}
