import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionValue,
} from "@/lib/admin-auth";
import { validateChatUserCredentials } from "@/lib/chat-users";

function safeNextPath(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/Dashboard";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/Dashboard"));

  const result = await validateChatUserCredentials(email, password);
  if (!result.ok) {
    const target =
      result.reason === "pending"
        ? "/pending-approval"
        : result.reason === "blocked"
          ? "/access-blocked"
          : "/login";
    const url = new URL(target, req.url);

    if (result.reason === "invalid") {
      url.searchParams.set("error", "invalid");
      url.searchParams.set("next", next);
    }

    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, req.url), {
    status: 303,
  });

  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createSessionValue({
      email: result.user.email,
      role: "user",
      userId: result.user.id,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    }
  );

  return response;
}
