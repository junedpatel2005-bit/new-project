"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  DollarSign,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "CLIENT" | "PROFESSIONAL" | "ADMIN";
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};
type Detail = {
  user: User & {
    phone: string | null;
    professionalCategory: string | null;
    professionalCity: string | null;
    hourlyRate: number | null;
    fixedRate: number | null;
    averageRating: number;
    reviewCount: number;
    companyName: string | null;
    address: string | null;
  };
  stats: {
    jobsPosted: number;
    proposals: number;
    projects: number;
    completedPayments: number;
    money: number;
    services: number;
  };
};
function UserGroup({
  title,
  users,
  kind,
  onToggle,
  onOpen,
  onDelete,
}: {
  title: string;
  users: User[];
  kind: "client" | "professional";
  onToggle: (user: User) => void;
  onOpen: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const Icon = kind === "professional" ? ShieldCheck : UsersRound;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.035]">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl ${kind === "professional" ? "bg-indigo-500/15 text-indigo-300" : "bg-cyan-500/15 text-cyan-300"}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-400">{users.length} accounts</p>
          </div>
        </div>
      </header>
      <div className="divide-y divide-white/10">
        {users.map((user) => (
          <article
            key={user.id}
            onClick={() => onOpen(user)}
            className="flex cursor-pointer flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-white/[.045]"
          >
            <span
              className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${kind === "professional" ? "bg-indigo-500/15 text-indigo-200" : "bg-cyan-500/15 text-cyan-200"}`}
            >{`${user.firstName?.[0] ?? "U"}${user.lastName?.[0] ?? ""}`}</span>
            <div className="min-w-48 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                {user.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">{user.email}</p>
              <p className="mt-1 text-xs text-indigo-300">
                Click to view full profile and activity
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}
            >
              {user.isActive ? "Enabled" : "Disabled"}
            </span>
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onToggle(user);
              }}
              variant="outline"
              className={
                user.isActive
                  ? "border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                  : "border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100"
              }
            >
              <Power className="mr-2 h-4 w-4" />
              {user.isActive ? "Disable" : "Enable"}
            </Button>
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onDelete(user);
              }}
              variant="outline"
              className="border-white/10 bg-transparent text-slate-400 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </article>
        ))}
        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-400">No {title.toLowerCase()} found.</p>
        )}
      </div>
    </section>
  );
}
export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [activeGroup, setActiveGroup] = useState<"clients" | "professionals">("professionals");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ user: User; kind: "toggle" | "delete" } | null>(
    null,
  );
  useEffect(() => {
    void fetch("/api/v1/admin/data/users", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setUsers(data.users ?? []));
  }, []);
  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          !query ||
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query),
      ),
    [users, query],
  );
  const clients = useMemo(() => filtered.filter((user) => user.role === "CLIENT"), [filtered]);
  const professionals = useMemo(
    () => filtered.filter((user) => user.role === "PROFESSIONAL"),
    [filtered],
  );
  const openUser = (user: User) => {
    setDetail(null);
    void fetch(`/api/v1/admin/users/${user.id}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(setDetail);
  };
  const toggle = async (user: User) => {
    const response = await fetch(`/api/v1/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Account update failed.");
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, isActive: data.user.isActive } : item,
      ),
    );
    setMessage(
      `${user.firstName}'s account is now ${data.user.isActive ? "enabled" : "disabled"}.`,
    );
  };
  const deleteUser = async (user: User) => {
    const response = await fetch(`/api/v1/admin/users/${user.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(data.error ?? "Unable to delete account.");
    setUsers((current) => current.filter((item) => item.id !== user.id));
    setDetail((current) => (current?.user.id === user.id ? null : current));
    setMessage(`${user.firstName} ${user.lastName}'s account was deleted.`);
  };
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">Admin module</p>
      <h1 className="mt-2 font-display text-3xl font-bold">User management</h1>
      <p className="mt-2 text-slate-400">
        Manage Clients and Professionals independently. Disabled accounts cannot use the
        platform.
      </p>
      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email…"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[.035] pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setActiveGroup("clients")}
          className={`rounded-2xl border p-5 text-left transition ${activeGroup === "clients" ? "border-cyan-300 bg-cyan-400/10 ring-1 ring-cyan-300/40" : "border-cyan-400/15 bg-cyan-400/[.04] hover:bg-cyan-400/[.08]"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Clients</p>
          <p className="mt-2 text-3xl font-bold text-white">{clients.length}</p>
          <p className="mt-2 text-xs text-cyan-200">Click to view clients</p>
        </button>
        <button
          onClick={() => setActiveGroup("professionals")}
          className={`rounded-2xl border p-5 text-left transition ${activeGroup === "professionals" ? "border-indigo-300 bg-indigo-400/10 ring-1 ring-indigo-300/40" : "border-indigo-400/15 bg-indigo-400/[.04] hover:bg-indigo-400/[.08]"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Professionals
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{professionals.length}</p>
          <p className="mt-2 text-xs text-indigo-200">Click to view professionals</p>
        </button>
      </div>
      {message && (
        <p className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </p>
      )}
      <div className="mt-6">
        {activeGroup === "professionals" ? (
          <UserGroup
            title="Professionals"
            users={professionals}
            kind="professional"
            onToggle={(user) => setConfirmAction({ user, kind: "toggle" })}
            onOpen={openUser}
            onDelete={(user) => setConfirmAction({ user, kind: "delete" })}
          />
        ) : (
          <UserGroup
            title="Clients"
            users={clients}
            kind="client"
            onToggle={(user) => setConfirmAction({ user, kind: "toggle" })}
            onOpen={openUser}
            onDelete={(user) => setConfirmAction({ user, kind: "delete" })}
          />
        )}
      </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11182b] p-6">
            <h2 className="font-display text-lg font-bold text-white">
              {confirmAction.kind === "delete"
                ? "Delete account?"
                : `${confirmAction.user.isActive ? "Disable" : "Enable"} account?`}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {confirmAction.user.firstName} {confirmAction.user.lastName}{" "}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confirmAction.user.role === "PROFESSIONAL" ? "bg-indigo-500/15 text-indigo-300" : "bg-cyan-500/15 text-cyan-300"}`}
              >
                {confirmAction.user.role === "PROFESSIONAL" ? "Professional" : "Client"}
              </span>{" "}
              {confirmAction.kind === "delete"
                ? "and their account data will be permanently deleted. This cannot be undone."
                : confirmAction.user.isActive
                  ? "will lose access to the platform."
                  : "will regain access to the platform."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className={
                  confirmAction.kind === "delete" || confirmAction.user.isActive
                    ? "border-rose-400/30 bg-transparent text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                    : "border-emerald-400/30 bg-transparent text-emerald-200 hover:bg-emerald-500/10 hover:text-emerald-100"
                }
                onClick={() => {
                  const { user, kind } = confirmAction;
                  setConfirmAction(null);
                  if (kind === "delete") void deleteUser(user);
                  else void toggle(user);
                }}
              >
                {confirmAction.kind === "delete"
                  ? "Delete"
                  : confirmAction.user.isActive
                    ? "Disable"
                    : "Enable"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11182b] p-6">
            <button
              onClick={() => setDetail(null)}
              className="float-right rounded-lg p-2 text-slate-400 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
              User profile
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white">
              {detail.user.firstName} {detail.user.lastName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {detail.user.email} {detail.user.phone ? `· ${detail.user.phone}` : ""}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Jobs posted", detail.stats.jobsPosted, BriefcaseBusiness],
                ["Proposals", detail.stats.proposals, UserRound],
                ["Projects", detail.stats.projects, CheckCircle2],
                ["Payments", detail.stats.completedPayments, DollarSign],
                ["Money", `₹${detail.stats.money.toLocaleString()}`, DollarSign],
                ["Services", detail.stats.services, ShieldCheck],
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof DollarSign;
                return (
                  <div
                    key={label as string}
                    className="rounded-xl border border-white/10 bg-[#0b1020] p-4"
                  >
                    <MetricIcon className="h-4 w-4 text-indigo-400" />
                    <p className="mt-3 text-xl font-bold text-white">{value as string | number}</p>
                    <p className="text-xs text-slate-400">{label as string}</p>
                  </div>
                );
              })}
            </div>
            <section className="mt-6 rounded-xl border border-white/10 bg-[#0b1020] p-5">
              <h3 className="font-semibold text-white">Account details</h3>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p className="text-slate-400">
                  Role <span className="ml-2 text-white">{detail.user.role}</span>
                </p>
                <p className="text-slate-400">
                  Status{" "}
                  <span className="ml-2 text-white">
                    {detail.user.isActive ? "Enabled" : "Disabled"}
                  </span>
                </p>
                <p className="text-slate-400">
                  Category{" "}
                  <span className="ml-2 text-white">{detail.user.professionalCategory ?? "—"}</span>
                </p>
                <p className="text-slate-400">
                  Location{" "}
                  <span className="ml-2 text-white">
                    {detail.user.professionalCity ?? detail.user.address ?? "—"}
                  </span>
                </p>
                <p className="text-slate-400">
                  Company <span className="ml-2 text-white">{detail.user.companyName ?? "—"}</span>
                </p>
                <p className="text-slate-400">
                  Rating{" "}
                  <span className="ml-2 text-white">
                    {detail.user.averageRating} ({detail.user.reviewCount} reviews)
                  </span>
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
