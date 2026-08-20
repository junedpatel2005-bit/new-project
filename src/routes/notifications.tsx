"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
type Notification = {
  id: number;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};
export default function Notifications() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState(false);
  const loadNotifications = useCallback(() => {
    setError(false);
    return fetch("/api/v1/portal/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notifications");
        setItems((await response.json()) as Notification[]);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    void loadNotifications();
    window.addEventListener("servio:notification", loadNotifications);
    return () => window.removeEventListener("servio:notification", loadNotifications);
  }, [loadNotifications]);
  function markRead(id: number) {
    setItems(
      (current) =>
        current?.map((item) =>
          item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
        ) ?? current,
    );
    void fetch("/api/v1/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {!items && !error && <div className="mt-6 h-48 animate-pulse rounded-2xl bg-muted" />}
      {error && (
        <p className="mt-6 rounded-xl border border-destructive/30 p-4 text-destructive">
          Notifications could not be loaded.
        </p>
      )}
      {items &&
        (items.length ? (
          <ul className="mt-6 divide-y rounded-2xl border border-border bg-card">
            {items.map((item) => {
              const body = (
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!item.readAt && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => markRead(item.id)}
                      className="block p-5 transition-colors hover:bg-muted/60"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className="block w-full p-5 text-left transition-colors hover:bg-muted/60"
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            You have no notifications.
          </p>
        ))}
    </div>
  );
}
