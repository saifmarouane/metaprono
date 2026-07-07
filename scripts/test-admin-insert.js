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

async function request(url, options = {}, cookie = "") {
  const response = await fetch(url, {
    ...options,
    redirect: "manual",
    headers: {
      ...(options.headers ?? {}),
      ...(cookie ? { cookie } : {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");
  const body = await response.text();

  return {
    status: response.status,
    setCookie,
    cookie: setCookie?.split(";")[0] ?? cookie,
    body,
  };
}

async function main() {
  const baseUrl = "http://localhost:3000";
  const testId = Date.now();
  const loginForm = new URLSearchParams({
    email: "admin@metapronostic.local",
    password: "MetaPronostic2026!",
    next: "/admin",
  });
  const login = await request(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: loginForm,
  });

  const insertPayload = {
    collection: "football_fixtures",
    document: JSON.stringify({
      id: testId,
      league_id: 61,
      league_name: "Admin Test League",
      season: 2026,
      home_team_id: 2001,
      home_team_name: `Admin Home ${testId}`,
      away_team_id: 2002,
      away_team_name: `Admin Away ${testId}`,
      fixture_date: "2026-01-18T20:45:00.000Z",
      status_short: "NS",
      home_scorers: "Admin Home Scorer, Admin Second Scorer",
      away_scorers: "Admin Away Scorer",
    }),
  };
  const insert = await request(
    `${baseUrl}/api/admin/insert`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(insertPayload),
    },
    login.cookie
  );
  const insertBody = JSON.parse(insert.body);

  const client = new MongoClient(readMongoUri());
  await client.connect();
  const found = await client
    .db("aura_sadaqa")
    .collection("football_fixtures")
    .findOne({ id: testId });
  await client
    .db("aura_sadaqa")
    .collection("football_fixtures")
    .deleteOne({ id: testId });
  await client.close();

  const result = {
    ok:
      login.status === 303 &&
      insert.status === 200 &&
      insertBody.ok === true &&
      Boolean(found),
    loginStatus: login.status,
    insertStatus: insert.status,
    insertedCount: insertBody.insertedCount,
    found: Boolean(found),
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
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
