import { getMongoDb } from "@/lib/mongodb";
import type { AuthUser } from "@/lib/admin-auth";

export const USER_ACTIONS_COLLECTION = "user_actions";

export type UserActionType =
  | "football_prediction"
  | "team_statistics"
  | "team_statistics_ai_analysis";

export type UserAction = {
  userId: string;
  userEmail: string;
  userRole: AuthUser["role"];
  actionType: UserActionType;
  label: string;
  payload: unknown;
  createdAt: Date;
};

export type PublicUserAction = Omit<UserAction, "createdAt"> & {
  id: string;
  createdAt: string;
};

export function getActionUserId(user: AuthUser): string {
  if (user.role === "user" && user.userId) {
    return user.userId;
  }

  return `${user.role}:${user.email}`;
}

async function getUserActionsCollection() {
  const db = await getMongoDb();
  const collection = db.collection<UserAction>(USER_ACTIONS_COLLECTION);

  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.createIndex({ actionType: 1, createdAt: -1 });

  return collection;
}

export async function recordUserAction(input: {
  user: AuthUser;
  actionType: UserActionType;
  label: string;
  payload: unknown;
}): Promise<string> {
  const collection = await getUserActionsCollection();
  const result = await collection.insertOne({
    userId: getActionUserId(input.user),
    userEmail: input.user.email,
    userRole: input.user.role,
    actionType: input.actionType,
    label: input.label,
    payload: input.payload,
    createdAt: new Date(),
  });

  return result.insertedId.toString();
}

export async function listUserActions(input: {
  user: AuthUser;
  limit?: number;
  actionType?: UserActionType;
}): Promise<PublicUserAction[]> {
  const collection = await getUserActionsCollection();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const query: {
    userId: string;
    actionType?: UserActionType;
  } = {
    userId: getActionUserId(input.user),
  };

  if (input.actionType) {
    query.actionType = input.actionType;
  }

  const actions = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return actions.map((action) => ({
    id: action._id?.toString() ?? "",
    userId: action.userId,
    userEmail: action.userEmail,
    userRole: action.userRole,
    actionType: action.actionType,
    label: action.label,
    payload: action.payload,
    createdAt: action.createdAt.toISOString(),
  }));
}

export async function listAllUserActions(input: {
  limit?: number;
  actionType?: UserActionType;
  userId?: string;
} = {}): Promise<PublicUserAction[]> {
  const collection = await getUserActionsCollection();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const query: {
    actionType?: UserActionType;
    userId?: string;
  } = {};

  if (input.actionType) {
    query.actionType = input.actionType;
  }

  if (input.userId) {
    query.userId = input.userId;
  }

  const actions = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return actions.map((action) => ({
    id: action._id?.toString() ?? "",
    userId: action.userId,
    userEmail: action.userEmail,
    userRole: action.userRole,
    actionType: action.actionType,
    label: action.label,
    payload: action.payload,
    createdAt: action.createdAt.toISOString(),
  }));
}
