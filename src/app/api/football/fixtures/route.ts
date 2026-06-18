import { NextRequest, NextResponse } from "next/server";
import { canInsertData } from "@/lib/admin-auth";
import { fetchApiFootballFixtures } from "@/lib/api-football";

function parsePositiveNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  if (!(await canInsertData())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const league = parsePositiveNumber(req.nextUrl.searchParams.get("league"));
  const season = parsePositiveNumber(req.nextUrl.searchParams.get("season"));
  const team = parsePositiveNumber(req.nextUrl.searchParams.get("team"));
  const next = parsePositiveNumber(req.nextUrl.searchParams.get("next"));
  const last = parsePositiveNumber(req.nextUrl.searchParams.get("last"));

  if (!league || !season) {
    return NextResponse.json(
      { ok: false, error: "league and season are required" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchApiFootballFixtures({
      league,
      season,
      team,
      next,
      last,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API-FOOTBALL request failed",
      },
      { status: 500 }
    );
  }
}
