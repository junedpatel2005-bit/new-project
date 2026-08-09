"use client";

import { AppShell } from "@/components/AppShell";
import { adminUsers, verifications, disputes, categories } from "@/lib/mock-data";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  FolderTree,
  Search,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatabaseStatus } from "@/components/DatabaseStatus";
import { useState } from "react";

const tabs = [
  { key: "users", label: "Users", icon: Users },
  { key: "verifications", label: "Verifications", icon: ShieldCheck },
  { key: "disputes", label: "Disputes", icon: AlertTriangle },
  { key: "categories", label: "Categories", icon: FolderTree },
] as const;

export default function Admin() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("users");

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-sm text-muted-foreground">
          Manage users, verifications, disputes and platform settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Total users", v: "12,402", c: "+312 this week" },
          { l: "Pending verifications", v: "47", c: "+12 today" },
          { l: "Open disputes", v: "9", c: "−3 vs. last week" },
          { l: "GMV (30d)", v: "$1.42M", c: "+18%" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">{s.l}</p>
            <p className="mt-1 text-2xl font-semibold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.c}</p>
          </div>
        ))}
      </div>

      <DatabaseStatus />

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search..." />
          </div>
        </div>

        <div className="p-4">
          {tab === "users" && <UsersTable />}
          {tab === "verifications" && <Verifications />}
          {tab === "disputes" && <Disputes />}
          {tab === "categories" && <CategoriesPanel />}
        </div>
      </div>
    </AppShell>
  );
}

function UsersTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-3 pr-4 font-medium">User</th>
            <th className="py-3 pr-4 font-medium">Role</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 font-medium">Joined</th>
            <th className="py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {adminUsers.map((u) => (
            <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://i.pravatar.cc/100?u=${u.id}`}
                    className="h-8 w-8 rounded-full"
                    alt=""
                  />
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4">{u.role}</td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    u.status === "Active"
                      ? "bg-success/15 text-success"
                      : u.status === "Pending"
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {u.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{u.joined}</td>
              <td className="py-3 text-right">
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Verifications() {
  return (
    <ul className="divide-y divide-border">
      {verifications.map((v) => (
        <li key={v.id} className="flex items-center gap-4 py-4">
          <img
            src={`https://i.pravatar.cc/100?u=${v.id}`}
            className="h-10 w-10 rounded-full"
            alt=""
          />
          <div className="flex-1">
            <p className="font-medium">{v.name}</p>
            <p className="text-xs text-muted-foreground">
              {v.type} · submitted {v.submitted}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button size="sm" className="gap-2">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Disputes() {
  return (
    <ul className="divide-y divide-border">
      {disputes.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center gap-4 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{d.job}</p>
            <p className="text-xs text-muted-foreground">
              {d.parties} · opened {d.opened}
            </p>
          </div>
          <span className="text-sm font-semibold">${d.amount.toLocaleString()}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              d.status === "Open"
                ? "bg-destructive/10 text-destructive"
                : "bg-warning/15 text-warning-foreground"
            }`}
          >
            {d.status}
          </span>
          <Button size="sm" variant="outline">
            Review
          </Button>
        </li>
      ))}
    </ul>
  );
}

function CategoriesPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <div
          key={c.name}
          className="flex items-center justify-between rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.count.toLocaleString()} pros</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <button className="flex items-center justify-center rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-muted/50">
        + Add category
      </button>
    </div>
  );
}
