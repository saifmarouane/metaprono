export type FootballCollectionGuide = {
  name: string;
  title: string;
  description: string;
  requiredFields: string[];
  recommendedFields: string[];
  sample: Record<string, unknown>;
};

export type FieldInputType =
  | "text"
  | "number"
  | "decimal"
  | "date"
  | "datetime"
  | "boolean"
  | "url";

export type FootballFieldGuide = {
  key: string;
  label: string;
  type: FieldInputType;
  help?: string;
  placeholder?: string;
  options?: FieldOption[];
  optionSource?: string;
};

export type FieldOption = {
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "Nom",
  code: "Code",
  flag: "URL drapeau",
  country_id: "ID pays",
  type: "Type",
  logo: "URL logo",
  league_id: "ID competition",
  season: "Saison",
  start_date: "Date debut",
  end_date: "Date fin",
  is_current: "Saison actuelle",
  coverage_standings: "Classement disponible",
  coverage_players: "Joueurs disponibles",
  coverage_odds: "Cotes disponibles",
  venue_id: "ID stade",
  city: "Ville",
  country: "Pays",
  capacity: "Capacite",
  surface: "Surface",
  country_name: "Nom pays",
  founded: "Fondation",
  national: "Selection nationale",
  round: "Tour / journee",
  home_team_id: "ID equipe domicile",
  away_team_id: "ID equipe exterieur",
  timezone: "Fuseau horaire",
  fixture_date: "Date du match",
  status_short: "Statut court",
  goals_home: "Buts domicile",
  goals_away: "Buts exterieur",
  standings_available: "Compte au classement",
  fixture_id: "ID match",
  team_id: "ID equipe",
  team_name: "Nom equipe",
  player_id: "ID joueur",
  player_name: "Nom joueur",
  assist_player_id: "ID passeur",
  assist_player_name: "Nom passeur",
  elapsed: "Minute",
  extra_time: "Temps additionnel",
  event_type: "Type evenement",
  event_detail: "Detail evenement",
  sort_order: "Ordre",
  period: "Periode",
  statistic_type: "Type statistique",
  statistic_value: "Valeur statistique",
  formation: "Formation",
  coach_name: "Coach",
  position: "Position",
  grid: "Grille",
  is_starting: "Titulaire",
  firstname: "Prenom",
  lastname: "Nom de famille",
  age: "Age",
  nationality: "Nationalite",
  height: "Taille",
  weight: "Poids",
  appearances: "Apparitions",
  minutes: "Minutes",
  rating: "Note",
  goals_total: "Buts",
  assists: "Passes decisives",
  group_name: "Groupe",
  rank: "Rang",
  points: "Points",
  goals_diff: "Difference buts",
  form: "Forme",
  description: "Description",
  all_played: "Matchs joues",
  all_win: "Victoires",
  all_draw: "Nuls",
  all_lose: "Defaites",
  injury_type: "Type absence",
  reason: "Raison",
  bookmaker_id: "ID bookmaker",
  bookmaker_name: "Bookmaker",
  bet_id: "ID marche",
  bet_name: "Marche",
  bet_value: "Selection",
  odd: "Cote",
  odd_raw: "Cote brute",
  is_live: "Live",
};

const FIELD_HELP: Record<string, string> = {
  id: "Identifiant stable API-FOOTBALL ou identifiant local unique.",
  season: "Annee de debut de saison, exemple 2025 pour 2025-2026.",
  fixture_date: "Date et heure du match.",
  status_short: "Exemples: NS, 1H, HT, 2H, FT, PST.",
  form: "Suite de resultats recents, exemple WWDWL.",
  odd: "Valeur numerique de la cote, exemple 1.85.",
  is_live: "Active si la cote vient d'un flux live.",
};

