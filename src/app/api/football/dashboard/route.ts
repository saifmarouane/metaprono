import { NextResponse } from "next/server";
import { getCurrentChatAccess } from "@/lib/chat-users";
import {
  type ApiFootballFixture,
  fetchApiFootballFixtures,
} from "@/lib/api-football";

const UPCOMING_STATUSES = new Set(["TBD", "NS"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

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
    date: item.fixture?.date ?? null,
    timestamp: item.fixture?.timestamp ?? null,
    timezone: item.fixture?.timezone ?? null,
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
  };
}

function sortByDate<T extends { date: string | null }>(items: T[]): T[] {
  return [...items].sort((first, second) => {
    return new Date(first.date || 0).getTime() - new Date(second.date || 0).getTime();
  });
}

export async function GET() {
  const access = await getCurrentChatAccess();

  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  const timezone = "Africa/Casablanca";
  const today = getDateInTimezone(timezone);

  try {
    const [liveResult, todayResult] = await Promise.all([
      fetchApiFootballFixtures({ live: "all", timezone }),
      fetchApiFootballFixtures({ date: today, timezone }),
    ]);

    const live = sortByDate(liveResult.response.map(formatFixture));
    const todayFixtures = sortByDate(todayResult.response.map(formatFixture));
    const upcomingToday = todayFixtures.filter((fixture) =>
      UPCOMING_STATUSES.has(fixture.status?.short ?? "")
    );
    const finishedToday = todayFixtures
      .filter((fixture) => FINISHED_STATUSES.has(fixture.status?.short ?? ""))
      .reverse();

    const competitionMap = new Map<
      string,
      {
        id: number | null;
        name: string;
        country: string | null;
        logo: string | null;
        flag: string | null;
        liveCount: number;
        todayCount: number;
        nextMatches: typeof todayFixtures;
      }
    >();

    for (const fixture of todayFixtures) {
      const key = `${fixture.competition.id ?? "unknown"}-${fixture.competition.name ?? "Competition"}`;
      const current =
        competitionMap.get(key) ??
        {
          id: fixture.competition.id,
          name: fixture.competition.name ?? "Competition",
          country: fixture.competition.country,
          logo: fixture.competition.logo,
          flag: fixture.competition.flag,
          liveCount: 0,
          todayCount: 0,
          nextMatches: [],
        };

      current.todayCount += 1;
      if (UPCOMING_STATUSES.has(fixture.status?.short ?? "")) {
        current.nextMatches.push(fixture);
      }
      competitionMap.set(key, current);
    }

    for (const fixture of live) {
      const key = `${fixture.competition.id ?? "unknown"}-${fixture.competition.name ?? "Competition"}`;
      const current =
        competitionMap.get(key) ??
        {
          id: fixture.competition.id,
          name: fixture.competition.name ?? "Competition",
          country: fixture.competition.country,
          logo: fixture.competition.logo,
          flag: fixture.competition.flag,
          liveCount: 0,
          todayCount: 0,
          nextMatches: [],
        };

      current.liveCount += 1;
      competitionMap.set(key, current);
    }

    const competitions = Array.from(competitionMap.values())
      .map((competition) => ({
        ...competition,
        nextMatches: competition.nextMatches.slice(0, 3),
      }))
      .sort((first, second) => second.liveCount - first.liveCount || second.todayCount - first.todayCount);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      timezone,
      today,
      summary: {
        live: live.length,
        today: todayFixtures.length,
        finishedToday: finishedToday.length,
        upcomingToday: upcomingToday.length,
        nextToday: upcomingToday.length,
        competitions: competitions.length,
      },
      live,
      finishedToday: finishedToday.slice(0, 20),
      upcomingToday: upcomingToday.slice(0, 20),
      competitions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API-FOOTBALL dashboard request failed",
      },
      { status: 500 }
    );
  }
}
