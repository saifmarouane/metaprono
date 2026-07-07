"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  FilePlus2,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  FOOTBALL_COLLECTION_GUIDES,
  MANUAL_INSERT_COLLECTION_NAMES,
  getFieldGuides,
  getFootballCollectionGuide,
  type FieldOption,
  type FieldInputType,
} from "@/lib/football-collection-guides";

type AdminInsertFormProps = {
  defaultCollection?: string | null;
  collectionNames?: string[];
  redirectAfterSubmit?: string;
};

type FieldValues = Record<string, string | boolean>;
type OptionState = Record<string, FieldOption[]>;

function isApiOptionSource(source?: string): boolean {
  return Boolean(source?.startsWith("api-football-"));
}

function shouldStartEmpty(field: ReturnType<typeof getFieldGuides>[number]) {
  return (
    isApiOptionSource(field.optionSource) ||
    field.key === "id" ||
    field.key.endsWith("_logo") ||
    field.key === "player_photo" ||
    field.key === "venue_id" ||
    field.key === "bookmaker_id" ||
    field.key === "bet_id"
  );
}

function getInitialValues(collectionName: string): FieldValues {
  const guide =
    getFootballCollectionGuide(collectionName) ?? FOOTBALL_COLLECTION_GUIDES[0];
  const fields = getFieldGuides(guide);

  return Object.fromEntries(
    fields.map((field) => {
      const value = guide.sample[field.key];

      return [
        field.key,
        shouldStartEmpty(field)
          ? ""
          : typeof value === "boolean"
            ? value
            : String(value),
      ];
    })
  );
}

function parseFieldValue(value: string | boolean, type: FieldInputType): unknown {
  if (type === "boolean") {
    return Boolean(value);
  }

  if (typeof value !== "string") {
    return value;
  }

  if (value.trim() === "") {
    return undefined;
  }

  if (type === "number") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : value;
  }

  if (type === "decimal") {
    const numericValue = Number(value.replace(",", "."));
    return Number.isFinite(numericValue) ? numericValue : value;
  }

  return value;
}

function buildDocument(collectionName: string, values: FieldValues) {
  const guide =
    getFootballCollectionGuide(collectionName) ?? FOOTBALL_COLLECTION_GUIDES[0];
  const fields = getFieldGuides(guide);
  const entries = fields
    .map((field) => [
      field.key,
      parseFieldValue(values[field.key] ?? "", field.type),
    ])
    .filter(([, value]) => value !== undefined);

  return Object.fromEntries(entries);
}

function inputTypeFor(fieldType: FieldInputType): string {
  if (fieldType === "number" || fieldType === "decimal") return "number";
  if (fieldType === "date") return "date";
  if (fieldType === "datetime") return "datetime-local";
  if (fieldType === "url") return "url";
  return "text";
}

function toDateTimeLocal(value: string | boolean): string {
  if (typeof value !== "string") return "";
  if (!value.includes("T")) return value;

  return value.slice(0, 16);
}

function toFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function getOptionStateKey(fieldKey: string, source?: string): string {
  return isApiOptionSource(source) ? fieldKey : source ?? fieldKey;
}

function isHiddenTechnicalField(
  field: ReturnType<typeof getFieldGuides>[number],
  collectionName: string
) {
  if (field.key === "id") {
    return !(
      collectionName === "football_fixtures" &&
      field.optionSource === "api-football-fixtures"
    );
  }

  return (
    field.key.endsWith("_logo") ||
    field.key === "player_photo" ||
    field.key === "venue_id" ||
    field.key === "bookmaker_id" ||
    field.key === "bet_id" ||
    field.key === "odd_raw"
  );
}