const STATIC_FIELD_OPTIONS: Record<string, FieldOption[]> = {
  type: [
    { label: "League", value: "League" },
    { label: "Cup", value: "Cup" },
  ],
  surface: [
    { label: "Grass", value: "grass" },
    { label: "Artificial turf", value: "artificial turf" },
    { label: "Hybrid", value: "hybrid" },
  ],
  timezone: [
    { label: "Africa/Casablanca", value: "Africa/Casablanca" },
    { label: "Europe/Paris", value: "Europe/Paris" },
    { label: "UTC", value: "UTC" },
  ],
  status_short: [
    { label: "Not Started (NS)", value: "NS" },
    { label: "First Half (1H)", value: "1H" },
    { label: "Half Time (HT)", value: "HT" },
    { label: "Second Half (2H)", value: "2H" },
    { label: "Extra Time (ET)", value: "ET" },
    { label: "Penalty In Progress (P)", value: "P" },
    { label: "Match Finished (FT)", value: "FT" },
    { label: "Postponed (PST)", value: "PST" },
    { label: "Cancelled (CANC)", value: "CANC" },
  ],
  event_type: [
    { label: "Goal", value: "Goal" },
    { label: "Card", value: "Card" },
    { label: "Substitution", value: "subst" },
    { label: "VAR", value: "Var" },
  ],
  event_detail: [
    { label: "Normal Goal", value: "Normal Goal" },
    { label: "Penalty", value: "Penalty" },
    { label: "Own Goal", value: "Own Goal" },
    { label: "Yellow Card", value: "Yellow Card" },
    { label: "Red Card", value: "Red Card" },
  ],
  period: [
    { label: "All match", value: "ALL" },
    { label: "First half", value: "1H" },
    { label: "Second half", value: "2H" },
  ],
  position: [
    { label: "Goalkeeper", value: "Goalkeeper" },
    { label: "Defender", value: "Defender" },
    { label: "Midfielder", value: "Midfielder" },
    { label: "Attacker", value: "Attacker" },
    { label: "G", value: "G" },
    { label: "D", value: "D" },
    { label: "M", value: "M" },
    { label: "F", value: "F" },
  ],
  injury_type: [
    { label: "Missing Fixture", value: "Missing Fixture" },
    { label: "Questionable", value: "Questionable" },
    { label: "Suspended", value: "Suspended" },
  ],
  bet_name: [
    { label: "Match Winner", value: "Match Winner" },
    { label: "Double Chance", value: "Double Chance" },
    { label: "Goals Over/Under", value: "Goals Over/Under" },
    { label: "Both Teams Score", value: "Both Teams Score" },
  ],
  bet_value: [
    { label: "Home", value: "Home" },
    { label: "Draw", value: "Draw" },
    { label: "Away", value: "Away" },
    { label: "Yes", value: "Yes" },
    { label: "No", value: "No" },
    { label: "Over 2.5", value: "Over 2.5" },
    { label: "Under 2.5", value: "Under 2.5" },
  ],
};

const FIELD_OPTION_SOURCES: Record<string, string> = {
  country_id: "countries",
  country: "country-names",
  country_name: "country-names",
  nationality: "country-names",
  venue_id: "venues",
  league_id: "leagues",
  team_id: "teams",
  home_team_id: "teams",
  away_team_id: "teams",
  fixture_id: "fixtures",
  player_id: "players",
  assist_player_id: "players",
};

const COLLECTION_FIELD_OPTION_SOURCES: Record<string, Record<string, string>> = {
  football_countries: {
    name: "country-api",
  },
};

function inferFieldType(key: string, value: unknown): FieldInputType {
  if (typeof value === "boolean" || key.startsWith("is_") || key.startsWith("coverage_") || key.endsWith("_available")) {
    return "boolean";
  }

  if (key.includes("date") && String(value).includes("T")) {
    return "datetime";
  }

  if (key.endsWith("_date") || key === "start_date" || key === "end_date") {
    return "date";
  }

  if (key.includes("url") || key === "flag" || key === "logo" || key === "image" || key.endsWith("_photo")) {
    return "url";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "number" : "decimal";
  }

  if (
    key === "rating" ||
    key === "odd" ||
    key.endsWith("_accuracy")
  ) {
    return "decimal";
  }

  if (
    key === "id" ||
    key.endsWith("_id") ||
    key === "rank" ||
    key === "points" ||
    key === "age" ||
    key === "capacity" ||
    key === "season" ||
    key === "elapsed" ||
    key === "sort_order" ||
    key.startsWith("goals_") ||
    key.startsWith("all_") ||
    key === "minutes" ||
    key === "appearances" ||
    key === "assists"
  ) {
    return "number";
  }

  return "text";
}

