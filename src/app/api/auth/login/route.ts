import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  validateCredentials,
} from "@/lib/admin-auth";
import { validateChatUserCredentials } from "@/lib/chat-users";

function safeNextPath(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/Dashboard";
}

function getRoleTargetPath(role: "admin" | "agent", next: string): string {
  if (!next || next === "/Dashboard") {
    return role === "admin" ? "/admin" : "/agent";
  }

  if (role === "agent" && next.startsWith("/admin")) {
    return "/agent";
  }

  return next;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/Dashboard"));

  const user = validateCredentials(email, password);
  if (user && (user.role === "admin" || user.role === "agent")) {
    const response = NextResponse.redirect(
      new URL(getRoleTargetPath(user.role, next), req.url),
      { status: 303 }
    );

    response.cookies.set(ADMIN_SESSION_COOKIE, createSessionValue(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  }

  const chatUser = await validateChatUserCredentials(email, password);
  if (!chatUser.ok) {
    const target =
      chatUser.reason === "pending"
        ? "/pending-approval"
        : chatUser.reason === "blocked"
          ? "/access-blocked"
          : "/login";
    const loginUrl = new URL(target, req.url);

    if (chatUser.reason === "invalid") {
      loginUrl.searchParams.set("error", "invalid");
      loginUrl.searchParams.set("next", next);
    }

    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(next, req.url), {
    status: 303,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionValue({
    email: chatUser.user.email,
    role: "user",
    userId: chatUser.user.id,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
