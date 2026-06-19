import { NextRequest, NextResponse } from "next/server";
import { getCurrentChatAccess } from "@/lib/chat-users";
import {
  type ApiFootballFixture,
  type ApiFootballTeam,
  fetchApiFootballHeadToHead,
  fetchApiFootballInjuries,
  fetchApiFootballLineups,
  fetchApiFootballPredictions,
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

export async function GET(req: NextRequest) {
  const access = await getCurrentChatAccess();

  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  const teamA = req.nextUrl.searchParams.get("teamA")?.trim();
  const teamB = req.nextUrl.searchParams.get("teamB")?.trim();
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
      findTeam(teamA),
      findTeam(teamB),
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

    const [predictionResult, lineupResult, injuryResult] = fixtureId
      ? await Promise.allSettled([
          fetchApiFootballPredictions(fixtureId),
          fetchApiFootballLineups(fixtureId),
          fetchApiFootballInjuries({ fixture: fixtureId, timezone }),
        ])
      : [null, null, null];

    const prediction =
      predictionResult?.status === "fulfilled"
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

    return NextResponse.json({
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
        lineupResult?.status === "fulfilled" ? lineupResult.value.response : [],
      injuries:
        injuryResult?.status === "fulfilled" ? injuryResult.value.response : [],
      headToHead: {
        count: playedHeadToHead.length,
        matches: playedHeadToHead.slice(-8).reverse(),
      },
      warnings: {
        prediction:
          predictionResult && predictionResult.status === "rejected"
            ? predictionResult.reason instanceof Error
              ? predictionResult.reason.message
              : "Prediction unavailable"
            : null,
        lineups:
          lineupResult && lineupResult.status === "rejected"
            ? lineupResult.reason instanceof Error
              ? lineupResult.reason.message
              : "Lineups unavailable"
            : null,
        injuries:
          injuryResult && injuryResult.status === "rejected"
            ? injuryResult.reason instanceof Error
              ? injuryResult.reason.message
              : "Injuries unavailable"
            : null,
      },
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
