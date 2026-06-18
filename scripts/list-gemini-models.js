const fs = require("node:fs");

function readGeminiApiKey() {
  const env = fs.readFileSync(".env", "utf8");
  const line = env
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("GEMINI_API_KEY="));

  if (!line) {
    throw new Error("GEMINI_API_KEY missing");
  }

  return line.slice("GEMINI_API_KEY=".length).replace(/^"|"$/g, "");
}

async function main() {
  const apiKey = readGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const body = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }

  const models = (body.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
    .map((model) => ({
      name: model.name,
      displayName: model.displayName,
      methods: model.supportedGenerationMethods,
    }));

  console.log(JSON.stringify({ ok: true, models }, null, 2));
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

