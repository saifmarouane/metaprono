import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Eye,
  LogOut,
  Table2,
} from "lucide-react";
import { getMongoAdminSnapshot } from "@/lib/mongodb-admin";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminInsertForm } from "@/components/admin/AdminInsertForm";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";
import { listChatUsers } from "@/lib/chat-users";
import { BrandLogo } from "@/components/BrandLogo";
import { listAllUserActions, type PublicUserAction } from "@/lib/user-actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{
    collection?: string;
    limit?: string;
  }>;
};

function formatPreviewValue(value: unknown): string {
  if (value == null) {
    return "null";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function getVisibleColumns(documents: Record<string, unknown>[]): string[] {
  const preferred = [
    "_id",
    "id",
    "name",
    "league_id",
    "season",
    "team_id",
    "fixture_id",
    "player_name",
    "status_short",
    "fixture_date",
    "rank",
    "points",
    "goals_home",
    "goals_away",
    "home_scorers",
    "away_scorers",
    "odd",
    "updated_at",
  ];
  const allKeys = [...new Set(documents.flatMap((document) => Object.keys(document)))];
  const orderedPreferred = preferred.filter((key) => allKeys.includes(key));
  const remaining = allKeys
    .filter((key) => !orderedPreferred.includes(key))
    .slice(0, Math.max(0, 8 - orderedPreferred.length));

  return [...orderedPreferred, ...remaining].slice(0, 8);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await isAdminAuthenticated())) {
    redirect("/login?next=/admin");
  }

  const params = await searchParams;
  const snapshot = await getMongoAdminSnapshot(
    params?.collection,
    params?.limit ? Number(params.limit) : undefined
  );
  const chatUsers = await listChatUsers();
  let userActions: PublicUserAction[] = [];
  let userActionsError: string | null = null;

  try {
    userActions = await listAllUserActions({
      actionType: "football_prediction",
      limit: 50,
    });
  } catch (error) {
    userActionsError =
      error instanceof Error
        ? error.message
        : "Impossible de charger l'historique utilisateur.";
  }

  const visibleColumns = getVisibleColumns(snapshot.documents);
  const selectedCount =
    snapshot.collections.find(
      (collection) => collection.name === snapshot.selectedCollection
    )?.count ?? 0;

  return (
    <main className="min-h-screen bg-[#11274c] p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-300">
                Admin database viewer
              </p>
              <h1 className="text-2xl font-black tracking-normal">
                MetaPronostic Data Admin
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/Dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-lime-400 px-4 py-2 text-sm font-black text-white transition hover:bg-lime-300"
            >
              Accueil
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-400/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </header>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Database
            </p>
            <p className="mt-2 text-xl font-black text-lime-300">
              {snapshot.database}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Collections
            </p>
            <p className="mt-2 text-xl font-black text-cyan-300">
              {snapshot.collections.length}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold uppercase text-slate-400">
              Selected documents
            </p>
            <p className="mt-2 text-xl font-black text-amber-300">
              {selectedCount}
            </p>
          </div>
        </section>

        <AdminUsersPanel users={chatUsers} />

        <AdminActionsPanel actions={userActions} error={userActionsError} />

        <div className="grid gap-5 lg:grid-cols-[460px_1fr]">
          <aside className="rounded-xl border border-white/10 bg-[#0d1b33] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-lime-300" />
              <h2 className="font-black">Collections</h2>
            </div>
            <div className="space-y-2">
              {snapshot.collections.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                  Aucune collection trouvee dans MongoDB.
                </p>
              )}
              {snapshot.collections.map((collection) => {
                const isActive =
                  collection.name === snapshot.selectedCollection;

                return (
                  <Link
                    key={collection.name}
                    href={`/admin?collection=${encodeURIComponent(
                      collection.name
                    )}&limit=${snapshot.limit}`}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                      isActive
                        ? "border-lime-300/40 bg-lime-300/10 text-lime-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="truncate font-bold">{collection.name}</span>
                    <span className="rounded-md bg-black/25 px-2 py-1 text-xs font-black">
                      {collection.count}
                    </span>
                  </Link>
                );
              })}
            </div>
            <AdminInsertForm defaultCollection={snapshot.selectedCollection} />
          </aside>

          <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Table2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black">
                    {snapshot.selectedCollection ?? "No collection"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Lecture seule · {snapshot.documents.length} document(s)
                    affiches · limite {snapshot.limit}
                  </p>
                </div>
              </div>
              {snapshot.selectedCollection && (
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map((limit) => (
                    <Link
                      key={limit}
                      href={`/admin?collection=${encodeURIComponent(
                        snapshot.selectedCollection ?? ""
                      )}&limit=${limit}`}
                      className={`rounded-lg px-3 py-2 text-xs font-black transition ${
                        snapshot.limit === limit
                          ? "bg-lime-400 text-white"
                          : "border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {limit}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {snapshot.documents.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
                <Eye className="mb-4 h-10 w-10 text-slate-500" />
                <h3 className="text-lg font-black">Aucun document a afficher</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  La collection selectionnee est vide ou la base ne contient pas
                  encore de donnees importees.
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-4">
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                    <thead className="bg-white/[0.04]">
                      <tr>
                        {visibleColumns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase text-slate-400"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {snapshot.documents.map((document, index) => (
                        <tr key={index} className="hover:bg-white/[0.03]">
                          {visibleColumns.map((column) => (
                            <td
                              key={column}
                              className="max-w-[260px] truncate px-4 py-3 text-slate-200"
                              title={formatPreviewValue(document[column])}
                            >
                              {formatPreviewValue(document[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-black uppercase text-slate-400">
                    JSON brut
                  </h3>
                  <pre className="max-h-[520px] overflow-auto rounded-lg border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(snapshot.documents, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
