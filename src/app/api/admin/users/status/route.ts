import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  type ChatUserStatus,
  updateChatUserStatus,
} from "@/lib/chat-users";

const ALLOWED_STATUSES: ChatUserStatus[] = ["pending", "active", "blocked"];

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    userId?: string;
    status?: ChatUserStatus;
  };

  if (
    !body.userId ||
    !body.status ||
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await updateChatUserStatus(body.userId, body.status);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
