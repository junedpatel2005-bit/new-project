"use client";

import { AppShell } from "@/components/AppShell";
import { notifications } from "@/lib/mock-data";
import { Briefcase, DollarSign, Star, Settings, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const tabs = ["All", "Jobs", "Payments", "Reviews"] as const;
const iconFor = (t: string) => (t === "job" ? Briefcase : t === "payment" ? DollarSign : Star);
const tintFor = (t: string) =>
  t === "job"
    ? "bg-primary/10 text-primary"
    : t === "payment"
      ? "bg-success/15 text-success"
      : "bg-warning/15 text-warning-foreground";

export default function Notifications() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const filtered = notifications.filter((n) =>
    tab === "All"
      ? true
      : tab === "Jobs"
        ? n.type === "job"
        : tab === "Payments"
          ? n.type === "payment"
          : n.type === "review",
  );

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay on top of jobs, payments and reviews.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <BellOff className="h-4 w-4" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex gap-1 border-b border-border p-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-border">
          {filtered.map((n) => {
            const Icon = iconFor(n.type);
            return (
              <li
                key={n.id}
                className={`flex gap-4 p-5 transition-colors hover:bg-muted/40 ${n.unread ? "bg-primary/[0.02]" : ""}`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tintFor(n.type)}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.desc}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
