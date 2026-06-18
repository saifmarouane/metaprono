# Matchs du Brésil et du Maroc avec API-FOOTBALL v3

Ce projet récupère avec **API-FOOTBALL v3** :

1. les matchs du **Brésil** pendant l’année précédente ;
2. les matchs du **Brésil** pendant l’année actuelle ;
3. les matchs du **Maroc** pendant l’année précédente ;
4. les matchs du **Maroc** pendant l’année actuelle ;
5. tous les matchs disponibles déjà joués entre le **Maroc** et le **Brésil**.

Au moment de la rédaction de ce README :

- année précédente : **2025** ;
- année actuelle : **2026** ;
- fuseau horaire utilisé : `Africa/Casablanca`.

Le script calcule automatiquement ces années à partir de la date du serveur. Il n’est donc pas nécessaire de modifier le code en 2027 ou après.

---

## 1. API utilisée

Base URL directe :

```text
https://v3.football.api-sports.io
```

Header d’authentification :

```http
xapisportskey: VOTRE_CLE_API
```

Endpoints utilisés :

```http
GET /teams
GET /fixtures
GET /fixtures/headtohead
```

- `/teams` sert à trouver les IDs du Brésil et du Maroc.
- `/fixtures` sert à récupérer les matchs de chaque sélection par période.
- `/fixtures/headtohead` sert à récupérer les confrontations Maroc–Brésil.

---

## 2. Prérequis

- Node.js 18 ou plus récent ;
- une clé API-FOOTBALL valide ;
- un compte API-SPORTS direct.

Vérifier la version de Node.js :

```bash
node --version
```

---

## 3. Structure du projet

```text
brazil-morocco-matches/
├── README.md
├── index.js
└── data/
```

Le dossier `data` est créé automatiquement par le script.

---

## 4. Configuration

Créer une variable d’environnement contenant la clé API.

### Linux ou macOS

```bash
export API_FOOTBALL_KEY="votre_cle_api"
```

### Windows PowerShell

```powershell
$env:API_FOOTBALL_KEY="votre_cle_api"
```

Ne jamais mettre la clé API directement dans une application frontend ou dans un dépôt Git public.

---

## 5. Script complet `index.js`

Créer un fichier `index.js` avec le contenu suivant :

```js
const fs = require("node:fs/promises");
const path = require("node:path");

const BASE_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;
const TIMEZONE = process.env.TIMEZONE || "Africa/Casablanca";

const now = new Date();
const CURRENT_YEAR = Number(process.env.CURRENT_YEAR || now.getFullYear());
const PREVIOUS_YEAR = Number(
  process.env.PREVIOUS_YEAR || CURRENT_YEAR - 1
);

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

async function apiGet(endpoint, params = {}) {
  if (!API_KEY) {
    throw new Error(
      "La variable d'environnement API_FOOTBALL_KEY est absente."
    );
  }

  const url = new URL(`${BASE_URL}${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "xapisportskey": API_KEY,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Erreur HTTP ${response.status}: ${JSON.stringify(body)}`
    );
  }

  if (body?.errors && Object.keys(body.errors).length > 0) {
    throw new Error(
      `Erreur API-FOOTBALL: ${JSON.stringify(body.errors)}`
    );
  }

  return {
    data: body?.response ?? [],
    quota: {
      dailyLimit: response.headers.get("x-ratelimit-requests-limit"),
      dailyRemaining: response.headers.get(
        "x-ratelimit-requests-remaining"
      ),
      minuteLimit: response.headers.get("x-ratelimit-limit"),
      minuteRemaining: response.headers.get("x-ratelimit-remaining"),
    },
  };
}

async function findNationalTeam(name) {
  const { data } = await apiGet("/teams", {
    search: name,
  });

  const nationalTeams = data.filter(
    (item) => item?.team?.national === true
  );

  const exactMatch = nationalTeams.find(
    (item) =>
      normalizeText(item.team.name) === normalizeText(name)
  );

  const selectedTeam = exactMatch || nationalTeams[0];

  if (!selectedTeam?.team?.id) {
    const foundNames = data
      .map((item) => item?.team?.name)
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Sélection nationale introuvable pour "${name}". ` +
      `Résultats reçus : ${foundNames || "aucun"}`
    );
  }

  return {
    id: selectedTeam.team.id,
    name: selectedTeam.team.name,
    code: selectedTeam.team.code,
    country: selectedTeam.team.country,
    logo: selectedTeam.team.logo,
  };
}

