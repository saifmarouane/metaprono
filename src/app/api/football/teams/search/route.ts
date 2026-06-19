import { NextRequest, NextResponse } from "next/server";
import { getCurrentChatAccess } from "@/lib/chat-users";
import {
  fetchApiFootballCountries,
  fetchApiFootballLeagues,
  fetchApiFootballTeamsByCountry,
  fetchApiFootballTeamsByLeague,
  searchApiFootballCountries,
  searchApiFootballTeams,
} from "@/lib/api-football";

export async function GET(req: NextRequest) {
  const access = await getCurrentChatAccess();

  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = req.nextUrl.searchParams.get("country")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
  const league = Number(req.nextUrl.searchParams.get("league"));
  const allCountries = req.nextUrl.searchParams.get("countries") === "all";
  const season = Number(req.nextUrl.searchParams.get("season")) || new Date().getFullYear();

  if (query.length < 1 && country.length < 1 && !Number.isFinite(league) && !allCountries) {
    return NextResponse.json({
      ok: true,
      countries: [],
      leagues: [],
      cities: [],
      teams: [],
    });
  }

  try {
    const [countryResult, leagueResult, teamResult] = await Promise.allSettled([
      country
        ? Promise.resolve(null)
        : allCountries
          ? fetchApiFootballCountries()
          : searchApiFootballCountries(query),
      country
        ? fetchApiFootballLeagues({ country, season })
        : query.length >= 1
          ? fetchApiFootballLeagues({ search: query, season })
          : Promise.resolve(null),
      country
        ? Number.isFinite(league)
          ? fetchApiFootballTeamsByLeague({ league, season })
          : fetchApiFootballTeamsByCountry(country)
        : Number.isFinite(league)
          ? fetchApiFootballTeamsByLeague({ league, season })
          : query.length >= 1
          ? searchApiFootballTeams(query)
          : Promise.resolve(null),
    ]);

    const countries =
      countryResult.status === "fulfilled" && countryResult.value
        ? countryResult.value.response
            .map((item) => ({
              name: item.name ?? "",
              code: item.code ?? null,
              flag: item.flag ?? null,
            }))
            .filter((item) => item.name)
            .sort((first, second) => first.name.localeCompare(second.name))
            .slice(0, allCountries ? 300 : 8)
        : [];

    const leagues =
      leagueResult.status === "fulfilled" && leagueResult.value
        ? leagueResult.value.response
            .map((item) => {
              const currentSeason =
                item.seasons?.find((entry) => entry.current)?.year ??
                item.seasons?.at(-1)?.year ??
                season;

              return {
                id: item.league?.id ?? null,
                name: item.league?.name ?? "",
                type: item.league?.type ?? null,
                logo: item.league?.logo ?? null,
                country: item.country?.name ?? country ?? null,
                season: currentSeason,
              };
            })
            .filter((item) => item.id && item.name)
            .slice(0, 12)
        : [];

    const rawTeams =
      teamResult.status === "fulfilled" && teamResult.value
        ? teamResult.value.response
            .map((item) => ({
              id: item.team?.id ?? null,
              name: item.team?.name ?? "",
              country: item.team?.country ?? null,
              code: item.team?.code ?? null,
              national: item.team?.national ?? false,
              logo: item.team?.logo ?? null,
              city: item.venue?.city ?? null,
              venue: item.venue?.name ?? null,
            }))
            .filter((team) => team.id && team.name)
            .slice(0, 40)
        : [];
    const cities = [
      ...new Set(rawTeams.map((team) => team.city).filter(Boolean)),
    ].slice(0, 16);
    const teams = city
      ? rawTeams.filter((team) => team.city === city).slice(0, 16)
      : rawTeams.slice(0, 16);

    return NextResponse.json({
      ok: true,
      countries,
      leagues,
      cities,
      teams,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API-FOOTBALL team search failed",
      },
      { status: 500 }
    );
  }
}
