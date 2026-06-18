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
    cookie: setCookie?.split(";")[0] ?? cookie,
    body,
  };
}

async function main() {
  const baseUrl = "http://localhost:3000";
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
  const result = {
    ok:
      login.status === 303 &&
      agentPage.status === 200 &&
      agentPage.body.includes("Insertion premium") &&
      agentPage.body.includes("Champs clairs") &&
      agentPage.body.includes("Apercu JSON technique"),
    loginStatus: login.status,
    agentStatus: agentPage.status,
    hasPremiumForm: agentPage.body.includes("Insertion premium"),
    hasClearFields: agentPage.body.includes("Champs clairs"),
    hasJsonPreview: agentPage.body.includes("Apercu JSON technique"),
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

