"use client";
import { useCallback, useEffect, useState } from "react";
type Notification = {
  id: number;
  type: string;
  title: string;
  description: string | null;
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
            {items.map((item) => (
              <li key={item.id} className="p-5">
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            You have no notifications.
          </p>
        ))}
    </div>
  );
}
