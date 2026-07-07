import { getMongoDb } from "@/lib/mongodb";

type CollectionConfig = {
  name: string;
  hints: string[];
  searchableFields: string[];
  defaultSort?: Record<string, 1 | -1>;
};

const FOOTBALL_COLLECTIONS: CollectionConfig[] = [
  {
    name: "football_countries",
    hints: ["country", "countries", "pays", "drapeau", "flag"],
    searchableFields: ["name", "code"],
    defaultSort: { name: 1 },
  },
  {
    name: "football_leagues",
    hints: [
      "league",
      "leagues",
      "ligue",
      "ligues",
      "competition",
      "compétition",
      "championnat",
      "coupe",
    ],
    searchableFields: ["name", "type"],
    defaultSort: { name: 1 },
  },
  {
    name: "football_league_seasons",
    hints: ["season", "seasons", "saison", "saisons", "coverage", "couverture"],
    searchableFields: ["season"],
    defaultSort: { season: -1 },
  },
  {
    name: "football_venues",
    hints: ["venue", "venues", "stade", "stades", "terrain", "ville"],
    searchableFields: ["name", "city", "country", "surface"],
    defaultSort: { name: 1 },
  },
  {
    name: "football_teams",
    hints: [
      "team",
      "teams",
      "equipe",
      "équipes",
      "équipe",
      "club",
      "clubs",
      "selection",
      "sélection",
    ],
    searchableFields: ["name", "code", "country_name"],
    defaultSort: { name: 1 },
  },
  {
    name: "football_fixtures",
    hints: [
      "fixture",
      "fixtures",
      "match",
      "matchs",
      "calendrier",
      "score",
      "buteur",
      "buteurs",
      "marqueur",
      "marqueurs",
      "résultat",
      "resultat",
      "today",
      "aujourd'hui",
      "live",
      "en cours",
    ],
    searchableFields: [
      "round",
      "referee",
      "timezone",
      "venue_name",
      "venue_city",
      "status_long",
      "status_short",
      "home_scorers",
      "away_scorers",
    ],
    defaultSort: { fixture_date: -1 },
  },
  {
    name: "football_fixture_events",
    hints: [
      "event",
      "events",
      "événement",
      "evenement",
      "but",
      "goal",
      "carton",
      "card",
      "substitution",
    ],
    searchableFields: [
      "team_name",
      "player_name",
      "assist_player_name",
      "event_type",
      "event_detail",
      "comments",
    ],
    defaultSort: { fixture_id: -1, sort_order: 1 },
  },
  {
    name: "football_fixture_statistics",
    hints: ["statistique", "statistiques", "statistics", "stats", "possession"],
    searchableFields: ["statistic_type", "statistic_value", "period"],
    defaultSort: { fixture_id: -1 },
  },
  {
    name: "football_fixture_lineups",
    hints: [
      "lineup",
      "lineups",
      "composition",
      "compositions",
      "formation",
      "titulaire",
      "remplaçant",
      "remplacant",
    ],
    searchableFields: [
      "team_name",
      "formation",
      "coach_name",
      "player_name",
      "position",
      "grid",
    ],
    defaultSort: { fixture_id: -1, team_id: 1, sort_order: 1 },
  },
  {
    name: "football_players",
    hints: ["player", "players", "joueur", "joueurs", "attaquant", "gardien"],
    searchableFields: [
      "name",
      "firstname",
      "lastname",
      "nationality",
      "birth_place",
      "birth_country",
    ],
    defaultSort: { name: 1 },
  },
  {
    name: "football_player_statistics",
    hints: [
      "player statistics",
      "stats joueur",
      "buteur",
      "buteurs",
      "assist",
      "assists",
      "passeur",
      "passeurs",
      "rating",
    ],
    searchableFields: ["position", "rating"],
    defaultSort: { season: -1, goals_total: -1 },
  },
  {
    name: "football_standings",
    hints: [
      "standing",
      "standings",
      "classement",
      "rank",
      "rang",
      "points",
      "forme",
    ],
    searchableFields: ["group_name", "form", "status", "description"],
    defaultSort: { league_id: 1, season: -1, rank: 1 },
  },
  {
    name: "football_injuries",
    hints: [
      "injury",
      "injuries",
      "blessure",
      "blessures",
      "absent",
      "absents",
      "suspendu",
      "suspension",
    ],
    searchableFields: ["player_name", "injury_type", "reason"],
    defaultSort: { fixture_date: -1 },
  },
  {
    name: "football_odds",
    hints: [
      "odd",
      "odds",
      "cote",
      "cotes",
      "pari",
      "paris",
      "bookmaker",
      "bookmakers",
    ],
    searchableFields: ["bookmaker_name", "bet_name", "bet_value", "odd_raw"],
    defaultSort: { api_updated_at: -1 },
  },
];

const COLLECTION_HINTS: Record<string, string[]> = Object.fromEntries(
  FOOTBALL_COLLECTIONS.map((collection) => [
    collection.name,
    [collection.name, ...collection.hints],
  ])
);

const COLLECTION_CONFIGS = new Map(
  FOOTBALL_COLLECTIONS.map((collection) => [collection.name, collection])
);