export function getFieldGuides(
  guide: FootballCollectionGuide
): FootballFieldGuide[] {
  return Object.entries(guide.sample).map(([key, value]) => ({
    key,
    label: FIELD_LABELS[key] ?? key.replaceAll("_", " "),
    type: inferFieldType(key, value),
    help: FIELD_HELP[key],
    placeholder: String(value),
    options: STATIC_FIELD_OPTIONS[key],
    optionSource:
      COLLECTION_FIELD_OPTION_SOURCES[guide.name]?.[key] ??
      FIELD_OPTION_SOURCES[key],
  }));
}

export const FOOTBALL_COLLECTION_GUIDES: FootballCollectionGuide[] = [
  {
    name: "football_countries",
    title: "Pays",
    description: "Referentiel des pays disponibles dans API-FOOTBALL.",
    requiredFields: ["id", "name"],
    recommendedFields: ["code", "flag"],
    sample: {
      id: 1,
      name: "France",
      code: "FR",
      flag: "https://media.api-sports.io/flags/fr.svg",
    },
  },
  {
    name: "football_leagues",
    title: "Competitions",
    description: "Championnat, coupe ou competition internationale.",
    requiredFields: ["id", "name"],
    recommendedFields: ["country_id", "type", "logo"],
    sample: {
      id: 61,
      country_id: 1,
      name: "Ligue 1",
      type: "League",
      logo: "https://media.api-sports.io/football/leagues/61.png",
    },
  },
  {
    name: "football_league_seasons",
    title: "Saisons de ligue",
    description: "Saison et couverture disponible pour une competition.",
    requiredFields: ["league_id", "season", "is_current"],
    recommendedFields: ["start_date", "end_date", "coverage_standings"],
    sample: {
      league_id: 61,
      season: 2025,
      start_date: "2025-08-15",
      end_date: "2026-05-23",
      is_current: true,
      coverage_standings: true,
      coverage_players: true,
      coverage_odds: false,
    },
  },
  {
    name: "football_venues",
    title: "Stades",
    description: "Stades et lieux ou se jouent les matchs.",
    requiredFields: ["id"],
    recommendedFields: ["name", "city", "country", "capacity", "surface"],
    sample: {
      id: 671,
      name: "Parc des Princes",
      city: "Paris",
      country: "France",
      capacity: 47929,
      surface: "grass",
    },
  },
  {
    name: "football_teams",
    title: "Equipes",
    description: "Clubs et selections nationales.",
    requiredFields: ["id", "name"],
    recommendedFields: ["venue_id", "country_id", "code", "country_name"],
    sample: {
      id: 85,
      venue_id: 671,
      country_id: 1,
      name: "Paris Saint Germain",
      code: "PSG",
      country_name: "France",
      founded: 1970,
      national: false,
    },
  },
  {
    name: "football_fixtures",
    title: "Matchs",
    description: "Calendrier, score, statut et contexte d'un match.",
    requiredFields: ["id", "league_id", "season", "home_team_id", "away_team_id", "fixture_date"],
    recommendedFields: ["venue_id", "status_short", "goals_home", "goals_away"],
    sample: {
      id: 1200001,
      league_id: 61,
      season: 2025,
      round: "Regular Season - 1",
      home_team_id: 85,
      away_team_id: 81,
      venue_id: 671,
      timezone: "Africa/Casablanca",
      fixture_date: "2026-01-18T20:45:00.000Z",
      status_short: "FT",
      goals_home: 2,
      goals_away: 1,
      standings_available: true,
    },
  },
  {
    name: "football_fixture_events",
    title: "Evenements de match",
    description: "Buts, cartons, remplacements et faits de jeu.",
    requiredFields: ["id", "fixture_id", "team_id", "event_type"],
    recommendedFields: ["player_name", "elapsed", "event_detail", "sort_order"],
    sample: {
      id: 900001,
      fixture_id: 1200001,
      team_id: 85,
      team_name: "Paris Saint Germain",
      player_id: 276,
      player_name: "Example Striker",
      elapsed: 23,
      event_type: "Goal",
      event_detail: "Normal Goal",
      sort_order: 1,
    },
  },
  {
    name: "football_fixture_statistics",
    title: "Statistiques de match",
    description: "Statistiques par equipe et periode.",
    requiredFields: ["fixture_id", "team_id", "statistic_type"],
    recommendedFields: ["statistic_value", "period"],
    sample: {
      fixture_id: 1200001,
      team_id: 85,
      period: "ALL",
      statistic_type: "Ball Possession",
      statistic_value: "58%",
    },
  },
  {
    name: "football_fixture_lineups",
    title: "Compositions",
    description: "Titularisations, formations, coachs et bancs.",
    requiredFields: ["fixture_id", "team_id", "player_id", "player_name"],
    recommendedFields: ["formation", "position", "grid", "is_starting"],
    sample: {
      fixture_id: 1200001,
      team_id: 85,
      team_name: "Paris Saint Germain",
      formation: "4-3-3",
      coach_name: "Example Coach",
      player_id: 276,
      player_name: "Example Striker",
      position: "F",
      grid: "4:2",
      is_starting: true,
      sort_order: 1,
    },
  },
  {
    name: "football_players",
    title: "Joueurs",
    description: "Identite et profil des joueurs.",
    requiredFields: ["id", "name"],
    recommendedFields: ["firstname", "lastname", "age", "nationality"],
    sample: {
      id: 276,
      name: "Example Striker",
      firstname: "Example",
      lastname: "Striker",
      age: 26,
      nationality: "France",
      height: "184 cm",
      weight: "78 kg",
    },
  },
  {
    name: "football_player_statistics",
    title: "Stats joueurs",
    description: "Statistiques saison par joueur/equipe/ligue.",
    requiredFields: ["id", "player_id", "team_id", "league_id", "season"],
    recommendedFields: ["appearances", "goals_total", "assists", "rating"],
    sample: {
      id: 700001,
      player_id: 276,
      team_id: 85,
      league_id: 61,
      season: 2025,
      appearances: 20,
      minutes: 1710,
      position: "Attacker",
      rating: 7.82,
      goals_total: 15,
      assists: 6,
    },
  },
  {
    name: "football_standings",
    title: "Classements",
    description: "Classement d'une competition et statistiques globales.",
    requiredFields: ["id", "league_id", "season", "team_id", "rank"],
    recommendedFields: ["points", "goals_diff", "form", "description"],
    sample: {
      id: 100001,
      league_id: 61,
      season: 2025,
      team_id: 85,
      group_name: "Ligue 1",
      rank: 1,
      points: 62,
      goals_diff: 35,
      form: "WWDWW",
      description: "Champions League",
      all_played: 28,
      all_win: 19,
      all_draw: 5,
      all_lose: 4,
    },
  },
  {
    name: "football_injuries",
    title: "Blessures",
    description: "Blessures, suspensions et absences liees aux matchs.",
    requiredFields: ["id", "team_id", "player_id"],
    recommendedFields: ["fixture_id", "player_name", "injury_type", "reason"],
    sample: {
      id: 110001,
      fixture_id: 1200001,
      league_id: 61,
      season: 2025,
      team_id: 85,
      player_id: 278,
      player_name: "PSG Defender",
      injury_type: "Missing Fixture",
      reason: "Hamstring Injury",
    },
  },
  {
    name: "football_odds",
    title: "Cotes",
    description: "Cotes pre-match ou live par bookmaker et marche.",
    requiredFields: ["id", "fixture_id", "bet_id", "bet_value"],
    recommendedFields: ["bookmaker_name", "bet_name", "odd", "is_live"],
    sample: {
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
  },
];

export const FOOTBALL_COLLECTION_NAMES = FOOTBALL_COLLECTION_GUIDES.map(
  (guide) => guide.name
);

export function getFootballCollectionGuide(
  collectionName: string
): FootballCollectionGuide | undefined {
  return FOOTBALL_COLLECTION_GUIDES.find(
    (guide) => guide.name === collectionName
  );
}
