"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, BriefcaseBusiness, Check, MessageCircle } from "lucide-react";

type Notification = {
  id: number;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

function NotificationIcon({ type }: { type: string }) {
  return type === "NEW_MESSAGE" ? (
    <MessageCircle className="h-5 w-5" />
  ) : type.includes("JOB") || type.includes("PROPOSAL") ? (
    <BriefcaseBusiness className="h-5 w-5" />
  ) : (
    <Bell className="h-5 w-5" />
  );
}

export function NotificationInbox({ admin = false }: { admin?: boolean }) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/portal/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load notifications");
      const nextItems = (await response.json()) as Notification[];
      setItems(nextItems);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("servio:notification", load);
    return () => window.removeEventListener("servio:notification", load);
  }, [load]);

  const unread = useMemo(() => items?.filter((item) => !item.readAt).length ?? 0, [items]);

  async function markRead(id: number) {
    setItems(
      (current) =>
        current?.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ) ?? null,
    );
    await fetch("/api/v1/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setItems(
      (current) =>
        current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ??
        null,
    );
    await fetch("/api/v1/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }

  const shell = admin ? "border-white/10 bg-[#11182b] text-white" : "border-border bg-card";
  const muted = admin ? "text-slate-400" : "text-muted-foreground";

  return (
    <div className={`overflow-hidden rounded-3xl border shadow-soft ${shell}`}>
      <div className={`border-b p-6 sm:p-8 ${admin ? "border-white/10" : "border-border"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`grid h-12 w-12 place-items-center rounded-2xl ${admin ? "bg-indigo-500/15 text-indigo-300" : "bg-primary/10 text-primary"}`}
            >
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[.2em] ${admin ? "text-indigo-300" : "text-primary"}`}
              >
                Activity center
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold">Notifications</h1>
              <p className={`mt-2 text-sm ${muted}`}>
                Messages, project updates, and marketplace activity in one place.
              </p>
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${admin ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-muted text-foreground hover:bg-muted/70"}`}
            >
              <Check className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <div className={`rounded-xl px-4 py-3 ${admin ? "bg-indigo-500/10" : "bg-primary/10"}`}>
            <p className={`text-2xl font-bold ${admin ? "text-indigo-300" : "text-primary"}`}>
              {unread}
            </p>
            <p className={`text-xs ${muted}`}>Unread</p>
          </div>
          <div className={`rounded-xl px-4 py-3 ${admin ? "bg-white/5" : "bg-muted"}`}>
            <p className="text-2xl font-bold">{items?.length ?? 0}</p>
            <p className={`text-xs ${muted}`}>Total activity</p>
          </div>
        </div>
      </div>
      <div className={`p-4 sm:p-6 ${admin ? "bg-[#0b1020]" : "bg-muted/20"}`}>
        {error && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            Notifications could not be loaded.
          </p>
        )}
        {!items && !error && (
          <div className={`h-48 animate-pulse rounded-2xl ${admin ? "bg-white/5" : "bg-muted"}`} />
        )}
        {items && items.length === 0 && (
          <div
            className={`rounded-2xl border border-dashed p-12 text-center ${admin ? "border-white/10" : "border-border"}`}
          >
            <Bell
              className={`mx-auto h-10 w-10 ${admin ? "text-slate-600" : "text-muted-foreground"}`}
            />
            <p className={`mt-3 text-sm ${muted}`}>You’re all caught up.</p>
          </div>
        )}
        {items && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const message = item.type === "NEW_MESSAGE";
              const accent = message
                ? admin
                  ? "border-rose-400/30 bg-rose-400/10"
                  : "border-rose-200 bg-rose-50"
                : admin
                  ? "border-white/10 bg-white/[.035]"
                  : "border-border bg-card";
              const icon = message
                ? admin
                  ? "bg-rose-400/15 text-rose-300"
                  : "bg-rose-100 text-rose-600"
                : admin
                  ? "bg-indigo-400/15 text-indigo-300"
                  : "bg-primary/10 text-primary";
              const content = (
                <div className="flex items-start gap-4">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${icon}`}>
                    <NotificationIcon type={item.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`font-semibold ${message ? (admin ? "text-rose-200" : "text-rose-700") : ""}`}
                        >
                          {item.title}
                        </p>
                        {item.description && (
                          <p className={`mt-1 text-sm ${muted}`}>{item.description}</p>
                        )}
                      </div>
                      {!item.readAt && (
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${message ? "bg-rose-500" : admin ? "bg-indigo-400" : "bg-primary"}`}
                        />
                      )}
                    </div>
                    <p className={`mt-3 text-xs ${muted}`}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {item.href && <ArrowUpRight className={`h-4 w-4 shrink-0 ${muted}`} />}
                </div>
              );
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => void markRead(item.id)}
                  className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className={`block w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${accent}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
