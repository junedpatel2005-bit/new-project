"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AdminNotification = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[] | null>(null);
  const [error, setError] = useState(false);

  const loadNotifications = useCallback(() => {
    setError(false);
    return fetch("/api/v1/portal/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notifications");
        setNotifications((await response.json()) as AdminNotification[]);
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
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
            Admin activity
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-2 text-sm text-slate-400">
            Account, job, and proposal activity across the marketplace.
          </p>
        </div>
      </div>
      {!notifications && !error && (
        <div className="mt-8 h-52 animate-pulse rounded-2xl bg-white/5" />
      )}
      {error && (
        <p className="mt-8 rounded-xl border border-rose-500/30 p-4 text-sm text-rose-300">
          Notifications could not be loaded.
        </p>
      )}
      {notifications &&
        (notifications.length ? (
          <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
            {notifications.map((notification) => (
              <article key={notification.id} className="p-5">
                <p className="font-medium text-white">{notification.title}</p>
                {notification.description && (
                  <p className="mt-1 text-sm text-slate-400">{notification.description}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-6 text-sm text-slate-400">
            No admin notifications yet.
          </p>
        ))}
    </div>
  );
}
