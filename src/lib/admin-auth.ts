import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "metapronostic_admin_session";
export type AuthRole = "admin" | "agent";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_SECONDS;

type AuthUser = {
  email: string;
  role: AuthRole;
};

type SessionPayload = AuthUser & {
  issuedAt: number;
};

function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error("ADMIN_EMAIL is not set");
  }
  return email;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return password;
}

function getAgentEmail(): string {
  const email = process.env.AGENT_EMAIL;
  if (!email) {
    throw new Error("AGENT_EMAIL is not set");
  }
  return email;
}

function getAgentPassword(): string {
  const password = process.env.AGENT_PASSWORD;
  if (!password) {
    throw new Error("AGENT_PASSWORD is not set");
  }
  return password;
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return secret;
}

function signSession(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;

    if (
      typeof decoded.email !== "string" ||
      typeof decoded.issuedAt !== "number" ||
      (decoded.role !== "admin" && decoded.role !== "agent")
    ) {
      return null;
    }

    return {
      email: decoded.email,
      role: decoded.role,
      issuedAt: decoded.issuedAt,
    };
  } catch {
    return null;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function validateAdminCredentials(email: string, password: string): boolean {
  return (
    safeEqual(email, getAdminEmail()) &&
    safeEqual(password, getAdminPassword())
  );
}

export function validateCredentials(
  email: string,
  password: string
): AuthUser | null {
  if (
    safeEqual(email, getAdminEmail()) &&
    safeEqual(password, getAdminPassword())
  ) {
    return { email: getAdminEmail(), role: "admin" };
  }

  if (
    safeEqual(email, getAgentEmail()) &&
    safeEqual(password, getAgentPassword())
  ) {
    return { email: getAgentEmail(), role: "agent" };
  }

  return null;
}

export function createSessionValue(user: AuthUser): string {
  const payload = encodePayload({
    email: user.email,
    role: user.role,
    issuedAt: Date.now(),
  });
  const signature = signSession(payload);

  return `${payload}.${signature}`;
}

export function createAdminSessionValue(): string {
  return createSessionValue({ email: getAdminEmail(), role: "admin" });
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!session) {
    return null;
  }

  const parts = session.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSession(payload);
  const decodedPayload = decodePayload(payload);
  if (!decodedPayload) {
    return null;
  }

  const isExpired =
    Date.now() - decodedPayload.issuedAt > SESSION_MAX_AGE_SECONDS * 1000;

  if (isExpired || !safeEqual(signature, expectedSignature)) {
    return null;
  }

  if (
    decodedPayload.role === "admin" &&
    safeEqual(decodedPayload.email, getAdminEmail())
  ) {
    return { email: decodedPayload.email, role: "admin" };
  }

  if (
    decodedPayload.role === "agent" &&
    safeEqual(decodedPayload.email, getAgentEmail())
  ) {
    return { email: decodedPayload.email, role: "agent" };
  }

  return null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.role === "admin";
}

export async function canInsertData(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.role === "admin" || user?.role === "agent";
}
