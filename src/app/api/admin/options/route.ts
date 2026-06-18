import { NextRequest, NextResponse } from "next/server";
import { canInsertData } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";

type Option = {
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

const STATIC_COUNTRIES: Option[] = [
  { label: "France", value: "France", meta: { code: "FR" } },
  { label: "Morocco", value: "Morocco", meta: { code: "MA" } },
  { label: "Spain", value: "Spain", meta: { code: "ES" } },
  { label: "England", value: "England", meta: { code: "GB" } },
  { label: "Germany", value: "Germany", meta: { code: "DE" } },
  { label: "Italy", value: "Italy", meta: { code: "IT" } },
  { label: "Portugal", value: "Portugal", meta: { code: "PT" } },
  { label: "Netherlands", value: "Netherlands", meta: { code: "NL" } },
  { label: "Belgium", value: "Belgium", meta: { code: "BE" } },
  { label: "Brazil", value: "Brazil", meta: { code: "BR" } },
  { label: "Argentina", value: "Argentina", meta: { code: "AR" } },
];

async function getCountryApiOptions(): Promise<Option[]> {
  try {
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,flags",
      {
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return STATIC_COUNTRIES;
    }

    const countries = (await response.json()) as Array<{
      name?: { common?: string };
      cca2?: string;
      flags?: { svg?: string; png?: string };
    }>;

    return countries
      .map((country) => ({
        label: country.name?.common ?? "",
        value: country.name?.common ?? "",
        meta: {
          code: country.cca2,
          flag: country.flags?.svg ?? country.flags?.png,
        },
      }))
      .filter((country) => country.value)
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 300);
  } catch {
    return STATIC_COUNTRIES;
  }
}

async function getMongoOptions(source: string): Promise<Option[]> {
  const db = await getMongoDb();

  const sourceConfig: Record<
    string,
    {
      collection: string;
      labelFields: string[];
      valueField: string;
      sort?: Record<string, 1 | -1>;
    }
  > = {
    countries: {
      collection: "football_countries",
      labelFields: ["name", "code"],
      valueField: "id",
      sort: { name: 1 },
    },
    "country-names": {
      collection: "football_countries",
      labelFields: ["name", "code"],
      valueField: "name",
      sort: { name: 1 },
    },
    venues: {
      collection: "football_venues",
      labelFields: ["name", "city"],
      valueField: "id",
      sort: { name: 1 },
    },
    leagues: {
      collection: "football_leagues",
      labelFields: ["name", "type"],
      valueField: "id",
      sort: { name: 1 },
    },
    teams: {
      collection: "football_teams",
      labelFields: ["name", "code"],
      valueField: "id",
      sort: { name: 1 },
    },
    fixtures: {
      collection: "football_fixtures",
      labelFields: ["id", "round", "status_short"],
      valueField: "id",
      sort: { fixture_date: -1 },
    },
    players: {
      collection: "football_players",
      labelFields: ["name", "nationality"],
      valueField: "id",
      sort: { name: 1 },
    },
  };
  const config = sourceConfig[source];

  if (!config) {
    return [];
  }

  const records = await db
    .collection(config.collection)
    .find({})
    .sort(config.sort ?? {})
    .limit(200)
    .toArray();

  return records
    .map((record) => {
      const value = record[config.valueField];
      const label = config.labelFields
        .map((field) => record[field])
        .filter((entry) => entry !== undefined && entry !== null && entry !== "")
        .join(" · ");

      return {
        label: label || String(value ?? ""),
        value: String(value ?? ""),
        meta: {
          code: record.code,
          flag: record.flag,
          name: record.name,
        },
      };
    })
    .filter((option) => option.value);
}

export async function GET(req: NextRequest) {
  if (!(await canInsertData())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const source = req.nextUrl.searchParams.get("source") ?? "";

  if (source === "country-api") {
    const mongoCountries = await getMongoOptions("country-names");
    const options =
      mongoCountries.length > 0 ? mongoCountries : await getCountryApiOptions();

    return NextResponse.json({ ok: true, source, options });
  }

  if (source === "country-names") {
    const mongoCountries = await getMongoOptions("country-names");
    const options =
      mongoCountries.length > 0 ? mongoCountries : await getCountryApiOptions();

    return NextResponse.json({ ok: true, source, options });
  }

  const options = await getMongoOptions(source);

  return NextResponse.json({ ok: true, source, options });
}

