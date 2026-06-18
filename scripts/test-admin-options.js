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
  const publicAttempt = await request(
    `${baseUrl}/api/admin/options?source=country-api`
  );
  const countries = await request(
    `${baseUrl}/api/admin/options?source=country-api`,
    {},
    login.cookie
  );
  const countryBody = JSON.parse(countries.body);

  const result = {
    ok:
      login.status === 303 &&
      publicAttempt.status === 401 &&
      countries.status === 200 &&
      countryBody.ok === true &&
      Array.isArray(countryBody.options) &&
      countryBody.options.length > 0,
    loginStatus: login.status,
    publicStatus: publicAttempt.status,
    countriesStatus: countries.status,
    optionsCount: countryBody.options?.length ?? 0,
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

