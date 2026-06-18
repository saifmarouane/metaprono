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

async function upsertMany(db, collectionName, records) {
  const collection = db.collection(collectionName);

  for (const record of records) {
    await collection.updateOne(
      { id: record.id },
      {
        $set: {
          ...record,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true }
    );
  }
}

async function main() {
  const client = new MongoClient(readMongoUri());

  try {
    await client.connect();
    const db = client.db("aura_sadaqa");

    await upsertMany(db, "football_countries", [
      { id: 1, name: "France", code: "FR", flag: "https://example.com/fr.svg" },
    ]);

    await upsertMany(db, "football_leagues", [
      {
        id: 61,
        country_id: 1,
        name: "Ligue 1",
        type: "League",
        logo: "https://example.com/ligue-1.png",
      },
    ]);

    await upsertMany(db, "football_venues", [
      {
        id: 671,
        name: "Parc des Princes",
        city: "Paris",
        country: "France",
        capacity: 47929,
        surface: "grass",
      },
      {
        id: 680,
        name: "Orange Velodrome",
        city: "Marseille",
        country: "France",
        capacity: 67394,
        surface: "grass",
      },
    ]);

    await upsertMany(db, "football_teams", [
      {
        id: 85,
        venue_id: 671,
        country_id: 1,
        name: "Paris Saint Germain",
        code: "PSG",
        country_name: "France",
        founded: 1970,
        national: false,
      },
      {
        id: 81,
        venue_id: 680,
        country_id: 1,
        name: "Marseille",
        code: "OM",
        country_name: "France",
        founded: 1899,
        national: false,
      },
    ]);

    await upsertMany(db, "football_fixtures", [
      {
        id: 1200001,
        league_id: 61,
        season: 2025,
        round: "Regular Season - 1",
        home_team_id: 85,
        away_team_id: 81,
        venue_id: 671,
        referee: "Clement Turpin",
        timezone: "Africa/Casablanca",
        fixture_date: new Date("2026-01-18T20:45:00.000Z"),
        venue_name: "Parc des Princes",
        venue_city: "Paris",
        status_long: "Match Finished",
        status_short: "FT",
        elapsed: 90,
        home_winner: true,
        away_winner: false,
        goals_home: 2,
        goals_away: 1,
        halftime_home: 1,
        halftime_away: 0,
        fulltime_home: 2,
        fulltime_away: 1,
        standings_available: true,
      },
    ]);

    await upsertMany(db, "football_fixture_events", [
      {
        id: 900001,
        fixture_id: 1200001,
        team_id: 85,
        team_name: "Paris Saint Germain",
        player_id: 276,
        player_name: "Example Striker",
        assist_player_id: 277,
        assist_player_name: "Example Playmaker",
        elapsed: 23,
        extra_time: null,
        event_type: "Goal",
        event_detail: "Normal Goal",
        comments: null,
        sort_order: 1,
      },
      {
        id: 900002,
        fixture_id: 1200001,
        team_id: 81,
        team_name: "Marseille",
        player_id: 310,
        player_name: "OM Forward",
        assist_player_id: null,
        assist_player_name: null,
        elapsed: 64,
        extra_time: null,
        event_type: "Goal",
        event_detail: "Penalty",
        comments: null,
        sort_order: 2,
      },
    ]);

    await upsertMany(db, "football_players", [
      {
        id: 276,
        name: "Example Striker",
        firstname: "Example",
        lastname: "Striker",
        age: 26,
        nationality: "France",
        height: "184 cm",
        weight: "78 kg",
      },
      {
        id: 310,
        name: "OM Forward",
        firstname: "OM",
        lastname: "Forward",
        age: 28,
        nationality: "France",
        height: "181 cm",
        weight: "76 kg",
      },
    ]);

    await upsertMany(db, "football_player_statistics", [
      {
        id: 700001,
        player_id: 276,
        team_id: 85,
        league_id: 61,
        season: 2025,
        appearances: 20,
        lineups: 19,
        minutes: 1710,
        position: "Attacker",
        rating: 7.82,
        goals_total: 15,
        assists: 6,
      },
      {
        id: 700002,
        player_id: 310,
        team_id: 81,
        league_id: 61,
        season: 2025,
        appearances: 20,
        lineups: 18,
        minutes: 1600,
        position: "Attacker",
        rating: 7.21,
        goals_total: 11,
        assists: 4,
      },
    ]);

    await upsertMany(db, "football_standings", [
      {
        id: 100001,
        league_id: 61,
        season: 2025,
        team_id: 85,
        group_name: "Ligue 1",
        rank: 1,
        points: 62,
        goals_diff: 35,
        form: "WWDWW",
        status: "same",
        description: "Champions League",
        all_played: 28,
        all_win: 19,
        all_draw: 5,
        all_lose: 4,
        all_goals_for: 65,
        all_goals_against: 30,
      },
      {
        id: 100002,
        league_id: 61,
        season: 2025,
        team_id: 81,
        group_name: "Ligue 1",
        rank: 2,
        points: 58,
        goals_diff: 24,
        form: "WDWWW",
        status: "up",
        description: "Champions League Qualification",
        all_played: 28,
        all_win: 18,
        all_draw: 4,
        all_lose: 6,
        all_goals_for: 54,
        all_goals_against: 30,
      },
    ]);

    await upsertMany(db, "football_injuries", [
      {
        id: 110001,
        fixture_id: 1200001,
        league_id: 61,
        season: 2025,
        team_id: 85,
        player_id: 278,
        player_name: "PSG Defender",
        injury_type: "Missing Fixture",
        reason: "Hamstring Injury",
        fixture_date: new Date("2026-01-18T20:45:00.000Z"),
      },
    ]);

    await upsertMany(db, "football_odds", [
      {
        id: 120001,
        fixture_id: 1200001,
        league_id: 61,
        season: 2025,
        bookmaker_id: 1,
        bookmaker_name: "ExampleBook",
        bet_id: 1,
        bet_name: "Match Winner",
        bet_value: "Home",
        odd: 1.85,
        odd_raw: "1.85",
        is_live: false,
      },
    ]);

    const collections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    console.log(
      JSON.stringify({
        ok: true,
        database: db.databaseName,
        collections: collections.map((collection) => collection.name).sort(),
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

