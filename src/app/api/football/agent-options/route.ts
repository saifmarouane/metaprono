import { NextRequest, NextResponse } from "next/server";
import { canInsertData } from "@/lib/admin-auth";
import {
  fetchApiFootballCountries,
  fetchApiFootballFixtures,
  fetchApiFootballLeagues,
  fetchApiFootballSquads,
  fetchApiFootballTeamsByCountry,
  fetchApiFootballTeamsByLeague,
  searchApiFootballCountries,
  searchApiFootballTeams,
} from "@/lib/api-football";

type ApiOption = {
  label: string;
  value: string;
  meta?: Record<string, string | number | boolean | null>;
};

function parsePositiveNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function optionLabelWithMeta(label: string, meta: Array<string | number | null | undefined>) {
  const suffix = meta
    .filter((entry) => entry !== undefined && entry !== null && entry !== "")
    .join(" · ");

  return suffix ? `${label} · ${suffix}` : label;
}

export async function GET(req: NextRequest) {
  if (!(await canInsertData())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const source = req.nextUrl.searchParams.get("source") ?? "";
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = req.nextUrl.searchParams.get("country")?.trim() ?? "";
  const leagueId = parsePositiveNumber(req.nextUrl.searchParams.get("leagueId"));
  const teamId = parsePositiveNumber(req.nextUrl.searchParams.get("teamId"));
  const season =
    parsePositiveNumber(req.nextUrl.searchParams.get("season")) ??
    new Date().getFullYear();

  try {
    if (source === "api-football-countries") {
      const data =
        q.length >= 2
          ? await searchApiFootballCountries(q)
          : await fetchApiFootballCountries();

      const options: ApiOption[] = data.response
        .map((countryItem) => ({
          label: optionLabelWithMeta(countryItem.name ?? "", [
            countryItem.code,
          ]),
          value: countryItem.name ?? "",
          meta: {
            countryName: countryItem.name ?? null,
            countryCode: countryItem.code ?? null,
            countryFlag: countryItem.flag ?? null,
          },
        }))
        .filter((option) => option.value)
        .sort((first, second) => first.label.localeCompare(second.label))
        .slice(0, q.length >= 2 ? 20 : 300);

      return NextResponse.json({ ok: true, options });
    }

    if (source === "api-football-leagues") {
      if (q.length < 2 && !country) {
        return NextResponse.json({ ok: true, options: [] });
      }

      const data = await fetchApiFootballLeagues({
        country: country || undefined,
        search: country ? undefined : q,
        season,
      });

      const options: ApiOption[] = data.response
        .map((item) => {
          const currentSeason =
            item.seasons?.find((entry) => entry.current)?.year ??
            item.seasons?.at(-1)?.year ??
            season;
          const leagueId = item.league?.id;
          const name = item.league?.name ?? "";

          return {
            label: optionLabelWithMeta(name, [
              item.country?.name,
              currentSeason,
              item.league?.type,
            ]),
            value: leagueId ? String(leagueId) : "",
            meta: {
              leagueId: leagueId ?? null,
              leagueName: name || null,
              leagueLogo: item.league?.logo ?? null,
              leagueCountry: item.country?.name ?? null,
              countryFlag: item.country?.flag ?? null,
              season: currentSeason ?? null,
            },
          };
        })
        .filter((option) => option.value)
        .slice(0, 30);

      return NextResponse.json({ ok: true, options });
    }

    if (source === "api-football-teams") {
      if (q.length < 2 && !country && !leagueId) {
        return NextResponse.json({ ok: true, options: [] });
      }

      const data = leagueId
        ? await fetchApiFootballTeamsByLeague({ league: leagueId, season })
        : country
          ? await fetchApiFootballTeamsByCountry(country)
          : await searchApiFootballTeams(q);

      const options: ApiOption[] = data.response
        .map((item) => {
          const teamId = item.team?.id;
          const name = item.team?.name ?? "";

          return {
            label: optionLabelWithMeta(name, [
              item.team?.country,
              item.venue?.city,
            ]),
            value: teamId ? String(teamId) : "",
            meta: {
              teamId: teamId ?? null,
              teamName: name || null,
              teamLogo: item.team?.logo ?? null,
              teamCountry: item.team?.country ?? null,
              venueId: item.venue?.id ?? null,
              venueName: item.venue?.name ?? null,
              venueCity: item.venue?.city ?? null,
            },
          };
        })
        .filter((option) => option.value)
        .slice(0, 30);

      return NextResponse.json({ ok: true, options });
    }

    if (source === "api-football-fixtures") {
      if (!leagueId || !season) {
        return NextResponse.json({ ok: true, options: [] });
      }

      const data = await fetchApiFootballFixtures({
        league: leagueId,
        season,
        team: teamId,
      });

      const options: ApiOption[] = data.response
        .map((item) => {
          const fixtureId = item.fixture?.id;
          const home = item.teams?.home;
          const away = item.teams?.away;
          const date = item.fixture?.date ?? "";
          const dateLabel = date
            ? new Date(date).toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "";

          return {
            label: optionLabelWithMeta(
              `${home?.name ?? "Domicile"} vs ${away?.name ?? "Exterieur"}`,
              [dateLabel, item.fixture?.status?.short]
            ),
            value: fixtureId ? String(fixtureId) : "",
            meta: {
              fixtureId: fixtureId ?? null,
              leagueId: item.league?.id ?? null,
              leagueName: item.league?.name ?? null,
              leagueCountry: item.league?.country ?? null,
              leagueLogo: item.league?.logo ?? null,
              season: item.league?.season ?? season,
              round: item.league?.round ?? null,
              homeTeamId: home?.id ?? null,
              homeTeamName: home?.name ?? null,
              homeTeamLogo: home?.logo ?? null,
              awayTeamId: away?.id ?? null,
              awayTeamName: away?.name ?? null,
              awayTeamLogo: away?.logo ?? null,
              venueId: item.fixture?.venue?.id ?? null,
              venueName: item.fixture?.venue?.name ?? null,
              venueCity: item.fixture?.venue?.city ?? null,
              timezone: item.fixture?.timezone ?? null,
              fixtureDate: date || null,
              statusShort: item.fixture?.status?.short ?? null,
              goalsHome: item.goals?.home ?? null,
              goalsAway: item.goals?.away ?? null,
            },
          };
        })
        .filter((option) => option.value)
        .slice(0, 80);

      return NextResponse.json({ ok: true, options });
    }

    if (source === "api-football-players") {
      if (!teamId) {
        return NextResponse.json({ ok: true, options: [] });
      }

      const data = await fetchApiFootballSquads(teamId);
      const players = data.response.flatMap((squad) => squad.players ?? []);
      const options: ApiOption[] = players
        .filter((player) =>
          q.length >= 2
            ? (player.name ?? "").toLowerCase().includes(q.toLowerCase())
            : true
        )
        .map((player) => ({
          label: optionLabelWithMeta(player.name ?? "", [
            player.position,
            player.age,
          ]),
          value: player.id ? String(player.id) : "",
          meta: {
            playerId: player.id ?? null,
            playerName: player.name ?? null,
            playerPhoto: player.photo ?? null,
            playerPosition: player.position ?? null,
          },
        }))
        .filter((option) => option.value)
        .slice(0, 40);

      return NextResponse.json({ ok: true, options });
    }

    return NextResponse.json({ ok: true, options: [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API-FOOTBALL options request failed",
      },
      { status: 500 }
    );
  }
}