export function AdminInsertForm({
  defaultCollection,
  collectionNames,
  redirectAfterSubmit,
}: AdminInsertFormProps) {
  const router = useRouter();
  const availableGuides = useMemo(() => {
    const allowedCollectionNames = collectionNames?.length
      ? collectionNames
      : MANUAL_INSERT_COLLECTION_NAMES;

    return FOOTBALL_COLLECTION_GUIDES.filter((guide) =>
      allowedCollectionNames.includes(guide.name)
    );
  }, [collectionNames]);
  const initialCollection =
    defaultCollection &&
    availableGuides.some((guide) => guide.name === defaultCollection)
      ? defaultCollection
      : availableGuides[0]?.name ?? FOOTBALL_COLLECTION_GUIDES[0].name;
  const [collection, setCollection] = useState(initialCollection);
  const [values, setValues] = useState<FieldValues>(() =>
    getInitialValues(initialCollection)
  );
  const [showJson, setShowJson] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<OptionState>({});
  const [apiOptions, setApiOptions] = useState<OptionState>({});
  const [apiSearches, setApiSearches] = useState<Record<string, string>>({});
  const [apiLoading, setApiLoading] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const guide = useMemo(
    () => getFootballCollectionGuide(collection) ?? FOOTBALL_COLLECTION_GUIDES[0],
    [collection]
  );
  const fieldGuides = useMemo(() => getFieldGuides(guide), [guide]);
  const fieldLabelByKey = useMemo(
    () =>
      Object.fromEntries(
        fieldGuides.map((field) => [field.key, field.label])
      ) as Record<string, string>,
    [fieldGuides]
  );
  const document = useMemo(
    () => buildDocument(collection, values),
    [collection, values]
  );
  const documentJson = JSON.stringify(document, null, 2);

  useEffect(() => {
    const sources = [
      ...new Set(
        fieldGuides
          .map((field) => field.optionSource)
          .filter(
            (source): source is string =>
              Boolean(source) && !isApiOptionSource(source)
          )
      ),
    ];

    for (const source of sources) {
      if (dynamicOptions[source]) continue;

      fetch(`/api/admin/options?source=${encodeURIComponent(source)}`)
        .then((response) => response.json())
        .then((result: { ok?: boolean; options?: FieldOption[] }) => {
          if (result.ok && Array.isArray(result.options)) {
            setDynamicOptions((currentOptions) => ({
              ...currentOptions,
              [source]: result.options ?? [],
            }));
          }
        })
        .catch(() => {
          setDynamicOptions((currentOptions) => ({
            ...currentOptions,
            [source]: [],
          }));
        });
    }
  }, [fieldGuides, dynamicOptions]);

  useEffect(() => {
    const apiFields = fieldGuides.filter((field) =>
      isApiOptionSource(field.optionSource)
    );
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    for (const field of apiFields) {
      const source = field.optionSource;
      if (!source) continue;

      const stateKey = getOptionStateKey(field.key, source);
      const search = apiSearches[stateKey] ?? "";
      const params = new URLSearchParams({
        source,
        q: search,
        season: String(values.season ?? ""),
        leagueId: String(values.league_id ?? ""),
        teamId: String(values.team_id ?? ""),
        country: String(values.country_name ?? values.country ?? ""),
      });

      const timer = setTimeout(() => {
        setApiLoading((current) => ({ ...current, [stateKey]: true }));

        fetch(`/api/football/agent-options?${params}`)
          .then((response) => response.json())
          .then((result: { ok?: boolean; options?: FieldOption[] }) => {
            setApiOptions((currentOptions) => ({
              ...currentOptions,
              [stateKey]:
                result.ok && Array.isArray(result.options)
                  ? result.options
                  : [],
            }));
          })
          .catch(() => {
            setApiOptions((currentOptions) => ({
              ...currentOptions,
              [stateKey]: [],
            }));
          })
          .finally(() => {
            setApiLoading((current) => ({ ...current, [stateKey]: false }));
          });
      }, 350);

      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [
    fieldGuides,
    apiSearches,
    values.country,
    values.country_name,
    values.league_id,
    values.season,
    values.team_id,
  ]);

  function handleCollectionChange(nextCollection: string) {
    setCollection(nextCollection);
    setValues(getInitialValues(nextCollection));
    setShowJson(false);
    setStatus({ type: "idle", message: "" });
  }

  function updateField(key: string, value: string | boolean) {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  }

  function handleSelectField(fieldKey: string, option: FieldOption) {
    updateField(fieldKey, option.value);
    const meta = option.meta ?? {};

    if (collection === "football_countries" && fieldKey === "name") {
      if (typeof option.meta?.code === "string") {
        updateField("code", option.meta.code);
      }

      if (typeof option.meta?.flag === "string") {
        updateField("flag", option.meta.flag);
      }
    }

    if (fieldKey === "league_id") {
      updateField("league_name", toFieldValue(meta.leagueName));
      updateField("league_logo", toFieldValue(meta.leagueLogo));
      updateField("league_country", toFieldValue(meta.leagueCountry));
      if (meta.season) updateField("season", toFieldValue(meta.season));
    }

    if (fieldKey === "home_team_id") {
      updateField("home_team_name", toFieldValue(meta.teamName));
      updateField("home_team_logo", toFieldValue(meta.teamLogo));
      updateField("venue_id", toFieldValue(meta.venueId));
    }

    if (fieldKey === "away_team_id") {
      updateField("away_team_name", toFieldValue(meta.teamName));
      updateField("away_team_logo", toFieldValue(meta.teamLogo));
    }

    if (fieldKey === "team_id") {
      updateField("team_name", toFieldValue(meta.teamName));
      updateField("team_logo", toFieldValue(meta.teamLogo));
    }

    if (fieldKey === "player_id") {
      updateField("player_name", toFieldValue(meta.playerName));
      updateField("player_photo", toFieldValue(meta.playerPhoto));
      if (meta.playerPosition) updateField("position", toFieldValue(meta.playerPosition));
    }

    if (fieldKey === "assist_player_id") {
      updateField("assist_player_name", toFieldValue(meta.playerName));
    }

    if (fieldKey === "fixture_id" || (collection === "football_fixtures" && fieldKey === "id")) {
      updateField(fieldKey, option.value);
      updateField("fixture_id", option.value);
      if (collection === "football_fixtures") {
        updateField("id", option.value);
      }
      updateField("league_id", toFieldValue(meta.leagueId));
      updateField("league_name", toFieldValue(meta.leagueName));
      updateField("league_country", toFieldValue(meta.leagueCountry));
      updateField("league_logo", toFieldValue(meta.leagueLogo));
      updateField("season", toFieldValue(meta.season));
      updateField("round", toFieldValue(meta.round));
      updateField("home_team_id", toFieldValue(meta.homeTeamId));
      updateField("home_team_name", toFieldValue(meta.homeTeamName));
      updateField("home_team_logo", toFieldValue(meta.homeTeamLogo));
      updateField("away_team_id", toFieldValue(meta.awayTeamId));
      updateField("away_team_name", toFieldValue(meta.awayTeamName));
      updateField("away_team_logo", toFieldValue(meta.awayTeamLogo));
      updateField("venue_id", toFieldValue(meta.venueId));
      updateField("timezone", toFieldValue(meta.timezone));
      updateField("fixture_date", toFieldValue(meta.fixtureDate));
      updateField("status_short", toFieldValue(meta.statusShort));
      updateField("goals_home", toFieldValue(meta.goalsHome));
      updateField("goals_away", toFieldValue(meta.goalsAway));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const missingRequired = guide.requiredFields.filter((field) => {
        const value = values[field];
        return value === undefined || value === "";
      });

      if (missingRequired.length > 0) {
        throw new Error(
          `Champs obligatoires manquants: ${missingRequired.join(", ")}`
        );
      }

      const response = await fetch("/api/admin/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection,
          document: documentJson,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        insertedCount?: number;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Insertion failed");
      }

      setStatus({
        type: "success",
        message: `${result.insertedCount ?? 0} document(s) insere(s).`,
      });
      setValues(getInitialValues(collection));
      router.push(
        redirectAfterSubmit ??
          `/admin?collection=${encodeURIComponent(collection)}&limit=25`
      );
      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant l'insertion.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 border-t border-white/10 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <FilePlus2 className="h-5 w-5 text-cyan-300" />
        <h2 className="font-black">Insertion premium</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="insert-collection"
            className="mb-2 block text-xs font-black uppercase text-slate-400"
          >
            Table / collection
          </label>
          <select
            id="insert-collection"
            value={collection}
            onChange={(event) => handleCollectionChange(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#11274c] px-3 py-3 text-sm font-bold text-white outline-none focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
          >
            {availableGuides.map((collectionGuide) => (
              <option key={collectionGuide.name} value={collectionGuide.name}>
                {collectionGuide.title} · {collectionGuide.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-black text-white">{guide.title}</p>
          </div>
          <p className="text-xs leading-5 text-slate-300">{guide.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.requiredFields.map((field) => (
              <span
                key={field}
                className="rounded-md bg-lime-300/15 px-2 py-1 text-xs font-black text-lime-200"
              >
                {fieldLabelByKey[field] ?? field}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lime-300" />
            <h3 className="text-sm font-black uppercase text-slate-300">
              Champs clairs
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {fieldGuides.map((field) => {
              if (isHiddenTechnicalField(field, collection)) {
                return null;
              }

              const isRequired = guide.requiredFields.includes(field.key);
              const value = values[field.key] ?? "";
              const optionStateKey = getOptionStateKey(
                field.key,
                field.optionSource
              );
              const usesApiOptions = isApiOptionSource(field.optionSource);
              const options =
                field.options ??
                (usesApiOptions
                  ? apiOptions[optionStateKey]
                  : field.optionSource
                    ? dynamicOptions[field.optionSource]
                    : []) ??
                [];
              const hasSelectOptions = options.length > 0;

              return (
                <div
                  key={field.key}
                  className={`rounded-lg border p-3 ${
                    isRequired
                      ? "border-lime-300/25 bg-lime-300/[0.06]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <label
                    htmlFor={`field-${field.key}`}
                    className="mb-2 flex items-center justify-between gap-2 text-xs font-black uppercase text-slate-300"
                  >
                    <span>{field.label}</span>
                    {isRequired && (
                      <span className="rounded bg-lime-300/20 px-2 py-0.5 text-[10px] text-lime-200">
                        Obligatoire
                      </span>
                    )}
                  </label>

                  {usesApiOptions && (
                    <input
                      type="search"
                      value={apiSearches[optionStateKey] ?? ""}
                      onChange={(event) =>
                        setApiSearches((currentSearches) => ({
                          ...currentSearches,
                          [optionStateKey]: event.target.value,
                        }))
                      }
                      placeholder={
                        field.optionSource === "api-football-fixtures"
                          ? "Choisir ligue + saison, puis chercher le match"
                          : "Rechercher dans API-FOOTBALL"
                      }
                      className="mb-2 w-full rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    />
                  )}

                  {usesApiOptions ? (
                    <select
                      id={`field-${field.key}`}
                      value={String(value)}
                      onChange={(event) => {
                        const selectedOption = options.find(
                          (option) => option.value === event.target.value
                        );

                        if (selectedOption) {
                          handleSelectField(field.key, selectedOption);
                        } else {
                          updateField(field.key, "");
                        }
                      }}
                      required={isRequired}
                      className="w-full rounded-lg border border-white/10 bg-[#11274c] px-3 py-2 text-sm text-white outline-none transition focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
                    >
                      <option value="">
                        Selectionner {field.label.toLowerCase()}
                      </option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <button
                      id={`field-${field.key}`}
                      type="button"
                      onClick={() => updateField(field.key, !Boolean(value))}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-bold transition ${
                        Boolean(value)
                          ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                          : "border-white/10 bg-black/20 text-slate-300"
                      }`}
                    >
                      <span>{Boolean(value) ? "Oui" : "Non"}</span>
                      <span
                        className={`h-5 w-9 rounded-full p-0.5 transition ${
                          Boolean(value) ? "bg-lime-300" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-[#11274c] transition ${
                            Boolean(value) ? "translate-x-4" : ""
                          }`}
                        />
                      </span>
                    </button>
                  ) : hasSelectOptions ? (
                    <select
                      id={`field-${field.key}`}
                      value={String(value)}
                      onChange={(event) => {
                        const selectedOption = options.find(
                          (option) => option.value === event.target.value
                        );

                        if (selectedOption) {
                          handleSelectField(field.key, selectedOption);
                        } else {
                          updateField(field.key, event.target.value);
                        }
                      }}
                      required={isRequired}
                      className="w-full rounded-lg border border-white/10 bg-[#11274c] px-3 py-2 text-sm text-white outline-none transition focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
                    >
                      <option value="">
                        Selectionner {field.label.toLowerCase()}
                      </option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`field-${field.key}`}
                      type={inputTypeFor(field.type)}
                      step={field.type === "decimal" ? "0.01" : undefined}
                      value={
                        field.type === "datetime"
                          ? toDateTimeLocal(value)
                          : String(value)
                      }
                      onChange={(event) =>
                        updateField(field.key, event.target.value)
                      }
                      required={isRequired}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-lime-300/50 focus:ring-2 focus:ring-lime-300/20"
                    />
                  )}

                  {field.help && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {field.help}
                    </p>
                  )}
                  {usesApiOptions && apiLoading[optionStateKey] && (
                    <p className="mt-2 text-xs leading-5 text-cyan-200">
                      Recherche API-FOOTBALL en cours...
                    </p>
                  )}
                  {usesApiOptions &&
                    !apiLoading[optionStateKey] &&
                    !hasSelectOptions && (
                      <p className="mt-2 text-xs leading-5 text-amber-300/80">
                        Aucun resultat API charge. Pour les matchs, choisis
                        d&apos;abord la competition et la saison. Pour les joueurs,
                        choisis d&apos;abord l&apos;equipe.
                      </p>
                    )}
                  {field.optionSource && !usesApiOptions && !hasSelectOptions && (
                    <p className="mt-2 text-xs leading-5 text-amber-300/80">
                      Aucune option chargee pour ce champ. Tu peux saisir la
                      valeur manuellement, puis remplir la table source plus
                      tard.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20">
          <button
            type="button"
            onClick={() => setShowJson((current) => !current)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-slate-200"
          >
            Apercu JSON technique
            <ChevronDown
              className={`h-4 w-4 transition ${showJson ? "rotate-180" : ""}`}
            />
          </button>
          {showJson && (
            <pre className="max-h-72 overflow-auto border-t border-white/10 p-4 text-xs leading-6 text-slate-300">
              {documentJson}
            </pre>
          )}
        </div>

        {status.type !== "idle" && (
          <p
            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
              status.type === "success"
                ? "border-lime-300/25 bg-lime-300/10 text-lime-200"
                : "border-red-400/25 bg-red-400/10 text-red-200"
            }`}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 text-sm font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FilePlus2 className="h-4 w-4" />
          )}
          Inserer dans MongoDB
        </button>
      </form>
    </section>
  );
}
