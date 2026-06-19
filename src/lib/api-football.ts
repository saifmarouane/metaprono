const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

export type ApiFootballResponse<T> = {
  get: string;
  parameters: Record<string, string>;
  errors: unknown;
  results: number;
  paging?: {
    current: number;
    total: number;
  };
  response: T[];
};

export type ApiFootballFixture = {
  fixture?: {
    id?: number;
    referee?: string | null;
    timezone?: string;
    date?: string;
    timestamp?: number;
    venue?: {
      id?: number | null;
      name?: string | null;
      city?: string | null;
    };
    status?: {
      long?: string;
      short?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    id?: number;
    name?: string;
    country?: string;
    logo?: string;
    flag?: string | null;
    season?: number;
    round?: string;
  };
  teams?: {
    home?: {
      id?: number;
      name?: string;
      logo?: string;
      winner?: boolean | null;
    };
    away?: {
      id?: number;
      name?: string;
      logo?: string;
      winner?: boolean | null;
    };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: unknown;
};

export type ApiFootballPrediction = {
  predictions?: {
    winner?: {
      id?: number | null;
      name?: string | null;
      comment?: string | null;
    };
    win_or_draw?: boolean;
    under_over?: string | null;
    goals?: {
      home?: string | null;
      away?: string | null;
    };
    advice?: string | null;
    percent?: {
      home?: string | null;
      draw?: string | null;
      away?: string | null;
    };
  };
  league?: ApiFootballFixture["league"];
  teams?: ApiFootballFixture["teams"];
  comparison?: unknown;
  h2h?: ApiFootballFixture[];
};

export type ApiFootballLineup = {
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  coach?: {
    id?: number;
    name?: string;
    photo?: string;
  };
  formation?: string;
  startXI?: Array<{
    player?: {
      id?: number;
      name?: string;
      number?: number;
      pos?: string;
      grid?: string | null;
    };
  }>;
  substitutes?: Array<{
    player?: {
      id?: number;
      name?: string;
      number?: number;
      pos?: string;
      grid?: string | null;
    };
  }>;
};

export type ApiFootballInjury = {
  player?: {
    id?: number;
    name?: string;
    photo?: string;
    type?: string | null;
    reason?: string | null;
  };
  team?: {
    id?: number;
    name?: string;
    logo?: string;
  };
  fixture?: {
    id?: number;
    timezone?: string;
    date?: string;
    timestamp?: number;
  };
  league?: ApiFootballFixture["league"];
};

function getApiSportsKey(): string {
  const key =
    process.env.APISPORTS_KEY ??
    process.env.API_SPORTS_KEY ??
    process.env.X_APISPORTS_KEY ??
    process.env["xapisportskey"];

  if (!key) {
    throw new Error(
      "API-FOOTBALL key is not set. Use APISPORTS_KEY or xapisportskey in .env."
    );
  }

  return key;
}

export async function apiFootballGet<T>(
  endpoint: string,
  params: Record<string, string | number | undefined>
): Promise<ApiFootballResponse<T>> {
  const url = new URL(`${API_FOOTBALL_BASE_URL}${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": getApiSportsKey(),
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiFootballResponse<T>;

  if (!response.ok) {
    throw new Error(`API-FOOTBALL request failed with status ${response.status}`);
  }

  return payload;
}

export async function fetchApiFootballFixtures(params: {
  league?: number;
  season?: number;
  team?: number;
  date?: string;
  from?: string;
  to?: string;
  timezone?: string;
  next?: number;
  last?: number;
  live?: string;
}): Promise<ApiFootballResponse<ApiFootballFixture>> {
  return apiFootballGet<ApiFootballFixture>("/fixtures", params);
}

export type ApiFootballTeam = {
  team?: {
    id?: number;
    name?: string;
    code?: string | null;
    country?: string;
    national?: boolean;
    logo?: string;
  };
  venue?: unknown;
};

export async function searchApiFootballTeams(
  search: string
): Promise<ApiFootballResponse<ApiFootballTeam>> {
  return apiFootballGet<ApiFootballTeam>("/teams", { search });
}

export async function fetchApiFootballHeadToHead(params: {
  firstTeamId: number;
  secondTeamId: number;
  timezone?: string;
}): Promise<ApiFootballResponse<ApiFootballFixture>> {
  return apiFootballGet<ApiFootballFixture>("/fixtures/headtohead", {
    h2h: `${params.firstTeamId}-${params.secondTeamId}`,
    timezone: params.timezone,
  });
}

export async function fetchApiFootballPredictions(
  fixture: number
): Promise<ApiFootballResponse<ApiFootballPrediction>> {
  return apiFootballGet<ApiFootballPrediction>("/predictions", { fixture });
}

export async function fetchApiFootballLineups(
  fixture: number
): Promise<ApiFootballResponse<ApiFootballLineup>> {
  return apiFootballGet<ApiFootballLineup>("/fixtures/lineups", { fixture });
}

export async function fetchApiFootballInjuries(params: {
  fixture?: number;
  team?: number;
  date?: string;
  timezone?: string;
}): Promise<ApiFootballResponse<ApiFootballInjury>> {
  return apiFootballGet<ApiFootballInjury>("/injuries", params);
}
