import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  validateCredentials,
} from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const user = validateCredentials(email, password);
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "invalid");
    loginUrl.searchParams.set("next", next);

    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const targetPath =
    user.role === "agent" && next.startsWith("/admin")
      ? "/agent"
      : next || (user.role === "admin" ? "/admin" : "/agent");
  const response = NextResponse.redirect(new URL(targetPath, req.url), {
    status: 303,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
