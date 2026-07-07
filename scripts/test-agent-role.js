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
    location: response.headers.get("location"),
    setCookie,
    cookie: setCookie?.split(";")[0] ?? cookie,
    body,
  };
}

async function main() {
  const baseUrl = "http://localhost:3000";
  const testId = Date.now();
  const loginForm = new URLSearchParams({
    email: "agent@metapronostic.local",
    password: "AgentMeta2026!",
    next: "/agent",
  });
  const login = await request(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: loginForm,
  });
  const agentPage = await request(`${baseUrl}/agent`, {}, login.cookie);
  const adminPage = await request(`${baseUrl}/admin`, {}, login.cookie);
  const insertPayload = {
    collection: "football_fixtures",
    document: JSON.stringify({
      id: testId,
      league_id: 61,
      league_name: "Agent Test League",
      season: 2026,
      home_team_id: 1001,
      home_team_name: `Agent Home ${testId}`,
      away_team_id: 1002,
      away_team_name: `Agent Away ${testId}`,
      fixture_date: "2026-01-18T20:45:00.000Z",
      status_short: "NS",
      home_scorers: "Agent Home Scorer, Agent Second Scorer",
      away_scorers: "Agent Away Scorer",
    }),
  };
  const blockedReferencePayload = {
    collection: "football_teams",
    document: JSON.stringify({
      id: testId,
      name: `Agent Blocked Reference ${testId}`,
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
  const blockedReferenceInsert = await request(
    `${baseUrl}/api/admin/insert`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(blockedReferencePayload),
    },
    login.cookie
  );
  const insertBody = JSON.parse(insert.body);

  const client = new MongoClient(readMongoUri());
  await client.connect();
  const collection = client.db("aura_sadaqa").collection("football_fixtures");
  const found = await collection.findOne({ id: testId });
  await collection.deleteOne({ id: testId });
  await client.close();

  const result = {
    ok:
      login.status === 303 &&
      agentPage.status === 200 &&
      agentPage.body.includes("MetaPronostic Agent") &&
      [303, 307, 308].includes(adminPage.status) &&
      insert.status === 200 &&
      insertBody.ok === true &&
      blockedReferenceInsert.status === 403 &&
      Boolean(found),
    login: {
      status: login.status,
      location: login.location,
      hasCookie: Boolean(login.setCookie),
    },
    agentPage: {
      status: agentPage.status,
      hasAgent: agentPage.body.includes("MetaPronostic Agent"),
    },
    adminPage: {
      status: adminPage.status,
      location: adminPage.location,
    },
    insert: {
      status: insert.status,
      insertedCount: insertBody.insertedCount,
      found: Boolean(found),
    },
    blockedReferenceInsert: {
      status: blockedReferenceInsert.status,
    },
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