function formatFixture(item) {
  return {
    fixtureId: item.fixture?.id ?? null,
    date: item.fixture?.date ?? null,
    timestamp: item.fixture?.timestamp ?? null,
    timezone: item.fixture?.timezone ?? null,
    venue: {
      id: item.fixture?.venue?.id ?? null,
      name: item.fixture?.venue?.name ?? null,
      city: item.fixture?.venue?.city ?? null,
    },
    status: {
      long: item.fixture?.status?.long ?? null,
      short: item.fixture?.status?.short ?? null,
      elapsed: item.fixture?.status?.elapsed ?? null,
    },
    competition: {
      id: item.league?.id ?? null,
      name: item.league?.name ?? null,
      country: item.league?.country ?? null,
      season: item.league?.season ?? null,
      round: item.league?.round ?? null,
    },
    home: {
      id: item.teams?.home?.id ?? null,
      name: item.teams?.home?.name ?? null,
      winner: item.teams?.home?.winner ?? null,
    },
    away: {
      id: item.teams?.away?.id ?? null,
      name: item.teams?.away?.name ?? null,
      winner: item.teams?.away?.winner ?? null,
    },
    goals: {
      home: item.goals?.home ?? null,
      away: item.goals?.away ?? null,
    },
    score: {
      halftime: item.score?.halftime ?? null,
      fulltime: item.score?.fulltime ?? null,
      extratime: item.score?.extratime ?? null,
      penalty: item.score?.penalty ?? null,
    },
  };
}

function sortFixtures(fixtures) {
  return [...fixtures].sort((a, b) => {
    const first = new Date(a.date || 0).getTime();
    const second = new Date(b.date || 0).getTime();
    return first - second;
  });
}

function isFinished(fixture) {
  return FINISHED_STATUSES.has(fixture.status?.short);
}

async function getTeamMatchesForYear(teamId, year) {
  const { data, quota } = await apiGet("/fixtures", {
    team: teamId,
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    timezone: TIMEZONE,
  });

  const all = sortFixtures(data.map(formatFixture));
  const played = all.filter(isFinished);
  const scheduledOrOther = all.filter((fixture) => !isFinished(fixture));

  return {
    year,
    period: {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    },
    count: {
      all: all.length,
      played: played.length,
      scheduledOrOther: scheduledOrOther.length,
    },
    all,
    played,
    scheduledOrOther,
    quota,
  };
}

async function getPlayedHeadToHead(firstTeamId, secondTeamId) {
  const { data, quota } = await apiGet("/fixtures/headtohead", {
    h2h: `${firstTeamId}-${secondTeamId}`,
    timezone: TIMEZONE,
  });

  const allAvailable = sortFixtures(data.map(formatFixture));
  const played = allAvailable.filter(isFinished);

  return {
    count: played.length,
    matches: played,
    quota,
  };
}

