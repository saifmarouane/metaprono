import { MongoClient, ServerApiVersion, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "aura_sadaqa";

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

const client =
  globalForMongo._mongoClientPromise ??
  new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = client;
}

export async function getMongoClient(): Promise<MongoClient> {
  return client;
}

export async function getMongoDb(): Promise<Db> {
  const mongoClient = await getMongoClient();
  return mongoClient.db(dbName);
}

