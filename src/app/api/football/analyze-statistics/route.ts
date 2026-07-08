import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { analyzeTeamStatisticsWithGpt } from "@/lib/openai-team-analysis";
import { recordUserAction } from "@/lib/user-actions";

export async function POST(req: NextRequest) {
  const access = await getCurrentChatAccess();
  const sessionUser = await getAuthenticatedUser();

  if (!access.allowed || !sessionUser) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  try {
    const body = (await req.json()) as {
      teamAJson?: unknown;
      teamBJson?: unknown;
      promptId?: string;
    };

    if (!body.teamAJson || !body.teamBJson) {
      return NextResponse.json(
        { ok: false, error: "teamAJson and teamBJson are required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeTeamStatisticsWithGpt({
      teamAJson: body.teamAJson,
      teamBJson: body.teamBJson,
      promptId: body.promptId,
    });
    let actionId: string | null = null;
    let actionSaveError: string | null = null;

    try {
      actionId = await recordUserAction({
        user: sessionUser,
        actionType: "team_statistics_ai_analysis",
        label: "Prediction",
        payload: {
          promptId: analysis.promptId,
          promptName: analysis.promptName,
          promptPath: analysis.promptPath,
          model: analysis.model,
          outputType: "html",
          outputLength: analysis.outputText.length,
          outputHtml: analysis.outputText,
        },
      });
    } catch (error) {
      actionSaveError =
        error instanceof Error ? error.message : "Action history save failed";
    }

    return NextResponse.json({
      ok: true,
      analysis,
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
            : "Team statistics AI analysis failed",
      },
      { status: 500 }
    );
  }
}
