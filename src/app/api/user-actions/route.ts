import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { listUserActions, type UserActionType } from "@/lib/user-actions";

const ALLOWED_ACTION_TYPES: UserActionType[] = [
  "football_prediction",
  "team_statistics",
  "team_statistics_ai_analysis",
];

function parseLimit(value: string | null): number {
  if (!value) {
    return 20;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 20;
}

export async function GET(req: NextRequest) {
  const access = await getCurrentChatAccess();
  const user = await getAuthenticatedUser();

  if (!access.allowed || !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  try {
    const actionType = req.nextUrl.searchParams.get("actionType");
    const actions = await listUserActions({
      user,
      limit: parseLimit(req.nextUrl.searchParams.get("limit")),
      actionType: ALLOWED_ACTION_TYPES.includes(actionType as UserActionType)
        ? (actionType as UserActionType)
        : undefined,
    });

    return NextResponse.json({
      ok: true,
      actions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "User action history request failed",
      },
      { status: 500 }
    );
  }
}
