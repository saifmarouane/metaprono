import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import {
  AGENT_INSERT_COLLECTION_NAMES,
  MANUAL_INSERT_COLLECTION_NAMES,
} from "@/lib/football-collection-guides";

function addTimestamps(document: Record<string, unknown>) {
  const now = new Date();

  return {
    ...document,
    created_at: document.created_at ?? now,
    updated_at: now,
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user || (user.role !== "admin" && user.role !== "agent")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const collection = String(body.collection ?? "");
  const rawDocument = String(body.document ?? "");

  if (!MANUAL_INSERT_COLLECTION_NAMES.includes(collection)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Collection is reserved for API-FOOTBALL reference data and cannot be inserted manually",
      },
      { status: user.role === "agent" ? 403 : 400 }
    );
  }

  if (
    user.role === "agent" &&
    !AGENT_INSERT_COLLECTION_NAMES.includes(collection)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Collection is reserved for API-FOOTBALL reference data and cannot be inserted manually by an agent",
      },
      { status: 403 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawDocument);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON document" },
      { status: 400 }
    );
  }

  const documents = Array.isArray(parsed) ? parsed : [parsed];

  if (
    documents.length === 0 ||
    documents.some(
      (document) =>
        !document || Array.isArray(document) || typeof document !== "object"
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "JSON must be an object or an array of objects" },
      { status: 400 }
    );
  }

  const db = await getMongoDb();
  const normalizedDocuments = documents.map((document) =>
    addTimestamps(document as Record<string, unknown>)
  );
  const result = await db.collection(collection).insertMany(normalizedDocuments);

  return NextResponse.json({
    ok: true,
    collection,
    insertedCount: result.insertedCount,
    insertedIds: Object.values(result.insertedIds).map((id) => id.toString()),
  });
}
