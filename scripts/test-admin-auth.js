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
  const before = await request(`${baseUrl}/admin`);
  const formData = new URLSearchParams({
    email: "admin@metapronostic.local",
    password: "MetaPronostic2026!",
    next: "/admin",
  });
  const login = await request(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: formData,
  });
  const after = await request(`${baseUrl}/admin`, {}, login.cookie);

  const result = {
    ok:
      [303, 307, 308].includes(before.status) &&
      login.status === 303 &&
      after.status === 200 &&
      after.body.includes("MetaPronostic Data Admin"),
    before: {
      status: before.status,
      location: before.location,
    },
    login: {
      status: login.status,
      location: login.location,
      hasCookie: Boolean(login.setCookie),
    },
    after: {
      status: after.status,
      hasAdmin: after.body.includes("MetaPronostic Data Admin"),
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

