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

const deletes = [
  ["football_countries", { id: { $in: [1] } }],
  ["football_leagues", { id: { $in: [61] } }],
  ["football_venues", { id: { $in: [671, 680] } }],
  ["football_teams", { id: { $in: [81, 85] } }],
  ["football_fixtures", { id: { $in: [1200001] } }],
  ["football_fixture_events", { id: { $in: [900001, 900002] } }],
  ["football_players", { id: { $in: [276, 310] } }],
  ["football_player_statistics", { id: { $in: [700001, 700002] } }],
  ["football_standings", { id: { $in: [100001, 100002] } }],
  ["football_injuries", { id: { $in: [110001] } }],
  ["football_odds", { id: { $in: [120001] } }],
];

async function main() {
  const client = new MongoClient(readMongoUri());

  try {
    await client.connect();
    const db = client.db("aura_sadaqa");
    const results = [];

    for (const [collectionName, filter] of deletes) {
      const result = await db.collection(collectionName).deleteMany(filter);
      results.push({
        collection: collectionName,
        deletedCount: result.deletedCount,
      });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          totalDeleted: results.reduce(
            (sum, result) => sum + result.deletedCount,
            0
          ),
          results,
        },
        null,
        2
      )
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

