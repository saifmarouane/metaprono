const question =
  process.argv.slice(2).join(" ") ||
  "Donne le classement de la Ligue 1 2025 depuis MongoDB.";

async function main() {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: question,
      conversationHistory: [],
    }),
  });

  const text = await response.text();

  console.log(
    JSON.stringify({
      ok: response.ok,
      status: response.status,
      question,
      answer: text,
    })
  );

  if (!response.ok) {
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