async function writeJson(filename, data) {
  const outputDirectory = path.join(process.cwd(), "data");
  await fs.mkdir(outputDirectory, { recursive: true });

  const outputPath = path.join(outputDirectory, filename);

  await fs.writeFile(
    outputPath,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  return outputPath;
}

async function main() {
  console.log("Recherche des sélections nationales...");

  const [brazil, morocco] = await Promise.all([
    findNationalTeam("Brazil"),
    findNationalTeam("Morocco"),
  ]);

  console.log(`Brésil : ${brazil.name} — ID ${brazil.id}`);
  console.log(`Maroc  : ${morocco.name} — ID ${morocco.id}`);

  console.log(
    `Récupération des matchs pour ${PREVIOUS_YEAR} et ${CURRENT_YEAR}...`
  );

  const [
    brazilPreviousYear,
    brazilCurrentYear,
    moroccoPreviousYear,
    moroccoCurrentYear,
    headToHead,
  ] = await Promise.all([
    getTeamMatchesForYear(brazil.id, PREVIOUS_YEAR),
    getTeamMatchesForYear(brazil.id, CURRENT_YEAR),
    getTeamMatchesForYear(morocco.id, PREVIOUS_YEAR),
    getTeamMatchesForYear(morocco.id, CURRENT_YEAR),
    getPlayedHeadToHead(morocco.id, brazil.id),
  ]);

  const result = {
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE,
    years: {
      previous: PREVIOUS_YEAR,
      current: CURRENT_YEAR,
    },
    teams: {
      brazil,
      morocco,
    },
    teamMatches: {
      brazil: {
        [PREVIOUS_YEAR]: brazilPreviousYear,
        [CURRENT_YEAR]: brazilCurrentYear,
      },
      morocco: {
        [PREVIOUS_YEAR]: moroccoPreviousYear,
        [CURRENT_YEAR]: moroccoCurrentYear,
      },
    },
    playedHeadToHead: {
      teams: [morocco.name, brazil.name],
      ...headToHead,
    },
  };

  const outputPath = await writeJson(
    "brazil-morocco-matches.json",
    result
  );

  console.log("");
  console.log("Terminé.");
  console.log(`Fichier créé : ${outputPath}`);
  console.log("");
  console.log(
    `Brésil ${PREVIOUS_YEAR} : ` +
    `${brazilPreviousYear.count.all} match(s), ` +
    `${brazilPreviousYear.count.played} terminé(s)`
  );
  console.log(
    `Brésil ${CURRENT_YEAR} : ` +
    `${brazilCurrentYear.count.all} match(s), ` +
    `${brazilCurrentYear.count.played} terminé(s)`
  );
  console.log(
    `Maroc ${PREVIOUS_YEAR} : ` +
    `${moroccoPreviousYear.count.all} match(s), ` +
    `${moroccoPreviousYear.count.played} terminé(s)`
  );
  console.log(
    `Maroc ${CURRENT_YEAR} : ` +
    `${moroccoCurrentYear.count.all} match(s), ` +
    `${moroccoCurrentYear.count.played} terminé(s)`
  );
  console.log(
    `Maroc–Brésil déjà joués : ${headToHead.count} match(s)`
  );
}

main().catch((error) => {
  console.error("");
  console.error("Échec :", error.message);
  process.exitCode = 1;
});
```

---

## 6. Lancer le script

```bash
node index.js
```

Le résultat est enregistré dans :

```text
data/brazil-morocco-matches.json
```

---

## 7. Format du fichier de sortie

Structure simplifiée :

```json
{
  "generatedAt": "2026-06-18T12:00:00.000Z",
  "timezone": "Africa/Casablanca",
  "years": {
    "previous": 2025,
    "current": 2026
  },
  "teams": {
    "brazil": {
      "id": 0,
      "name": "Brazil"
    },
    "morocco": {
      "id": 0,
      "name": "Morocco"
    }
  },
  "teamMatches": {
    "brazil": {
      "2025": {
        "all": [],
        "played": [],
        "scheduledOrOther": []
      },
      "2026": {
        "all": [],
        "played": [],
        "scheduledOrOther": []
      }
    },
    "morocco": {
      "2025": {
        "all": [],
        "played": [],
        "scheduledOrOther": []
      },
      "2026": {
        "all": [],
        "played": [],
        "scheduledOrOther": []
      }
    }
  },
  "playedHeadToHead": {
    "teams": ["Morocco", "Brazil"],
    "count": 0,
    "matches": []
  }
}
```

Les IDs affichés dans cet exemple sont seulement illustratifs. Le script récupère les vrais IDs depuis l’API.

---

## 8. Requêtes API exécutées

### Trouver la sélection du Brésil

```http
GET /teams?search=Brazil
```

### Trouver la sélection du Maroc

```http
GET /teams?search=Morocco
```

### Matchs du Brésil en 2025

```http
GET /fixtures?team=BRAZIL_ID&from=2025-01-01&to=2025-12-31&timezone=Africa/Casablanca
```

### Matchs du Brésil en 2026

```http
GET /fixtures?team=BRAZIL_ID&from=2026-01-01&to=2026-12-31&timezone=Africa/Casablanca
```

### Matchs du Maroc en 2025

```http
GET /fixtures?team=MOROCCO_ID&from=2025-01-01&to=2025-12-31&timezone=Africa/Casablanca
```

### Matchs du Maroc en 2026

```http
GET /fixtures?team=MOROCCO_ID&from=2026-01-01&to=2026-12-31&timezone=Africa/Casablanca
```

### Confrontations Maroc–Brésil

```http
GET /fixtures/headtohead?h2h=MOROCCO_ID-BRAZIL_ID&timezone=Africa/Casablanca
```

Le script conserve seulement les confrontations dont le statut est :

```text
FT   = terminé après le temps réglementaire
AET  = terminé après prolongation
PEN  = terminé après tirs au but
```

---

## 9. Utiliser des années personnalisées

Le comportement par défaut est :

```text
année actuelle = année du serveur
année précédente = année actuelle - 1
```

Il est possible de forcer les années.

### Linux ou macOS

```bash
CURRENT_YEAR=2026 PREVIOUS_YEAR=2025 node index.js
```

### Windows PowerShell

```powershell
$env:CURRENT_YEAR="2026"
$env:PREVIOUS_YEAR="2025"
node index.js
```

---

## 10. Utiliser un autre fuseau horaire

### Linux ou macOS

```bash
TIMEZONE="UTC" node index.js
```

### Windows PowerShell

```powershell
$env:TIMEZONE="UTC"
node index.js
```

Par défaut :

```text
Africa/Casablanca
```

---

## 11. Récupérer uniquement les matchs déjà joués

Le fichier JSON contient trois listes pour chaque sélection :

```text
all
played
scheduledOrOther
```

Pour afficher seulement les matchs terminés du Maroc en 2026 :

```js
const data = require("./data/brazil-morocco-matches.json");

console.log(data.teamMatches.morocco["2026"].played);
```

Pour afficher seulement les confrontations Maroc–Brésil :

```js
const data = require("./data/brazil-morocco-matches.json");

console.log(data.playedHeadToHead.matches);
```

---

## 12. Exemple d’affichage d’un score

Chaque match formaté contient notamment :

```json
{
  "date": "2026-01-01T20:00:00+00:00",
  "home": {
    "name": "Morocco"
  },
  "away": {
    "name": "Brazil"
  },
  "goals": {
    "home": 0,
    "away": 0
  },
  "status": {
    "short": "FT"
  }
}
```

Affichage simple :

```js
function printMatch(match) {
  console.log(
    `${match.home.name} ${match.goals.home} - ` +
    `${match.goals.away} ${match.away.name}`
  );
}
```

---

## 13. Exemple cURL

Remplacer les IDs et la clé API.

```bash
curl --request GET \
  --url "https://v3.football.api-sports.io/fixtures/headtohead?h2h=MOROCCO_ID-BRAZIL_ID&timezone=Africa%2FCasablanca" \
  --header "xapisportskey: VOTRE_CLE_API"
```

---

## 14. Gestion des réponses vides

Une réponse vide peut ressembler à ceci :

```json
{
  "results": 0,
  "response": []
}
```

Causes possibles :

- l’équipe trouvée n’est pas la sélection nationale attendue ;
- aucune rencontre n’est enregistrée pour la période ;
- l’historique n’est pas disponible avec le plan API utilisé ;
- une compétition ou une ancienne saison n’est pas couverte ;
- les données ne sont pas encore ajoutées à l’API.

Le script ne plante pas quand `response` est vide. Il enregistre simplement une liste vide.

---

## 15. Quota API

Le script effectue normalement sept requêtes :

1. recherche du Brésil ;
2. recherche du Maroc ;
3. matchs du Brésil, année précédente ;
4. matchs du Brésil, année actuelle ;
5. matchs du Maroc, année précédente ;
6. matchs du Maroc, année actuelle ;
7. confrontations Maroc–Brésil.

Les headers de quota retournés par l’API sont conservés dans certaines parties du JSON.

Pour réduire la consommation :

- stocker le résultat en cache ;
- ne pas relancer le script inutilement ;
- réutiliser les IDs des équipes une fois validés ;
- mettre à jour les matchs passés moins souvent que les matchs futurs.

---

## 16. Sécurité

À ne pas faire dans un navigateur :

```js
fetch("https://v3.football.api-sports.io/fixtures", {
  headers: {
    "xapisportskey": "CLE_VISIBLE"
  }
});
```

La clé serait visible par les utilisateurs.

Architecture recommandée :

```text
Frontend
   |
   v
Backend Node.js
   |
   v
API-FOOTBALL
```

---

## 17. Problèmes fréquents

### `API_FOOTBALL_KEY est absente`

Configurer la variable d’environnement avant de lancer le script.

### Équipe nationale introuvable

Vérifier le contenu retourné par :

```http
GET /teams?search=Brazil
GET /teams?search=Morocco
```

Le script sélectionne uniquement les résultats où :

```json
{
  "team": {
    "national": true
  }
}
```

### Aucun match Maroc–Brésil

Cela signifie que l’API n’a retourné aucune confrontation terminée accessible pour le compte utilisé. Cela ne prouve pas nécessairement qu’aucune rencontre historique n’a existé.

### Match futur présent en 2026

C’est normal. La liste `all` contient tous les matchs disponibles pour l’année. La liste `played` contient seulement les matchs terminés.

---

## 18. Variante avec des IDs fixes

Après avoir confirmé les IDs, ils peuvent être placés dans des variables d’environnement :

```bash
export BRAZIL_TEAM_ID="ID_BRESIL"
export MOROCCO_TEAM_ID="ID_MAROC"
```

Cette optimisation évite deux recherches `/teams`, mais il faut toujours obtenir les IDs depuis l’API et ne pas les inventer.

---

## 19. Résumé

Entrées principales :

```text
API_FOOTBALL_KEY
CURRENT_YEAR
PREVIOUS_YEAR
TIMEZONE
```

Valeurs par défaut en 2026 :

```text
CURRENT_YEAR=2026
PREVIOUS_YEAR=2025
TIMEZONE=Africa/Casablanca
```

Sortie principale :

```text
data/brazil-morocco-matches.json
```

Données récupérées :

```text
Brésil 2025
Brésil 2026
Maroc 2025
Maroc 2026
Confrontations terminées Maroc–Brésil
```
