import { NextRequest, NextResponse } from "next/server";
import { canInsertData } from "@/lib/admin-auth";
import {
  type ApiFootballFixture,
  type ApiFootballTeam,
  fetchApiFootballFixtures,
  fetchApiFootballHeadToHead,
  searchApiFootballTeams,
} from "@/lib/api-football";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function normalizeText(value = ""): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function getYearRange() {
  const current = new Date().getFullYear();
  return {
    previous: current - 1,
    current,
  };
}

function formatFixture(item: ApiFootballFixture) {
  return {
    fixtureId: item.fixture?.id ?? null,
    date: item.fixture?.date ?? null,
    timestamp: item.fixture?.timestamp ?? null,
    timezone: item.fixture?.timezone ?? null,
    venue: {
      id: item.fixture?.venue?.id ?? null,
      name: item.fixture?.venue?.name ?? null,
      city: item.fixture?.venue?.city ?? null,
    },
    status: {
      long: item.fixture?.status?.long ?? null,
      short: item.fixture?.status?.short ?? null,
      elapsed: item.fixture?.status?.elapsed ?? null,
    },
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
      winner: item.teams?.home?.winner ?? null,
    },
    away: {
      id: item.teams?.away?.id ?? null,
      name: item.teams?.away?.name ?? null,
      winner: item.teams?.away?.winner ?? null,
    },
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null,
    },
  };
}

function sortFixtures<T extends { date: string | null }>(fixtures: T[]): T[] {
  return [...fixtures].sort((a, b) => {
    const first = new Date(a.date || 0).getTime();
    const second = new Date(b.date || 0).getTime();
    return first - second;
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

async function getTeamYearMatches(
  teamId: number,
  year: number,
  timezone: string
) {
  const result = await fetchApiFootballFixtures({
    team: teamId,
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    timezone,
  });
  const all = sortFixtures(result.response.map(formatFixture));
  const played = all.filter((fixture) =>
    FINISHED_STATUSES.has(fixture.status.short ?? "")
  );
  const scheduledOrOther = all.filter(
    (fixture) => !FINISHED_STATUSES.has(fixture.status.short ?? "")
  );

  return {
    year,
    period: {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    },
    count: {
      all: all.length,
      played: played.length,
      scheduledOrOther: scheduledOrOther.length,
    },
    all,
    played,
    scheduledOrOther,
  };
}

export async function GET(req: NextRequest) {
  if (!(await canInsertData())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const teamA = req.nextUrl.searchParams.get("teamA")?.trim();
  const teamB = req.nextUrl.searchParams.get("teamB")?.trim();
  const timezone =
    req.nextUrl.searchParams.get("timezone")?.trim() || "Africa/Casablanca";
  const years = getYearRange();

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

    const [
      firstPrevious,
      firstCurrent,
      secondPrevious,
      secondCurrent,
      headToHeadResult,
    ] = await Promise.all([
      getTeamYearMatches(firstTeam.id, years.previous, timezone),
      getTeamYearMatches(firstTeam.id, years.current, timezone),
      getTeamYearMatches(secondTeam.id, years.previous, timezone),
      getTeamYearMatches(secondTeam.id, years.current, timezone),
      fetchApiFootballHeadToHead({
        firstTeamId: firstTeam.id,
        secondTeamId: secondTeam.id,
        timezone,
      }),
    ]);

    const headToHeadAll = sortFixtures(
      headToHeadResult.response.map(formatFixture)
    );
    const headToHeadPlayed = headToHeadAll.filter((fixture) =>
      FINISHED_STATUSES.has(fixture.status.short ?? "")
    );

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      timezone,
      years,
      teams: {
        teamA: firstTeam,
        teamB: secondTeam,
      },
      teamMatches: {
        teamA: {
          [years.previous]: firstPrevious,
          [years.current]: firstCurrent,
        },
        teamB: {
          [years.previous]: secondPrevious,
          [years.current]: secondCurrent,
        },
      },
      playedHeadToHead: {
        count: headToHeadPlayed.length,
        matches: headToHeadPlayed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API-FOOTBALL matchup request failed",
      },
      { status: 500 }
    );
  }
}
