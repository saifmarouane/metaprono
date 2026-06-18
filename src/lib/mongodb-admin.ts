import { getMongoDb } from "@/lib/mongodb";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function serializeMongoValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeMongoValue);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (
      "_bsontype" in record &&
      typeof record.toString === "function"
    ) {
      return record.toString();
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, entryValue]) => [
        key,
        serializeMongoValue(entryValue),
      ])
    );
  }

  return value;
}

export type MongoCollectionOverview = {
  name: string;
  count: number;
};

export type MongoAdminSnapshot = {
  database: string;
  collections: MongoCollectionOverview[];
  selectedCollection: string | null;
  documents: Record<string, unknown>[];
  limit: number;
};

export async function getMongoAdminSnapshot(
  requestedCollection?: string,
  requestedLimit?: number
): Promise<MongoAdminSnapshot> {
  const db = await getMongoDb();
  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const collectionNames = collections
    .map((collection) => collection.name)
    .sort((a, b) => a.localeCompare(b));

  const collectionCounts = await Promise.all(
    collectionNames.map(async (name) => ({
      name,
      count: await db.collection(name).estimatedDocumentCount(),
    }))
  );

  const selectedCollection =
    requestedCollection && collectionNames.includes(requestedCollection)
      ? requestedCollection
      : collectionNames[0] ?? null;

  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit ?? DEFAULT_LIMIT : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  const documents = selectedCollection
    ? await db
        .collection(selectedCollection)
        .find({})
        .limit(limit)
        .toArray()
    : [];

  return {
    database: db.databaseName,
    collections: collectionCounts,
    selectedCollection,
    documents: documents.map((document) =>
      serializeMongoValue(document)
    ) as Record<string, unknown>[],
    limit,
  };
}

