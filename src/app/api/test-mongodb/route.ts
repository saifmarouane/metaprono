import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getMongoDb();
    const ping = await db.command({ ping: 1 });
    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    return NextResponse.json({
      ok: true,
      database: db.databaseName,
      ping,
      collections: collections.map((collection) => collection.name),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown MongoDB error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

