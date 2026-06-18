import { NextRequest, NextResponse } from "next/server";
import { registerChatUser } from "@/lib/chat-users";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "invalid-register");
    return NextResponse.redirect(url, { status: 303 });
  }

  const result = await registerChatUser({ name, email, password });
  if (!result.ok) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "exists");
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.redirect(new URL("/pending-approval", req.url), {
    status: 303,
  });
}
