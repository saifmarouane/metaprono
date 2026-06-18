# README — Base de données locale API-FOOTBALL v3

> Document de conception MySQL pour stocker localement les données retournées par API-FOOTBALL v3.
> Ce schéma est une proposition d’architecture locale : API-FOOTBALL retourne du JSON et n’impose pas ces tables SQL.

## 1. Objectif

Ce README décrit :

- les 14 tables principales ;
- le rôle de chaque table ;
- chaque colonne, son type, son caractère obligatoire ou nullable ;
- une explication simple de chaque colonne ;
- une valeur d’exemple pour chaque colonne ;
- les clés primaires, clés étrangères, index et contraintes ;
- un exemple de ligne JSON et une structure SQL de départ.

## 2. Conventions générales

| Convention | Signification |
|---|---|
| `id` API | Quand l’API fournit un identifiant stable, il est utilisé directement comme clé primaire. |
| `AUTO_INCREMENT` | Utilisé seulement pour les lignes locales qui n’ont pas d’identifiant API propre. |
| `created_at` | Date d’insertion locale. |
| `updated_at` | Date de dernière synchronisation locale. |
| `raw_data` / `coverage_json` | Copie JSON facultative pour conserver les champs non normalisés. |
| `BOOLEAN` | En MySQL, généralement stocké sous forme `TINYINT(1)` : `0` = faux, `1` = vrai. |
| `NULL` | La donnée peut ne pas être fournie par l’API. |
| `season` | Année de début de saison : par exemple `2025` pour la saison 2025-2026. |

## 3. Ordre conseillé de création

1. `football_countries`
2. `football_leagues`
3. `football_league_seasons`
4. `football_venues`
5. `football_teams`
6. `football_fixtures`
7. `football_fixture_events`
8. `football_fixture_statistics`
9. `football_fixture_lineups`
10. `football_players`
11. `football_player_statistics`
12. `football_standings`
13. `football_injuries`
14. `football_odds`

## 4. Vue générale des relations

```text
football_countries
 ├── football_leagues
 │    ├── football_league_seasons
 │    ├── football_fixtures
 │    ├── football_player_statistics
 │    ├── football_standings
 │    ├── football_injuries
 │    └── football_odds
 └── football_teams

football_venues
 ├── football_teams
 └── football_fixtures

football_teams
 ├── football_fixtures
 ├── football_fixture_events
 ├── football_fixture_statistics
 ├── football_fixture_lineups
 ├── football_player_statistics
 ├── football_standings
 └── football_injuries

football_players
 ├── football_player_statistics
 └── football_injuries

football_fixtures
 ├── football_fixture_events
 ├── football_fixture_statistics
 ├── football_fixture_lineups
 ├── football_injuries
 └── football_odds
```

## 5. Table `football_countries`

**Endpoint principal :** `/countries`