const RELATION_GROUPS: Record<string, string[]> = {
  football_fixtures: [
    "football_fixtures",
    "football_teams",
    "football_leagues",
    "football_venues",
  ],
  football_fixture_events: [
    "football_fixture_events",
    "football_fixtures",
    "football_teams",
  ],
  football_fixture_statistics: [
    "football_fixture_statistics",
    "football_fixtures",
    "football_teams",
  ],
  football_fixture_lineups: [
    "football_fixture_lineups",
    "football_fixtures",
    "football_teams",
    "football_players",
  ],
  football_player_statistics: [
    "football_player_statistics",
    "football_players",
    "football_teams",
    "football_leagues",
  ],
  football_standings: [
    "football_standings",
    "football_teams",
    "football_leagues",
  ],
  football_injuries: [
    "football_injuries",
    "football_players",
    "football_teams",
    "football_fixtures",
  ],
  football_odds: [
    "football_odds",
    "football_fixtures",
    "football_leagues",
  ],
};

const MAX_COLLECTIONS = 5;
const MAX_RECORDS_PER_COLLECTION = 10;
const MAX_CONTEXT_CHARS = 16000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTerms(message: string): string[] {
  return [
    ...new Set(
      message
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3)
        .filter(
          (term) =>
            ![
              "les",
              "des",
              "une",
              "dans",
              "pour",
              "avec",
              "quel",
              "quelle",
              "quels",
              "quelles",
              "what",
              "which",
              "show",
              "give",
              "donne",
              "liste",
            ].includes(term)
        )
    ),
  ].slice(0, 6);
}

function pickRelevantCollections(
  availableCollections: string[],
  message: string
): string[] {
  const normalizedMessage = message.toLowerCase();
  const normalizedCollections = new Map(
    availableCollections.map((name) => [name.toLowerCase(), name])
  );

  const directMatches = availableCollections.filter((name) =>
    normalizedMessage.includes(name.toLowerCase())
  );

  const hintedMatches = Object.entries(COLLECTION_HINTS)
    .filter(([collectionName, hints]) => {
      const collectionExists =
        normalizedCollections.has(collectionName) ||
        hints.some((hint) => normalizedCollections.has(hint));
      const messageMatches = hints.some((hint) =>
        normalizedMessage.includes(hint)
      );

      return collectionExists && messageMatches;
    })
    .flatMap(([collectionName, hints]) => {
      const preferredName =
        normalizedCollections.get(collectionName) ??
        hints
          .map((hint) => normalizedCollections.get(hint))
          .find((name): name is string => Boolean(name));

      return preferredName ? [preferredName] : [];
    });

  const selected = [...new Set([...directMatches, ...hintedMatches])];
  const expandedSelection = selected.flatMap((collectionName) => {
    const canonicalName =
      FOOTBALL_COLLECTIONS.find(
        (collection) =>
          collection.name === collectionName ||
          collection.hints.includes(collectionName.toLowerCase())
      )?.name ?? collectionName;

    return RELATION_GROUPS[canonicalName] ?? [canonicalName];
  });
  const availableExpandedSelection = [...new Set(expandedSelection)].filter(
    (collectionName) => normalizedCollections.has(collectionName.toLowerCase())
  );

  if (availableExpandedSelection.length > 0) {
    return availableExpandedSelection.slice(0, MAX_COLLECTIONS);
  }

  const footballCollections = FOOTBALL_COLLECTIONS.map((collection) => collection.name)
    .filter((collectionName) =>
      normalizedCollections.has(collectionName.toLowerCase())
    );

  return footballCollections.slice(0, MAX_COLLECTIONS);
}

function buildCollectionFilter(
  collectionName: string,
  message: string
): Record<string, unknown> {
  const config = COLLECTION_CONFIGS.get(collectionName);
  const searchTerms = getSearchTerms(message);

  if (!config || searchTerms.length === 0) {
    return {};
  }

  const regexFilters = config.searchableFields.flatMap((field) =>
    searchTerms.map((term) => ({
      [field]: { $regex: escapeRegex(term), $options: "i" },
    }))
  );

  return regexFilters.length > 0 ? { $or: regexFilters } : {};
}

function cleanRecord(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(cleanRecord);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => !["password", "token", "secret"].includes(key))
        .map(([key, entryValue]) => [key, cleanRecord(entryValue)])
    );
  }

  return value;
}

export async function getMongoContext(message: string): Promise<string> {
  const db = await getMongoDb();
  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const collectionNames = collections.map((collection) => collection.name);

  if (collectionNames.length === 0) {
    return "";
  }

  const selectedCollections = pickRelevantCollections(collectionNames, message);
  const contextSections = await Promise.all(
    selectedCollections.map(async (collectionName) => {
      const config = COLLECTION_CONFIGS.get(collectionName);
      const filter = buildCollectionFilter(collectionName, message);
      let records = await db
        .collection(collectionName)
        .find(filter)
        .sort(config?.defaultSort ?? {})
        .limit(MAX_RECORDS_PER_COLLECTION)
        .toArray();

      if (records.length === 0 && Object.keys(filter).length > 0) {
        records = await db
          .collection(collectionName)
          .find({})
          .sort(config?.defaultSort ?? {})
          .limit(MAX_RECORDS_PER_COLLECTION)
          .toArray();
      }

      if (records.length === 0) {
        return "";
      }

      const cleanedRecords = records.map(cleanRecord);

      return `Collection: ${collectionName}\nMatched filter: ${JSON.stringify(
        filter
      )}\nRecords:\n${JSON.stringify(
        cleanedRecords,
        null,
        2
      )}`;
    })
  );

  return contextSections.filter(Boolean).join("\n\n").slice(0, MAX_CONTEXT_CHARS);
}
