"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, CheckCircle2, Clock3, UserCheck } from "lucide-react";
import type { ChatUserStatus, PublicChatUser } from "@/lib/chat-users";

type AdminUsersPanelProps = {
  users: PublicChatUser[];
};

const STATUS_CONFIG: Record<
  ChatUserStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  pending: {
    label: "En attente",
    className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    icon: Clock3,
  },
  active: {
    label: "Valide",
    className: "border-lime-300/25 bg-lime-300/10 text-lime-100",
    icon: CheckCircle2,
  },
  blocked: {
    label: "Bloque",
    className: "border-red-300/25 bg-red-300/10 text-red-100",
    icon: Ban,
  },
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminUsersPanel({ users }: AdminUsersPanelProps) {
  const router = useRouter();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(userId: string, status: ChatUserStatus) {
    setBusyUserId(userId);
    setError(null);

    const response = await fetch("/api/admin/users/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });

    setBusyUserId(null);

    if (!response.ok) {
      setError("Impossible de modifier le statut utilisateur.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-[#0d1b33]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-black">Utilisateurs chat LLM</h2>
            <p className="text-xs text-slate-400">
              Valider, remettre en attente ou bloquer l&apos;acces au chat.
            </p>
          </div>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200">
          {users.length} compte(s)
        </span>
      </div>

      {error && (
        <div className="border-b border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="p-5 text-sm text-slate-400">
          Aucun utilisateur chat n&apos;a encore cree de compte.
        </div>
      ) : (
        <>
        <div className="grid gap-3 p-4 md:hidden">
          {users.map((user) => {
            const status = STATUS_CONFIG[user.status];
            const StatusIcon = status.icon;
            const isBusy = busyUserId === user.id;

            return (
              <article
                key={user.id}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{user.name}</p>
                    <p className="truncate text-xs text-slate-400">{user.email}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-2 py-1 text-xs font-black ${status.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <p className="font-black uppercase text-slate-500">Creation</p>
                    <p className="mt-1">{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase text-slate-500">Login</p>
                    <p className="mt-1">{formatDate(user.last_login_at)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isBusy || user.status === "active"}
                    onClick={() => changeStatus(user.id, "active")}
                    className="rounded-lg bg-lime-400 px-2 py-2 text-xs font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || user.status === "pending"}
                    onClick={() => changeStatus(user.id, "pending")}
                    className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Attente
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || user.status === "blocked"}
                    onClick={() => changeStatus(user.id, "blocked")}
                    className="rounded-lg border border-red-300/20 bg-red-300/10 px-2 py-2 text-xs font-black text-red-100 transition hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Bloquer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.04]">
              <tr>
                {["Utilisateur", "Statut", "Creation", "Dernier login", "Actions"].map(
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
              {users.map((user) => {
                const status = STATUS_CONFIG[user.status];
                const StatusIcon = status.icon;
                const isBusy = busyUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-black ${status.className}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy || user.status === "active"}
                          onClick={() => changeStatus(user.id, "active")}
                          className="rounded-lg bg-lime-400 px-3 py-2 text-xs font-black text-white transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || user.status === "pending"}
                          onClick={() => changeStatus(user.id, "pending")}
                          className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Attente
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || user.status === "blocked"}
                          onClick={() => changeStatus(user.id, "blocked")}
                          className="rounded-lg border border-red-300/20 bg-red-300/10 px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Bloquer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