**Rôle :** Stocke le référentiel des pays disponibles dans API-FOOTBALL.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Clé primaire locale. | `1` |
| `name` | `VARCHAR(100)` | NON | Nom du pays retourné par l’API. | `France` |
| `code` | `VARCHAR(10)` | OUI | Code du pays utilisé notamment pour le drapeau. | `FR` |
| `flag` | `VARCHAR(500)` | OUI | URL du drapeau du pays. | `https://media.api-sports.io/flags/fr.svg` |
| `created_at` | `TIMESTAMP` | OUI | Date de création de la ligne dans la base locale. | `2026-06-18 10:00:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:00:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_football_countries_name` (`name`)`
- `UNIQUE KEY `uq_football_countries_code` (`code`)`

### Exemple de ligne JSON

```json
{
  "id": 1,
  "name": "France",
  "code": "FR",
  "flag": "https://media.api-sports.io/flags/fr.svg"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_countries` (
  `id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(10) NULL,
  `flag` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_football_countries_name` (`name`),
  UNIQUE KEY `uq_football_countries_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 6. Table `football_leagues`

**Endpoint principal :** `/leagues`

**Rôle :** Stocke les compétitions : championnats, coupes et compétitions internationales.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Identifiant unique de la compétition fourni par API-FOOTBALL. | `61` |
| `country_id` | `BIGINT UNSIGNED` | OUI | Pays associé à la compétition. | `1` |
| `name` | `VARCHAR(150)` | NON | Nom de la compétition. | `Ligue 1` |
| `type` | `VARCHAR(30)` | OUI | Type de compétition. | `League` |
| `logo` | `VARCHAR(500)` | OUI | URL du logo de la compétition. | `https://media.api-sports.io/football/leagues/61.png` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:05:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:05:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_football_leagues_country_id` (`country_id`)`
- `CONSTRAINT `fk_football_leagues_country` FOREIGN KEY (`country_id`) REFERENCES `football_countries` (`id`)`

### Exemple de ligne JSON

```json
{
  "id": 61,
  "country_id": 1,
  "name": "Ligue 1",
  "type": "League",
  "logo": "https://media.api-sports.io/football/leagues/61.png"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_leagues` (
  `id` BIGINT UNSIGNED NOT NULL,
  `country_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `type` VARCHAR(30) NULL,
  `logo` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_football_leagues_country_id` (`country_id`),
  CONSTRAINT `fk_football_leagues_country` FOREIGN KEY (`country_id`) REFERENCES `football_countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 7. Table `football_league_seasons`

**Endpoint principal :** `/leagues et /leagues/seasons`

**Rôle :** Stocke les saisons d’une compétition ainsi que sa couverture fonctionnelle.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de la saison d’une ligue. | `1001` |
| `league_id` | `BIGINT UNSIGNED` | NON | Compétition concernée. | `61` |
| `season` | `SMALLINT UNSIGNED` | NON | Année de début de la saison. | `2025` |
| `start_date` | `DATE` | OUI | Date de début de la saison. | `2025-08-15` |
| `end_date` | `DATE` | OUI | Date de fin de la saison. | `2026-05-23` |
| `is_current` | `BOOLEAN` | NON | Indique si la saison est actuellement active. | `1` |
| `coverage_events` | `BOOLEAN` | NON | Disponibilité des événements de match. | `1` |
| `coverage_lineups` | `BOOLEAN` | NON | Disponibilité des compositions. | `1` |
| `coverage_statistics_fixtures` | `BOOLEAN` | NON | Disponibilité des statistiques de match. | `1` |
| `coverage_statistics_players` | `BOOLEAN` | NON | Disponibilité des statistiques joueurs par match. | `1` |
| `coverage_standings` | `BOOLEAN` | NON | Disponibilité du classement. | `1` |
| `coverage_players` | `BOOLEAN` | NON | Disponibilité des joueurs. | `1` |
| `coverage_top_scorers` | `BOOLEAN` | NON | Disponibilité du classement des buteurs. | `1` |
| `coverage_top_assists` | `BOOLEAN` | NON | Disponibilité du classement des passeurs. | `1` |
| `coverage_top_cards` | `BOOLEAN` | NON | Disponibilité des classements de cartons. | `1` |
| `coverage_injuries` | `BOOLEAN` | NON | Disponibilité des blessures et absences. | `1` |
| `coverage_predictions` | `BOOLEAN` | NON | Disponibilité des prédictions. | `1` |
| `coverage_odds` | `BOOLEAN` | NON | Disponibilité des cotes. | `0` |
| `coverage_json` | `JSON` | OUI | Copie brute de l’objet coverage pour conserver les futurs champs. | `{"standings":true,"players":true}` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:10:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:10:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_league_season` (`league_id`, `season`)`
- `CONSTRAINT `fk_league_seasons_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`

### Exemple de ligne JSON

```json
{
  "league_id": 61,
  "season": 2025,
  "start_date": "2025-08-15",
  "end_date": "2026-05-23",
  "is_current": true,
  "coverage_standings": true,
  "coverage_players": true,
  "coverage_odds": false
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_league_seasons` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `league_id` BIGINT UNSIGNED NOT NULL,
  `season` SMALLINT UNSIGNED NOT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `is_current` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_events` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_lineups` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_statistics_fixtures` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_statistics_players` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_standings` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_players` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_top_scorers` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_top_assists` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_top_cards` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_injuries` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_predictions` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_odds` BOOLEAN NOT NULL DEFAULT 0,
  `coverage_json` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_league_season` (`league_id`, `season`),
  CONSTRAINT `fk_league_seasons_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 8. Table `football_venues`

**Endpoint principal :** `/venues`

**Rôle :** Stocke les stades et les lieux où se déroulent les matchs.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Identifiant du stade fourni par l’API. | `671` |
| `name` | `VARCHAR(200)` | OUI | Nom du stade. | `Parc des Princes` |
| `address` | `VARCHAR(255)` | OUI | Adresse du stade. | `24 Rue du Commandant Guilbaud` |
| `city` | `VARCHAR(150)` | OUI | Ville du stade. | `Paris` |
| `country` | `VARCHAR(100)` | OUI | Pays du stade. | `France` |
| `capacity` | `INT UNSIGNED` | OUI | Capacité maximale annoncée. | `47929` |
| `surface` | `VARCHAR(100)` | OUI | Type de surface. | `grass` |
| `image` | `VARCHAR(500)` | OUI | URL de l’image du stade. | `https://media.api-sports.io/football/venues/671.png` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:15:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:15:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_venues_city` (`city`)`
- `KEY `idx_venues_country` (`country`)`

### Exemple de ligne JSON

```json
{
  "id": 671,
  "name": "Parc des Princes",
  "city": "Paris",
  "country": "France",
  "capacity": 47929,
  "surface": "grass"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_venues` (
  `id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(200) NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(150) NULL,
  `country` VARCHAR(100) NULL,
  `capacity` INT UNSIGNED NULL,
  `surface` VARCHAR(100) NULL,
  `image` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_venues_city` (`city`),
  KEY `idx_venues_country` (`country`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 9. Table `football_teams`

**Endpoint principal :** `/teams`

**Rôle :** Stocke les clubs et sélections nationales.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Identifiant de l’équipe fourni par l’API. | `85` |
| `venue_id` | `BIGINT UNSIGNED` | OUI | Stade principal de l’équipe. | `671` |
| `country_id` | `BIGINT UNSIGNED` | OUI | Pays associé à l’équipe. | `1` |
| `name` | `VARCHAR(150)` | NON | Nom complet de l’équipe. | `Paris Saint Germain` |
| `code` | `VARCHAR(20)` | OUI | Code court de l’équipe. | `PAR` |
| `country_name` | `VARCHAR(100)` | OUI | Nom du pays tel que retourné par l’API. | `France` |
| `founded` | `SMALLINT UNSIGNED` | OUI | Année de fondation. | `1970` |
| `national` | `BOOLEAN` | NON | Indique s’il s’agit d’une sélection nationale. | `0` |
| `logo` | `VARCHAR(500)` | OUI | URL du logo de l’équipe. | `https://media.api-sports.io/football/teams/85.png` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:20:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:20:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_teams_venue_id` (`venue_id`)`
- `KEY `idx_teams_country_id` (`country_id`)`
- `CONSTRAINT `fk_teams_venue` FOREIGN KEY (`venue_id`) REFERENCES `football_venues` (`id`)`
- `CONSTRAINT `fk_teams_country` FOREIGN KEY (`country_id`) REFERENCES `football_countries` (`id`)`

### Exemple de ligne JSON

```json
{
  "id": 85,
  "venue_id": 671,
  "country_id": 1,
  "name": "Paris Saint Germain",
  "code": "PAR",
  "country_name": "France",
  "founded": 1970,
  "national": false,
  "logo": "https://media.api-sports.io/football/teams/85.png"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_teams` (
  `id` BIGINT UNSIGNED NOT NULL,
  `venue_id` BIGINT UNSIGNED NULL,
  `country_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NULL,
  `country_name` VARCHAR(100) NULL,
  `founded` SMALLINT UNSIGNED NULL,
  `national` BOOLEAN NOT NULL DEFAULT 0,
  `logo` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_teams_venue_id` (`venue_id`),
  KEY `idx_teams_country_id` (`country_id`),
  CONSTRAINT `fk_teams_venue` FOREIGN KEY (`venue_id`) REFERENCES `football_venues` (`id`),
  CONSTRAINT `fk_teams_country` FOREIGN KEY (`country_id`) REFERENCES `football_countries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 10. Table `football_fixtures`

**Endpoint principal :** `/fixtures`

**Rôle :** Table centrale des matchs : calendrier, équipes, score, statut, stade et périodes.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Identifiant unique du match fourni par l’API. | `1200001` |
| `league_id` | `BIGINT UNSIGNED` | NON | Compétition du match. | `61` |
| `season` | `SMALLINT UNSIGNED` | NON | Saison du match. | `2025` |
| `round` | `VARCHAR(150)` | OUI | Journée ou phase du match. | `Regular Season - 1` |
| `home_team_id` | `BIGINT UNSIGNED` | NON | Équipe à domicile. | `85` |
| `away_team_id` | `BIGINT UNSIGNED` | NON | Équipe à l’extérieur. | `81` |
| `venue_id` | `BIGINT UNSIGNED` | OUI | Stade du match. | `671` |
| `referee` | `VARCHAR(150)` | OUI | Nom de l’arbitre. | `Clément Turpin` |
| `timezone` | `VARCHAR(100)` | OUI | Fuseau horaire utilisé dans la réponse. | `Africa/Casablanca` |
| `fixture_date` | `DATETIME` | NON | Date et heure du match. | `2026-01-18 20:45:00` |
| `fixture_timestamp` | `BIGINT UNSIGNED` | OUI | Timestamp Unix de début du match. | `1768769100` |
| `first_period_timestamp` | `BIGINT UNSIGNED` | OUI | Timestamp de début de la première période. | `1768769100` |
| `second_period_timestamp` | `BIGINT UNSIGNED` | OUI | Timestamp de début de la deuxième période. | `1768772700` |
| `venue_name` | `VARCHAR(200)` | OUI | Nom du stade copié dans le match. | `Parc des Princes` |
| `venue_city` | `VARCHAR(150)` | OUI | Ville du stade copiée dans le match. | `Paris` |
| `status_long` | `VARCHAR(100)` | OUI | Libellé long du statut. | `Match Finished` |
| `status_short` | `VARCHAR(10)` | OUI | Code court du statut. | `FT` |
| `elapsed` | `SMALLINT UNSIGNED` | OUI | Minute de jeu écoulée. | `90` |
| `extra_time` | `SMALLINT UNSIGNED` | OUI | Temps additionnel ou minute supplémentaire selon le contexte API. | `5` |
| `home_winner` | `BOOLEAN` | OUI | Indique si l’équipe à domicile est gagnante. | `1` |
| `away_winner` | `BOOLEAN` | OUI | Indique si l’équipe à l’extérieur est gagnante. | `0` |
| `goals_home` | `SMALLINT` | OUI | Nombre total de buts à domicile. | `2` |
| `goals_away` | `SMALLINT` | OUI | Nombre total de buts à l’extérieur. | `1` |
| `halftime_home` | `SMALLINT` | OUI | Score domicile à la mi-temps. | `1` |
| `halftime_away` | `SMALLINT` | OUI | Score extérieur à la mi-temps. | `0` |
| `fulltime_home` | `SMALLINT` | OUI | Score domicile à la fin du temps réglementaire. | `2` |
| `fulltime_away` | `SMALLINT` | OUI | Score extérieur à la fin du temps réglementaire. | `1` |
| `extratime_home` | `SMALLINT` | OUI | Score domicile après prolongation. | `NULL` |
| `extratime_away` | `SMALLINT` | OUI | Score extérieur après prolongation. | `NULL` |
| `penalty_home` | `SMALLINT` | OUI | Tirs au but réussis par l’équipe à domicile. | `NULL` |
| `penalty_away` | `SMALLINT` | OUI | Tirs au but réussis par l’équipe à l’extérieur. | `NULL` |
| `standings_available` | `BOOLEAN` | NON | Indique si le match compte pour le classement. | `1` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 18:00:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière synchronisation locale. | `2026-01-18 22:45:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_fixtures_date` (`fixture_date`)`
- `KEY `idx_fixtures_status` (`status_short`)`
- `KEY `idx_fixtures_league_season` (`league_id`, `season`)`
- `KEY `idx_fixtures_home_team` (`home_team_id`)`
- `KEY `idx_fixtures_away_team` (`away_team_id`)`
- `CONSTRAINT `fk_fixtures_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`
- `CONSTRAINT `fk_fixtures_home_team` FOREIGN KEY (`home_team_id`) REFERENCES `football_teams` (`id`)`
- `CONSTRAINT `fk_fixtures_away_team` FOREIGN KEY (`away_team_id`) REFERENCES `football_teams` (`id`)`
- `CONSTRAINT `fk_fixtures_venue` FOREIGN KEY (`venue_id`) REFERENCES `football_venues` (`id`)`

### Exemple de ligne JSON

```json
{
  "id": 1200001,
  "league_id": 61,
  "season": 2025,
  "round": "Regular Season - 1",
  "home_team_id": 85,
  "away_team_id": 81,
  "venue_id": 671,
  "fixture_date": "2026-01-18 20:45:00",
  "status_short": "FT",
  "goals_home": 2,
  "goals_away": 1
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_fixtures` (
  `id` BIGINT UNSIGNED NOT NULL,
  `league_id` BIGINT UNSIGNED NOT NULL,
  `season` SMALLINT UNSIGNED NOT NULL,
  `round` VARCHAR(150) NULL,
  `home_team_id` BIGINT UNSIGNED NOT NULL,
  `away_team_id` BIGINT UNSIGNED NOT NULL,
  `venue_id` BIGINT UNSIGNED NULL,
  `referee` VARCHAR(150) NULL,
  `timezone` VARCHAR(100) NULL,
  `fixture_date` DATETIME NOT NULL,
  `fixture_timestamp` BIGINT UNSIGNED NULL,
  `first_period_timestamp` BIGINT UNSIGNED NULL,
  `second_period_timestamp` BIGINT UNSIGNED NULL,
  `venue_name` VARCHAR(200) NULL,
  `venue_city` VARCHAR(150) NULL,
  `status_long` VARCHAR(100) NULL,
  `status_short` VARCHAR(10) NULL,
  `elapsed` SMALLINT UNSIGNED NULL,
  `extra_time` SMALLINT UNSIGNED NULL,
  `home_winner` BOOLEAN NULL,
  `away_winner` BOOLEAN NULL,
  `goals_home` SMALLINT NULL,
  `goals_away` SMALLINT NULL,
  `halftime_home` SMALLINT NULL,
  `halftime_away` SMALLINT NULL,
  `fulltime_home` SMALLINT NULL,
  `fulltime_away` SMALLINT NULL,
  `extratime_home` SMALLINT NULL,
  `extratime_away` SMALLINT NULL,
  `penalty_home` SMALLINT NULL,
  `penalty_away` SMALLINT NULL,
  `standings_available` BOOLEAN NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fixtures_date` (`fixture_date`),
  KEY `idx_fixtures_status` (`status_short`),
  KEY `idx_fixtures_league_season` (`league_id`, `season`),
  KEY `idx_fixtures_home_team` (`home_team_id`),
  KEY `idx_fixtures_away_team` (`away_team_id`),
  CONSTRAINT `fk_fixtures_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`),
  CONSTRAINT `fk_fixtures_home_team` FOREIGN KEY (`home_team_id`) REFERENCES `football_teams` (`id`),
  CONSTRAINT `fk_fixtures_away_team` FOREIGN KEY (`away_team_id`) REFERENCES `football_teams` (`id`),
  CONSTRAINT `fk_fixtures_venue` FOREIGN KEY (`venue_id`) REFERENCES `football_venues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 11. Table `football_fixture_events`

**Endpoint principal :** `/fixtures/events`

**Rôle :** Stocke la chronologie des buts, cartons, remplacements et décisions VAR.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de l’événement. | `50001` |
| `fixture_id` | `BIGINT UNSIGNED` | NON | Match concerné. | `1200001` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe concernée. | `85` |
| `player_id` | `BIGINT UNSIGNED` | OUI | Joueur principal concerné. | `276` |
| `player_name` | `VARCHAR(150)` | OUI | Nom du joueur principal tel que retourné par l’API. | `Example Player` |
| `assist_player_id` | `BIGINT UNSIGNED` | OUI | Joueur ayant effectué la passe décisive ou second joueur lié. | `277` |
| `assist_player_name` | `VARCHAR(150)` | OUI | Nom du joueur assistant. | `Example Assistant` |
| `elapsed` | `SMALLINT UNSIGNED` | OUI | Minute réglementaire de l’événement. | `34` |
| `extra_time` | `SMALLINT UNSIGNED` | OUI | Minute additionnelle. | `2` |
| `event_type` | `VARCHAR(50)` | NON | Catégorie de l’événement. | `Goal` |
| `event_detail` | `VARCHAR(150)` | OUI | Détail précis de l’événement. | `Normal Goal` |
| `comments` | `TEXT` | OUI | Commentaire complémentaire retourné par l’API. | `Right footed shot` |
| `sort_order` | `INT UNSIGNED` | OUI | Ordre local d’affichage de l’événement. | `10` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 21:20:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-01-18 21:20:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_fixture_events_fixture` (`fixture_id`)`
- `KEY `idx_fixture_events_team` (`team_id`)`
- `KEY `idx_fixture_events_player` (`player_id`)`
- `CONSTRAINT `fk_fixture_events_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`)`
- `CONSTRAINT `fk_fixture_events_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`

### Exemple de ligne JSON

```json
{
  "fixture_id": 1200001,
  "team_id": 85,
  "player_id": 276,
  "player_name": "Example Player",
  "assist_player_id": 277,
  "assist_player_name": "Example Assistant",
  "elapsed": 34,
  "extra_time": 0,
  "event_type": "Goal",
  "event_detail": "Normal Goal"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_fixture_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `fixture_id` BIGINT UNSIGNED NOT NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `player_id` BIGINT UNSIGNED NULL,
  `player_name` VARCHAR(150) NULL,
  `assist_player_id` BIGINT UNSIGNED NULL,
  `assist_player_name` VARCHAR(150) NULL,
  `elapsed` SMALLINT UNSIGNED NULL,
  `extra_time` SMALLINT UNSIGNED NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `event_detail` VARCHAR(150) NULL,
  `comments` TEXT NULL,
  `sort_order` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fixture_events_fixture` (`fixture_id`),
  KEY `idx_fixture_events_team` (`team_id`),
  KEY `idx_fixture_events_player` (`player_id`),
  CONSTRAINT `fk_fixture_events_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`),
  CONSTRAINT `fk_fixture_events_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 12. Table `football_fixture_statistics`

**Endpoint principal :** `/fixtures/statistics`

**Rôle :** Stocke les statistiques d’un match, une ligne par équipe, période et type de statistique.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de la statistique. | `70001` |
| `fixture_id` | `BIGINT UNSIGNED` | NON | Match concerné. | `1200001` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe concernée. | `85` |
| `period` | `VARCHAR(10)` | NON | Période des statistiques. | `ALL` |
| `statistic_type` | `VARCHAR(100)` | NON | Nom de la statistique. | `Ball Possession` |
| `statistic_value` | `VARCHAR(100)` | OUI | Valeur brute retournée par l’API. | `62%` |
| `numeric_value` | `DECIMAL(15,4)` | OUI | Version numérique normalisée de la valeur. | `62.0000` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 21:00:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière mise à jour locale. | `2026-01-18 22:45:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_fixture_stat` (`fixture_id`, `team_id`, `period`, `statistic_type`)`
- `CONSTRAINT `fk_fixture_statistics_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`)`
- `CONSTRAINT `fk_fixture_statistics_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`

### Exemple de ligne JSON

```json
{
  "fixture_id": 1200001,
  "team_id": 85,
  "period": "ALL",
  "statistic_type": "Ball Possession",
  "statistic_value": "62%",
  "numeric_value": 62.0
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_fixture_statistics` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `fixture_id` BIGINT UNSIGNED NOT NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `period` VARCHAR(10) NOT NULL,
  `statistic_type` VARCHAR(100) NOT NULL,
  `statistic_value` VARCHAR(100) NULL,
  `numeric_value` DECIMAL(15,4) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fixture_stat` (`fixture_id`, `team_id`, `period`, `statistic_type`),
  CONSTRAINT `fk_fixture_statistics_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`),
  CONSTRAINT `fk_fixture_statistics_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 13. Table `football_fixture_lineups`

**Endpoint principal :** `/fixtures/lineups`

**Rôle :** Stocke la composition d’une équipe pour un match : formation, coach, couleurs, titulaires et remplaçants.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de la composition. | `80001` |
| `fixture_id` | `BIGINT UNSIGNED` | NON | Match concerné. | `1200001` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe concernée. | `85` |
| `formation` | `VARCHAR(30)` | OUI | Formation tactique. | `4-3-3` |
| `coach_id` | `BIGINT UNSIGNED` | OUI | Identifiant du coach fourni par l’API. | `2` |
| `coach_name` | `VARCHAR(150)` | OUI | Nom du coach. | `Example Coach` |
| `coach_photo` | `VARCHAR(500)` | OUI | URL de la photo du coach. | `https://media.api-sports.io/football/coachs/2.png` |
| `player_primary_color` | `VARCHAR(20)` | OUI | Couleur principale du maillot des joueurs. | `0000FF` |
| `player_number_color` | `VARCHAR(20)` | OUI | Couleur du numéro des joueurs. | `FFFFFF` |
| `player_border_color` | `VARCHAR(20)` | OUI | Couleur de bordure du maillot des joueurs. | `FF0000` |
| `goalkeeper_primary_color` | `VARCHAR(20)` | OUI | Couleur principale du maillot du gardien. | `00FF00` |
| `goalkeeper_number_color` | `VARCHAR(20)` | OUI | Couleur du numéro du gardien. | `000000` |
| `goalkeeper_border_color` | `VARCHAR(20)` | OUI | Couleur de bordure du maillot du gardien. | `FFFFFF` |
| `start_xi` | `JSON` | OUI | Liste JSON des onze titulaires. | `[{"player_id":276,"name":"Example Player","number":10,"position":"M","grid":"3:2"}]` |
| `substitutes` | `JSON` | OUI | Liste JSON des remplaçants. | `[{"player_id":300,"name":"Sub Player","number":18,"position":"F"}]` |
| `raw_data` | `JSON` | OUI | Réponse brute de la composition pour audit ou évolution du schéma. | `{"formation":"4-3-3"}` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 19:45:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-01-18 20:15:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_fixture_lineup` (`fixture_id`, `team_id`)`
- `CONSTRAINT `fk_fixture_lineups_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`)`
- `CONSTRAINT `fk_fixture_lineups_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`

### Exemple de ligne JSON

```json
{
  "fixture_id": 1200001,
  "team_id": 85,
  "formation": "4-3-3",
  "coach_id": 2,
  "coach_name": "Example Coach",
  "start_xi": [
    {
      "player_id": 276,
      "name": "Example Player",
      "number": 10,
      "position": "M",
      "grid": "3:2"
    }
  ]
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_fixture_lineups` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `fixture_id` BIGINT UNSIGNED NOT NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `formation` VARCHAR(30) NULL,
  `coach_id` BIGINT UNSIGNED NULL,
  `coach_name` VARCHAR(150) NULL,
  `coach_photo` VARCHAR(500) NULL,
  `player_primary_color` VARCHAR(20) NULL,
  `player_number_color` VARCHAR(20) NULL,
  `player_border_color` VARCHAR(20) NULL,
  `goalkeeper_primary_color` VARCHAR(20) NULL,
  `goalkeeper_number_color` VARCHAR(20) NULL,
  `goalkeeper_border_color` VARCHAR(20) NULL,
  `start_xi` JSON NULL,
  `substitutes` JSON NULL,
  `raw_data` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fixture_lineup` (`fixture_id`, `team_id`),
  CONSTRAINT `fk_fixture_lineups_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`),
  CONSTRAINT `fk_fixture_lineups_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 14. Table `football_players`

**Endpoint principal :** `/players/profiles et /players`

**Rôle :** Stocke les informations générales et relativement stables des joueurs.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED` | NON | Identifiant unique du joueur fourni par l’API. | `276` |
| `name` | `VARCHAR(150)` | NON | Nom d’affichage complet du joueur. | `Example Player` |
| `firstname` | `VARCHAR(100)` | OUI | Prénom du joueur. | `Example` |
| `lastname` | `VARCHAR(100)` | OUI | Nom de famille du joueur. | `Player` |
| `age` | `SMALLINT UNSIGNED` | OUI | Âge retourné par l’API au moment de la synchronisation. | `27` |
| `birth_date` | `DATE` | OUI | Date de naissance. | `1999-02-10` |
| `birth_place` | `VARCHAR(150)` | OUI | Lieu de naissance. | `Paris` |
| `birth_country` | `VARCHAR(100)` | OUI | Pays de naissance. | `France` |
| `nationality` | `VARCHAR(100)` | OUI | Nationalité sportive ou déclarée. | `France` |
| `height` | `VARCHAR(30)` | OUI | Taille dans le format retourné par l’API. | `180 cm` |
| `weight` | `VARCHAR(30)` | OUI | Poids dans le format retourné par l’API. | `75 kg` |
| `injured` | `BOOLEAN` | NON | Indique si le joueur est signalé blessé dans le contexte retourné. | `0` |
| `photo` | `VARCHAR(500)` | OUI | URL de la photo du joueur. | `https://media.api-sports.io/football/players/276.png` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:30:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-06-18 10:30:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_players_name` (`name`)`
- `KEY `idx_players_nationality` (`nationality`)`

### Exemple de ligne JSON

```json
{
  "id": 276,
  "name": "Example Player",
  "firstname": "Example",
  "lastname": "Player",
  "age": 27,
  "birth_date": "1999-02-10",
  "nationality": "France",
  "height": "180 cm",
  "weight": "75 kg",
  "injured": false
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_players` (
  `id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `firstname` VARCHAR(100) NULL,
  `lastname` VARCHAR(100) NULL,
  `age` SMALLINT UNSIGNED NULL,
  `birth_date` DATE NULL,
  `birth_place` VARCHAR(150) NULL,
  `birth_country` VARCHAR(100) NULL,
  `nationality` VARCHAR(100) NULL,
  `height` VARCHAR(30) NULL,
  `weight` VARCHAR(30) NULL,
  `injured` BOOLEAN NOT NULL DEFAULT 0,
  `photo` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_players_name` (`name`),
  KEY `idx_players_nationality` (`nationality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 15. Table `football_player_statistics`

**Endpoint principal :** `/players`

**Rôle :** Stocke les statistiques cumulées d’un joueur pour une équipe, une ligue et une saison.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale des statistiques. | `90001` |
| `player_id` | `BIGINT UNSIGNED` | NON | Joueur concerné. | `276` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe concernée. | `85` |
| `league_id` | `BIGINT UNSIGNED` | NON | Compétition concernée. | `61` |
| `season` | `SMALLINT UNSIGNED` | NON | Saison concernée. | `2025` |
| `appearances` | `SMALLINT UNSIGNED` | OUI | Nombre d’apparitions. | `28` |
| `lineups` | `SMALLINT UNSIGNED` | OUI | Nombre de titularisations. | `24` |
| `minutes` | `INT UNSIGNED` | OUI | Nombre total de minutes jouées. | `2150` |
| `shirt_number` | `SMALLINT UNSIGNED` | OUI | Numéro de maillot. | `10` |
| `position` | `VARCHAR(50)` | OUI | Position principale. | `Midfielder` |
| `rating` | `DECIMAL(5,2)` | OUI | Note moyenne calculée. | `7.45` |
| `captain` | `BOOLEAN` | NON | Indique si le joueur a été capitaine dans ce contexte. | `0` |
| `substitutes_in` | `SMALLINT UNSIGNED` | OUI | Nombre d’entrées en jeu. | `4` |
| `substitutes_out` | `SMALLINT UNSIGNED` | OUI | Nombre de sorties. | `12` |
| `substitutes_bench` | `SMALLINT UNSIGNED` | OUI | Nombre de présences sur le banc. | `6` |
| `shots_total` | `SMALLINT UNSIGNED` | OUI | Nombre total de tirs. | `65` |
| `shots_on` | `SMALLINT UNSIGNED` | OUI | Nombre de tirs cadrés. | `31` |
| `goals_total` | `SMALLINT UNSIGNED` | OUI | Nombre de buts marqués. | `12` |
| `goals_conceded` | `SMALLINT UNSIGNED` | OUI | Nombre de buts encaissés, surtout pertinent pour les gardiens. | `0` |
| `assists` | `SMALLINT UNSIGNED` | OUI | Nombre de passes décisives. | `8` |
| `saves` | `SMALLINT UNSIGNED` | OUI | Nombre d’arrêts, surtout pertinent pour les gardiens. | `0` |
| `passes_total` | `INT UNSIGNED` | OUI | Nombre total de passes. | `1450` |
| `passes_key` | `SMALLINT UNSIGNED` | OUI | Nombre de passes clés. | `44` |
| `passes_accuracy` | `DECIMAL(5,2)` | OUI | Pourcentage moyen de passes réussies. | `87.50` |
| `tackles_total` | `SMALLINT UNSIGNED` | OUI | Nombre total de tacles. | `38` |
| `tackles_blocks` | `SMALLINT UNSIGNED` | OUI | Nombre de tirs ou actions bloqués. | `7` |
| `tackles_interceptions` | `SMALLINT UNSIGNED` | OUI | Nombre d’interceptions. | `21` |
| `duels_total` | `SMALLINT UNSIGNED` | OUI | Nombre total de duels. | `190` |
| `duels_won` | `SMALLINT UNSIGNED` | OUI | Nombre de duels gagnés. | `112` |
| `dribbles_attempts` | `SMALLINT UNSIGNED` | OUI | Nombre de dribbles tentés. | `72` |
| `dribbles_success` | `SMALLINT UNSIGNED` | OUI | Nombre de dribbles réussis. | `45` |
| `dribbles_past` | `SMALLINT UNSIGNED` | OUI | Nombre de fois où le joueur a été éliminé par un dribble. | `9` |
| `fouls_drawn` | `SMALLINT UNSIGNED` | OUI | Nombre de fautes subies. | `48` |
| `fouls_committed` | `SMALLINT UNSIGNED` | OUI | Nombre de fautes commises. | `27` |
| `cards_yellow` | `SMALLINT UNSIGNED` | OUI | Nombre de cartons jaunes. | `4` |
| `cards_yellow_red` | `SMALLINT UNSIGNED` | OUI | Nombre de doubles jaunes entraînant un rouge. | `0` |
| `cards_red` | `SMALLINT UNSIGNED` | OUI | Nombre de cartons rouges directs. | `0` |
| `penalties_won` | `SMALLINT UNSIGNED` | OUI | Nombre de penalties obtenus. | `2` |
| `penalties_committed` | `SMALLINT UNSIGNED` | OUI | Nombre de penalties concédés. | `0` |
| `penalties_scored` | `SMALLINT UNSIGNED` | OUI | Nombre de penalties marqués. | `3` |
| `penalties_missed` | `SMALLINT UNSIGNED` | OUI | Nombre de penalties manqués. | `1` |
| `penalties_saved` | `SMALLINT UNSIGNED` | OUI | Nombre de penalties arrêtés, pour un gardien. | `0` |
| `raw_data` | `JSON` | OUI | Copie brute de l’objet de statistiques. | `{"games":{"appearences":28},"goals":{"total":12}}` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-06-18 10:40:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière mise à jour locale. | `2026-06-18 10:40:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_player_team_league_season` (`player_id`, `team_id`, `league_id`, `season`)`
- `CONSTRAINT `fk_player_stats_player` FOREIGN KEY (`player_id`) REFERENCES `football_players` (`id`)`
- `CONSTRAINT `fk_player_stats_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`
- `CONSTRAINT `fk_player_stats_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`

### Exemple de ligne JSON

```json
{
  "player_id": 276,
  "team_id": 85,
  "league_id": 61,
  "season": 2025,
  "appearances": 28,
  "lineups": 24,
  "minutes": 2150,
  "position": "Midfielder",
  "rating": 7.45,
  "goals_total": 12,
  "assists": 8,
  "cards_yellow": 4
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_player_statistics` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `player_id` BIGINT UNSIGNED NOT NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `league_id` BIGINT UNSIGNED NOT NULL,
  `season` SMALLINT UNSIGNED NOT NULL,
  `appearances` SMALLINT UNSIGNED NULL,
  `lineups` SMALLINT UNSIGNED NULL,
  `minutes` INT UNSIGNED NULL,
  `shirt_number` SMALLINT UNSIGNED NULL,
  `position` VARCHAR(50) NULL,
  `rating` DECIMAL(5,2) NULL,
  `captain` BOOLEAN NOT NULL DEFAULT 0,
  `substitutes_in` SMALLINT UNSIGNED NULL,
  `substitutes_out` SMALLINT UNSIGNED NULL,
  `substitutes_bench` SMALLINT UNSIGNED NULL,
  `shots_total` SMALLINT UNSIGNED NULL,
  `shots_on` SMALLINT UNSIGNED NULL,
  `goals_total` SMALLINT UNSIGNED NULL,
  `goals_conceded` SMALLINT UNSIGNED NULL,
  `assists` SMALLINT UNSIGNED NULL,
  `saves` SMALLINT UNSIGNED NULL,
  `passes_total` INT UNSIGNED NULL,
  `passes_key` SMALLINT UNSIGNED NULL,
  `passes_accuracy` DECIMAL(5,2) NULL,
  `tackles_total` SMALLINT UNSIGNED NULL,
  `tackles_blocks` SMALLINT UNSIGNED NULL,
  `tackles_interceptions` SMALLINT UNSIGNED NULL,
  `duels_total` SMALLINT UNSIGNED NULL,
  `duels_won` SMALLINT UNSIGNED NULL,
  `dribbles_attempts` SMALLINT UNSIGNED NULL,
  `dribbles_success` SMALLINT UNSIGNED NULL,
  `dribbles_past` SMALLINT UNSIGNED NULL,
  `fouls_drawn` SMALLINT UNSIGNED NULL,
  `fouls_committed` SMALLINT UNSIGNED NULL,
  `cards_yellow` SMALLINT UNSIGNED NULL,
  `cards_yellow_red` SMALLINT UNSIGNED NULL,
  `cards_red` SMALLINT UNSIGNED NULL,
  `penalties_won` SMALLINT UNSIGNED NULL,
  `penalties_committed` SMALLINT UNSIGNED NULL,
  `penalties_scored` SMALLINT UNSIGNED NULL,
  `penalties_missed` SMALLINT UNSIGNED NULL,
  `penalties_saved` SMALLINT UNSIGNED NULL,
  `raw_data` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_player_team_league_season` (`player_id`, `team_id`, `league_id`, `season`),
  CONSTRAINT `fk_player_stats_player` FOREIGN KEY (`player_id`) REFERENCES `football_players` (`id`),
  CONSTRAINT `fk_player_stats_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`),
  CONSTRAINT `fk_player_stats_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 16. Table `football_standings`

**Endpoint principal :** `/standings`

**Rôle :** Stocke le classement d’une compétition, y compris les statistiques globales, domicile et extérieur.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de la ligne de classement. | `100001` |
| `league_id` | `BIGINT UNSIGNED` | NON | Compétition concernée. | `61` |
| `season` | `SMALLINT UNSIGNED` | NON | Saison concernée. | `2025` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe classée. | `85` |
| `group_name` | `VARCHAR(150)` | OUI | Nom du groupe ou de la phase. | `Ligue 1` |
| `rank` | `SMALLINT UNSIGNED` | NON | Position au classement. | `1` |
| `points` | `SMALLINT` | OUI | Nombre de points. | `62` |
| `goals_diff` | `SMALLINT` | OUI | Différence de buts. | `35` |
| `form` | `VARCHAR(50)` | OUI | Forme récente sous forme de lettres. | `WWDWW` |
| `status` | `VARCHAR(50)` | OUI | Statut de progression au classement. | `same` |
| `description` | `VARCHAR(255)` | OUI | Indication de qualification ou relégation. | `Champions League` |
| `all_played` | `SMALLINT UNSIGNED` | NON | Matchs joués au total. | `28` |
| `all_win` | `SMALLINT UNSIGNED` | NON | Victoires au total. | `19` |
| `all_draw` | `SMALLINT UNSIGNED` | NON | Matchs nuls au total. | `5` |
| `all_lose` | `SMALLINT UNSIGNED` | NON | Défaites au total. | `4` |
| `all_goals_for` | `SMALLINT UNSIGNED` | NON | Buts marqués au total. | `65` |
| `all_goals_against` | `SMALLINT UNSIGNED` | NON | Buts encaissés au total. | `30` |
| `home_played` | `SMALLINT UNSIGNED` | NON | Matchs joués à domicile. | `14` |
| `home_win` | `SMALLINT UNSIGNED` | NON | Victoires à domicile. | `11` |
| `home_draw` | `SMALLINT UNSIGNED` | NON | Nuls à domicile. | `2` |
| `home_lose` | `SMALLINT UNSIGNED` | NON | Défaites à domicile. | `1` |
| `home_goals_for` | `SMALLINT UNSIGNED` | NON | Buts marqués à domicile. | `38` |
| `home_goals_against` | `SMALLINT UNSIGNED` | NON | Buts encaissés à domicile. | `12` |
| `away_played` | `SMALLINT UNSIGNED` | NON | Matchs joués à l’extérieur. | `14` |
| `away_win` | `SMALLINT UNSIGNED` | NON | Victoires à l’extérieur. | `8` |
| `away_draw` | `SMALLINT UNSIGNED` | NON | Nuls à l’extérieur. | `3` |
| `away_lose` | `SMALLINT UNSIGNED` | NON | Défaites à l’extérieur. | `3` |
| `away_goals_for` | `SMALLINT UNSIGNED` | NON | Buts marqués à l’extérieur. | `27` |
| `away_goals_against` | `SMALLINT UNSIGNED` | NON | Buts encaissés à l’extérieur. | `18` |
| `api_updated_at` | `DATETIME` | OUI | Date de mise à jour fournie ou déduite de la synchronisation API. | `2026-03-15 23:00:00` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-03-15 23:05:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière mise à jour locale. | `2026-03-15 23:05:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_standing` (`league_id`, `season`, `group_name`, `team_id`)`
- `KEY `idx_standings_rank` (`league_id`, `season`, `rank`)`
- `CONSTRAINT `fk_standings_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`
- `CONSTRAINT `fk_standings_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`

### Exemple de ligne JSON

```json
{
  "league_id": 61,
  "season": 2025,
  "team_id": 85,
  "group_name": "Ligue 1",
  "rank": 1,
  "points": 62,
  "goals_diff": 35,
  "form": "WWDWW",
  "all_played": 28,
  "all_win": 19,
  "all_draw": 5,
  "all_lose": 4
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_standings` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `league_id` BIGINT UNSIGNED NOT NULL,
  `season` SMALLINT UNSIGNED NOT NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `group_name` VARCHAR(150) NULL,
  `rank` SMALLINT UNSIGNED NOT NULL,
  `points` SMALLINT NULL,
  `goals_diff` SMALLINT NULL,
  `form` VARCHAR(50) NULL,
  `status` VARCHAR(50) NULL,
  `description` VARCHAR(255) NULL,
  `all_played` SMALLINT UNSIGNED NOT NULL,
  `all_win` SMALLINT UNSIGNED NOT NULL,
  `all_draw` SMALLINT UNSIGNED NOT NULL,
  `all_lose` SMALLINT UNSIGNED NOT NULL,
  `all_goals_for` SMALLINT UNSIGNED NOT NULL,
  `all_goals_against` SMALLINT UNSIGNED NOT NULL,
  `home_played` SMALLINT UNSIGNED NOT NULL,
  `home_win` SMALLINT UNSIGNED NOT NULL,
  `home_draw` SMALLINT UNSIGNED NOT NULL,
  `home_lose` SMALLINT UNSIGNED NOT NULL,
  `home_goals_for` SMALLINT UNSIGNED NOT NULL,
  `home_goals_against` SMALLINT UNSIGNED NOT NULL,
  `away_played` SMALLINT UNSIGNED NOT NULL,
  `away_win` SMALLINT UNSIGNED NOT NULL,
  `away_draw` SMALLINT UNSIGNED NOT NULL,
  `away_lose` SMALLINT UNSIGNED NOT NULL,
  `away_goals_for` SMALLINT UNSIGNED NOT NULL,
  `away_goals_against` SMALLINT UNSIGNED NOT NULL,
  `api_updated_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_standing` (`league_id`, `season`, `group_name`, `team_id`),
  KEY `idx_standings_rank` (`league_id`, `season`, `rank`),
  CONSTRAINT `fk_standings_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`),
  CONSTRAINT `fk_standings_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 17. Table `football_injuries`

**Endpoint principal :** `/injuries`

**Rôle :** Stocke les blessures, suspensions et participations incertaines liées à un match.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de l’absence. | `110001` |
| `fixture_id` | `BIGINT UNSIGNED` | OUI | Match concerné par l’absence. | `1200001` |
| `league_id` | `BIGINT UNSIGNED` | OUI | Compétition concernée. | `61` |
| `season` | `SMALLINT UNSIGNED` | OUI | Saison concernée. | `2025` |
| `team_id` | `BIGINT UNSIGNED` | NON | Équipe du joueur. | `85` |
| `player_id` | `BIGINT UNSIGNED` | NON | Joueur absent ou incertain. | `276` |
| `player_name` | `VARCHAR(150)` | OUI | Nom du joueur. | `Example Player` |
| `player_photo` | `VARCHAR(500)` | OUI | URL de la photo du joueur. | `https://media.api-sports.io/football/players/276.png` |
| `injury_type` | `VARCHAR(100)` | OUI | Type général de disponibilité. | `Missing Fixture` |
| `reason` | `VARCHAR(255)` | OUI | Raison détaillée de l’absence. | `Hamstring Injury` |
| `fixture_timezone` | `VARCHAR(100)` | OUI | Fuseau horaire du match. | `Africa/Casablanca` |
| `fixture_date` | `DATETIME` | OUI | Date et heure du match concerné. | `2026-01-18 20:45:00` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 08:00:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-01-18 12:00:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `UNIQUE KEY `uq_fixture_player_injury` (`fixture_id`, `player_id`, `injury_type`, `reason`)`
- `KEY `idx_injuries_team` (`team_id`)`
- `KEY `idx_injuries_player` (`player_id`)`
- `CONSTRAINT `fk_injuries_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`)`
- `CONSTRAINT `fk_injuries_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`
- `CONSTRAINT `fk_injuries_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`)`
- `CONSTRAINT `fk_injuries_player` FOREIGN KEY (`player_id`) REFERENCES `football_players` (`id`)`

### Exemple de ligne JSON

```json
{
  "fixture_id": 1200001,
  "league_id": 61,
  "season": 2025,
  "team_id": 85,
  "player_id": 276,
  "player_name": "Example Player",
  "injury_type": "Missing Fixture",
  "reason": "Hamstring Injury"
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_injuries` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `fixture_id` BIGINT UNSIGNED NULL,
  `league_id` BIGINT UNSIGNED NULL,
  `season` SMALLINT UNSIGNED NULL,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `player_id` BIGINT UNSIGNED NOT NULL,
  `player_name` VARCHAR(150) NULL,
  `player_photo` VARCHAR(500) NULL,
  `injury_type` VARCHAR(100) NULL,
  `reason` VARCHAR(255) NULL,
  `fixture_timezone` VARCHAR(100) NULL,
  `fixture_date` DATETIME NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fixture_player_injury` (`fixture_id`, `player_id`, `injury_type`, `reason`),
  KEY `idx_injuries_team` (`team_id`),
  KEY `idx_injuries_player` (`player_id`),
  CONSTRAINT `fk_injuries_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`),
  CONSTRAINT `fk_injuries_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`),
  CONSTRAINT `fk_injuries_team` FOREIGN KEY (`team_id`) REFERENCES `football_teams` (`id`),
  CONSTRAINT `fk_injuries_player` FOREIGN KEY (`player_id`) REFERENCES `football_players` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 18. Table `football_odds`

**Endpoint principal :** `/odds et /odds/live`

**Rôle :** Stocke les cotes pré-match et live, une ligne par fixture, bookmaker, type de pari et valeur.

### Colonnes

| Colonne | Type MySQL | Nullable | Explication | Exemple simple |
|---|---|:---:|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | NON | Clé primaire locale de la cote. | `120001` |
| `fixture_id` | `BIGINT UNSIGNED` | NON | Match concerné. | `1200001` |
| `league_id` | `BIGINT UNSIGNED` | OUI | Compétition concernée. | `61` |
| `season` | `SMALLINT UNSIGNED` | OUI | Saison concernée. | `2025` |
| `bookmaker_id` | `BIGINT UNSIGNED` | OUI | Identifiant du bookmaker. | `1` |
| `bookmaker_name` | `VARCHAR(150)` | OUI | Nom du bookmaker. | `ExampleBook` |
| `bet_id` | `BIGINT UNSIGNED` | NON | Identifiant du marché de pari. | `1` |
| `bet_name` | `VARCHAR(200)` | OUI | Nom du marché. | `Match Winner` |
| `bet_value` | `VARCHAR(200)` | NON | Sélection proposée dans le marché. | `Home` |
| `odd` | `DECIMAL(12,4)` | OUI | Valeur numérique normalisée de la cote. | `1.8500` |
| `odd_raw` | `VARCHAR(50)` | OUI | Valeur brute de la cote. | `1.85` |
| `handicap` | `VARCHAR(50)` | OUI | Valeur de handicap associée au pari. | `-1` |
| `is_main` | `BOOLEAN` | NON | Indique s’il s’agit de la ligne principale du marché. | `1` |
| `is_suspended` | `BOOLEAN` | NON | Indique si ce pari est temporairement suspendu. | `0` |
| `is_live` | `BOOLEAN` | NON | Indique si la cote est une cote live. | `0` |
| `match_stopped` | `BOOLEAN` | NON | Indique si le match est arrêté dans le flux live. | `0` |
| `match_blocked` | `BOOLEAN` | NON | Indique si les paris du match sont bloqués. | `0` |
| `match_finished` | `BOOLEAN` | NON | Indique si le flux considère le match terminé. | `0` |
| `fixture_timezone` | `VARCHAR(100)` | OUI | Fuseau horaire de la fixture. | `Africa/Casablanca` |
| `fixture_date` | `DATETIME` | OUI | Date et heure du match. | `2026-01-18 20:45:00` |
| `api_updated_at` | `DATETIME` | OUI | Date de mise à jour de la cote. | `2026-01-18 18:00:00` |
| `raw_data` | `JSON` | OUI | Copie brute de la donnée de cote. | `{"bet":{"id":1,"name":"Match Winner"},"value":"Home","odd":"1.85"}` |
| `created_at` | `TIMESTAMP` | OUI | Date de création locale. | `2026-01-18 18:01:00` |
| `updated_at` | `TIMESTAMP` | OUI | Date de dernière modification locale. | `2026-01-18 18:01:00` |

### Contraintes et index

- `PRIMARY KEY (`id`)`
- `KEY `idx_odds_fixture` (`fixture_id`)`
- `KEY `idx_odds_bookmaker` (`bookmaker_id`)`
- `KEY `idx_odds_bet` (`bet_id`)`
- `KEY `idx_odds_live` (`is_live`)`
- `KEY `idx_odds_updated` (`api_updated_at`)`
- `UNIQUE KEY `uq_odd_snapshot` (`fixture_id`, `bookmaker_id`, `bet_id`, `bet_value`, `is_live`, `api_updated_at`)`
- `CONSTRAINT `fk_odds_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`)`
- `CONSTRAINT `fk_odds_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)`

### Exemple de ligne JSON

```json
{
  "fixture_id": 1200001,
  "league_id": 61,
  "season": 2025,
  "bookmaker_id": 1,
  "bookmaker_name": "ExampleBook",
  "bet_id": 1,
  "bet_name": "Match Winner",
  "bet_value": "Home",
  "odd": 1.85,
  "odd_raw": "1.85",
  "is_live": false
}
```

### Structure SQL de départ

```sql
CREATE TABLE `football_odds` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `fixture_id` BIGINT UNSIGNED NOT NULL,
  `league_id` BIGINT UNSIGNED NULL,
  `season` SMALLINT UNSIGNED NULL,
  `bookmaker_id` BIGINT UNSIGNED NULL,
  `bookmaker_name` VARCHAR(150) NULL,
  `bet_id` BIGINT UNSIGNED NOT NULL,
  `bet_name` VARCHAR(200) NULL,
  `bet_value` VARCHAR(200) NOT NULL,
  `odd` DECIMAL(12,4) NULL,
  `odd_raw` VARCHAR(50) NULL,
  `handicap` VARCHAR(50) NULL,
  `is_main` BOOLEAN NOT NULL DEFAULT 0,
  `is_suspended` BOOLEAN NOT NULL DEFAULT 0,
  `is_live` BOOLEAN NOT NULL DEFAULT 0,
  `match_stopped` BOOLEAN NOT NULL DEFAULT 0,
  `match_blocked` BOOLEAN NOT NULL DEFAULT 0,
  `match_finished` BOOLEAN NOT NULL DEFAULT 0,
  `fixture_timezone` VARCHAR(100) NULL,
  `fixture_date` DATETIME NULL,
  `api_updated_at` DATETIME NULL,
  `raw_data` JSON NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_odds_fixture` (`fixture_id`),
  KEY `idx_odds_bookmaker` (`bookmaker_id`),
  KEY `idx_odds_bet` (`bet_id`),
  KEY `idx_odds_live` (`is_live`),
  KEY `idx_odds_updated` (`api_updated_at`),
  UNIQUE KEY `uq_odd_snapshot` (`fixture_id`, `bookmaker_id`, `bet_id`, `bet_value`, `is_live`, `api_updated_at`),
  CONSTRAINT `fk_odds_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `football_fixtures` (`id`),
  CONSTRAINT `fk_odds_league` FOREIGN KEY (`league_id`) REFERENCES `football_leagues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Exemples de requêtes SQL

### Matchs du jour

```sql
SELECT *
FROM football_fixtures
WHERE DATE(fixture_date) = CURDATE()
ORDER BY fixture_date;
```

### Matchs actuellement en cours

```sql
SELECT *
FROM football_fixtures
WHERE status_short IN ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE')
ORDER BY fixture_date;
```

### Classement d’une compétition

```sql
SELECT s.rank, t.name, s.points, s.goals_diff, s.form
FROM football_standings AS s
JOIN football_teams AS t ON t.id = s.team_id
WHERE s.league_id = 61
  AND s.season = 2025
ORDER BY s.rank;
```

### Événements d’un match

```sql
SELECT elapsed, extra_time, event_type, event_detail, player_name, assist_player_name
FROM football_fixture_events
WHERE fixture_id = 1200001
ORDER BY elapsed, extra_time, sort_order;
```

### Statistiques d’un match

```sql
SELECT team_id, statistic_type, statistic_value
FROM football_fixture_statistics
WHERE fixture_id = 1200001
  AND period = 'ALL'
ORDER BY team_id, statistic_type;
```

### Statistiques d’un joueur

```sql
SELECT p.name, ps.season, ps.appearances, ps.goals_total, ps.assists, ps.rating
FROM football_player_statistics AS ps
JOIN football_players AS p ON p.id = ps.player_id
WHERE ps.player_id = 276
ORDER BY ps.season DESC;
```

### Cotes d’un match

```sql
SELECT bookmaker_name, bet_name, bet_value, odd, is_live
FROM football_odds
WHERE fixture_id = 1200001
ORDER BY bookmaker_name, bet_name, bet_value;
```

## Recommandations de synchronisation

| Donnée | Fréquence conseillée |
|---|---:|
| Pays | 24 heures |
| Ligues et saisons | 1 à 24 heures |
| Équipes et stades | 24 heures |
| Matchs futurs | 5 minutes à 24 heures selon la proximité |
| Matchs live | 15 à 60 secondes |
| Événements et statistiques live | environ 60 secondes |
| Compositions | environ 15 minutes avant et pendant le match |
| Classements | 1 heure |
| Joueurs | 1 jour à 1 semaine selon le besoin |
| Blessures | 4 à 24 heures |
| Cotes pré-match | environ 3 heures |
| Cotes live | 5 à 60 secondes |

## Points importants

- Ne jamais inventer un identifiant API.
- Stocker la clé API uniquement dans le backend.
- Gérer les valeurs `NULL`, car certains champs ne sont pas toujours disponibles.
- Vérifier la couverture de chaque compétition avant de synchroniser événements, compositions, statistiques, blessures, prédictions ou cotes.
- Utiliser des transactions pour synchroniser un match et ses données associées.
- Utiliser `upsert` pour éviter les doublons lors des synchronisations répétées.
- Conserver éventuellement la réponse brute dans une colonne JSON pour faciliter les audits et les futures migrations.

## Exemple d’upsert Laravel

```php
DB::table('football_teams')->upsert(
    [[
        'id' => 85,
        'venue_id' => 671,
        'country_id' => 1,
        'name' => 'Paris Saint Germain',
        'code' => 'PAR',
        'country_name' => 'France',
        'founded' => 1970,
        'national' => false,
        'logo' => 'https://media.api-sports.io/football/teams/85.png',
        'updated_at' => now(),
    ]],
    ['id'],
    ['venue_id', 'country_id', 'name', 'code', 'country_name', 'founded', 'national', 'logo', 'updated_at']
);
```

## Limite du présent schéma

Ces 14 tables couvrent le noyau principal proposé dans le document d’intégration. Pour normaliser intégralement tous les endpoints, il est possible d’ajouter ensuite des tables dédiées aux coachs, effectifs, transferts, trophées, indisponibilités historiques, prédictions, bookmakers et types de paris.
