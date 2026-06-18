import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Database,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import {
  type FootballCollectionGuide,
  FOOTBALL_COLLECTION_GUIDES,
  getFieldGuides,
} from "@/lib/football-collection-guides";
import { BrandLogo } from "@/components/BrandLogo";

const fillOrder = [
  "football_countries",
  "football_leagues",
  "football_league_seasons",
  "football_venues",
  "football_teams",
  "football_players",
  "football_fixtures",
  "football_fixture_lineups",
  "football_fixture_events",
  "football_fixture_statistics",
  "football_player_statistics",
  "football_standings",
  "football_injuries",
  "football_odds",
];

const relationNotes = [
  "Commence toujours par les tables de reference : pays, competitions, saisons, stades, equipes et joueurs.",
  "Les champs avec _id doivent correspondre a un document deja insere dans la table referencee.",
  "Utilise les selects quand ils existent : pays, ligues, equipes, matchs, joueurs, statut de match, type de cote.",
  "Pour un match, verifie que league_id, home_team_id, away_team_id et venue_id existent avant insertion.",
  "Pour que l'IA reponde bien, privilegie des noms complets, dates correctes, scores, statuts et cotes numeriques.",
];

function formatValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

export default function DocumentationPage() {
  const orderedGuides = fillOrder
    .map((name) => FOOTBALL_COLLECTION_GUIDES.find((guide) => guide.name === name))
    .filter((guide): guide is FootballCollectionGuide => Boolean(guide));

  return (
    <main className="min-h-screen bg-[#11274c] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#11274c]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandLogo size="md" />
            <span className="truncate text-base font-black uppercase sm:text-lg">
              MetaPronostic
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white transition hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </nav>

      <section className="border-b border-white/10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm font-bold text-lime-200">
            <BookOpen className="h-4 w-4" />
            Documentation insertion
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-normal sm:text-5xl">
            Comment remplir les tables football.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Cette page explique l'ordre d'insertion, les relations importantes
            et les champs a remplir dans l'admin ou l'espace agent. Elle suit
            les memes guides que les formulaires premium d'insertion.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="h-max rounded-xl border border-white/10 bg-[#0d1b33] p-5 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-lime-300" />
              <h2 className="font-black">Ordre recommande</h2>
            </div>
            <div className="space-y-2">
              {orderedGuides.map((guide, index) => (
                <a
                  key={guide.name}
                  href={`#${guide.name}`}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-sm transition hover:border-lime-300/30 hover:bg-lime-300/10"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lime-400 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-black text-white">
                      {guide.title}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {guide.name}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </aside>

          <div className="space-y-5">
            <section className="rounded-xl border border-white/10 bg-[#0d1b33] p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                <h2 className="font-black">Regles avant insertion</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {relationNotes.map((note) => (
                  <div
                    key={note}
                    className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lime-300" />
                    <p className="text-sm leading-6 text-slate-200">{note}</p>
                  </div>
                ))}
              </div>
            </section>

            {orderedGuides.map((guide) => {
              const fields = getFieldGuides(guide);

              return (
                <section
                  key={guide.name}
                  id={guide.name}
                  className="scroll-mt-24 rounded-xl border border-white/10 bg-[#0d1b33] p-5"
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-lime-300" />
                        <h2 className="text-xl font-black">{guide.title}</h2>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-cyan-200">
                        {guide.name}
                      </p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                        {guide.description}
                      </p>
                    </div>
                    <Link
                      href={`/admin?collection=${guide.name}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-lime-400 px-4 text-sm font-black text-white transition hover:bg-lime-300"
                    >
                      Remplir
                    </Link>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                        <thead className="bg-white/[0.04]">
                          <tr>
                            {["Champ", "Type", "Obligatoire", "Aide"].map(
                              (column) => (
                                <th
                                  key={column}
                                  className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                                >
                                  {column}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {fields.map((field) => {
                            const isRequired = guide.requiredFields.includes(
                              field.key
                            );
                            const isRecommended =
                              guide.recommendedFields.includes(field.key);
                            const help =
                              field.help ??
                              (field.optionSource
                                ? `Select depuis ${field.optionSource}.`
                                : field.options
                                  ? "Choisir une valeur dans la liste."
                                  : isRecommended
                                    ? "Champ recommande pour ameliorer les reponses IA."
                                    : "-");

                            return (
                              <tr key={field.key} className="hover:bg-white/[0.03]">
                                <td className="px-4 py-3">
                                  <div className="font-black text-white">
                                    {field.label}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {field.key}
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                  {field.optionSource || field.options
                                    ? "select"
                                    : field.type}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-md px-2 py-1 text-xs font-black ${
                                      isRequired
                                        ? "bg-lime-300/15 text-lime-200"
                                        : isRecommended
                                          ? "bg-cyan-300/15 text-cyan-200"
                                          : "bg-white/[0.06] text-slate-300"
                                    }`}
                                  >
                                    {isRequired
                                      ? "Obligatoire"
                                      : isRecommended
                                        ? "Recommande"
                                        : "Optionnel"}
                                  </span>
                                </td>
                                <td className="max-w-[360px] px-4 py-3 text-slate-300">
                                  {help}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                      <h3 className="mb-3 text-sm font-black uppercase text-slate-400">
                        Exemple
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(guide.sample).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="text-xs font-black text-slate-500">
                              {key}
                            </div>
                            <div className="break-words text-sm font-semibold text-slate-200">
                              {formatValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
