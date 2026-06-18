const fs = require("node:fs");
const { MongoClient } = require("mongodb");

function readMongoUri() {
  const env = fs.readFileSync(".env", "utf8");
  const line = env
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("MONGODB_URI="));

  if (!line) {
    throw new Error("MONGODB_URI missing");
  }

  return line.slice("MONGODB_URI=".length).replace(/^"|"$/g, "");
}

async function main() {
  const client = new MongoClient(readMongoUri());

  try {
    await client.connect();
    const db = client.db();
    const ping = await db.command({ ping: 1 });
    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    console.log(
      JSON.stringify({
        ok: true,
        ping: ping.ok,
        database: db.databaseName,
        collections: collections.map((collection) => collection.name),
      })
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  );
  process.exitCode = 1;
});

