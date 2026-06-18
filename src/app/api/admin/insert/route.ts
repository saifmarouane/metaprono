import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import { canInsertData } from "@/lib/admin-auth";
import { FOOTBALL_COLLECTION_NAMES } from "@/lib/football-collection-guides";

function addTimestamps(document: Record<string, unknown>) {
  const now = new Date();

  return {
    ...document,
    created_at: document.created_at ?? now,
    updated_at: now,
  };
}

export async function POST(req: NextRequest) {
  if (!(await canInsertData())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const collection = String(body.collection ?? "");
  const rawDocument = String(body.document ?? "");

  if (!FOOTBALL_COLLECTION_NAMES.includes(collection)) {
    return NextResponse.json(
      { ok: false, error: "Collection is not allowed" },
      { status: 400 }
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
