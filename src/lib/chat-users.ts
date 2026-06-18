import {
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/admin-auth";

export const CHAT_USERS_COLLECTION = "app_users";

export type ChatUserStatus = "pending" | "active" | "blocked";

export type ChatUser = {
  _id?: ObjectId;
  id?: string;
  name: string;
  email: string;
  role: "user";
  status: ChatUserStatus;
  passwordHash?: string;
  passwordSalt?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
};

export type PublicChatUser = {
  id: string;
  name: string;
  email: string;
  role: "user";
  status: ChatUserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

type LoginResult =
  | { ok: true; user: PublicChatUser }
  | { ok: false; reason: "invalid" | "pending" | "blocked"; user?: PublicChatUser };

const HASH_ITERATIONS = 120_000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = "sha512";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_DIGEST
  ).toString("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function serializeChatUser(user: ChatUser): PublicChatUser {
  const id = user.id ?? user._id?.toString() ?? "";

  return {
    id,
    name: user.name,
    email: user.email,
    role: "user",
    status: user.status,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
    last_login_at: user.last_login_at?.toISOString() ?? null,
  };
}

async function getUsersCollection() {
  const db = await getMongoDb();
  const collection = db.collection<ChatUser>(CHAT_USERS_COLLECTION);
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex({ status: 1 });
  return collection;
}

export async function registerChatUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true; user: PublicChatUser } | { ok: false; reason: "exists" }> {
  const collection = await getUsersCollection();
  const email = normalizeEmail(input.email);
  const existing = await collection.findOne({ email });

  if (existing) {
    return { ok: false, reason: "exists" };
  }

  const now = new Date();
  const passwordSalt = randomBytes(16).toString("hex");
  const user: ChatUser = {
    name: input.name.trim(),
    email,
    role: "user",
    status: "pending",
    passwordSalt,
    passwordHash: hashPassword(input.password, passwordSalt),
    created_at: now,
    updated_at: now,
  };

  const result = await collection.insertOne(user);

  return {
    ok: true,
    user: serializeChatUser({ ...user, _id: result.insertedId }),
  };
}

export async function validateChatUserCredentials(
  emailInput: string,
  password: string
): Promise<LoginResult> {
  const collection = await getUsersCollection();
  const email = normalizeEmail(emailInput);
  const user = await collection.findOne({ email });

  if (!user?.passwordHash || !user.passwordSalt) {
    return { ok: false, reason: "invalid" };
  }

  const passwordHash = hashPassword(password, user.passwordSalt);
  if (!safeEqual(passwordHash, user.passwordHash)) {
    return { ok: false, reason: "invalid" };
  }

  const publicUser = serializeChatUser(user);
  if (user.status === "pending") {
    return { ok: false, reason: "pending", user: publicUser };
  }

  if (user.status === "blocked") {
    return { ok: false, reason: "blocked", user: publicUser };
  }

  await collection.updateOne(
    { _id: user._id },
    { $set: { last_login_at: new Date(), updated_at: new Date() } }
  );

  return { ok: true, user: publicUser };
}

export async function listChatUsers(): Promise<PublicChatUser[]> {
  const collection = await getUsersCollection();
  const users = await collection
    .find({})
    .sort({ created_at: -1 })
    .limit(200)
    .toArray();

  return users.map(serializeChatUser);
}

export async function updateChatUserStatus(
  userId: string,
  status: ChatUserStatus
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) {
    return false;
  }

  const collection = await getUsersCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { status, updated_at: new Date() } }
  );

  return result.matchedCount === 1;
}

export async function getCurrentChatAccess(): Promise<{
  allowed: boolean;
  status: 401 | 403 | 200;
  redirectTo: string;
  reason: "unauthenticated" | "pending" | "blocked" | "agent" | "active";
  user?: PublicChatUser;
}> {
  const sessionUser = await getAuthenticatedUser();

  if (!sessionUser) {
    return {
      allowed: false,
      status: 401,
      redirectTo: "/login?next=/Dashboard",
      reason: "unauthenticated",
    };
  }

  if (sessionUser.role === "admin") {
    return {
      allowed: true,
      status: 200,
      redirectTo: "/Dashboard",
      reason: "active",
    };
  }

  if (sessionUser.role === "agent") {
    return {
      allowed: false,
      status: 403,
      redirectTo: "/agent",
      reason: "agent",
    };
  }

  if (!sessionUser.userId || !ObjectId.isValid(sessionUser.userId)) {
    return {
      allowed: false,
      status: 401,
      redirectTo: "/login?next=/Dashboard",
      reason: "unauthenticated",
    };
  }

  const collection = await getUsersCollection();
  const user = await collection.findOne({ _id: new ObjectId(sessionUser.userId) });

  if (!user || user.email !== sessionUser.email) {
    return {
      allowed: false,
      status: 401,
      redirectTo: "/login?next=/Dashboard",
      reason: "unauthenticated",
    };
  }

  if (user.status === "blocked") {
    return {
      allowed: false,
      status: 403,
      redirectTo: "/access-blocked",
      reason: "blocked",
      user: serializeChatUser(user),
    };
  }

  if (user.status === "pending") {
    return {
      allowed: false,
      status: 403,
      redirectTo: "/pending-approval",
      reason: "pending",
      user: serializeChatUser(user),
    };
  }

  return {
    allowed: true,
    status: 200,
    redirectTo: "/Dashboard",
    reason: "active",
    user: serializeChatUser(user),
  };
}
