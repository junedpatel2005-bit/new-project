"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import { ClientAccountMenu } from "@/components/ClientAccountMenu";
import { Button } from "@/components/ui/button";

type DashboardNotification = {
  id: number;
  title: string;
  description: string | null;
  href?: string | null;
  createdAt: string;
  readAt: string | null;
};

export function AppHeader({ role }: { role?: string }) {
  const bellRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/portal/notifications", { cache: "no-store" });
      if (!response.ok) return;
      setNotifications(((await response.json()) as DashboardNotification[]).slice(0, 5));
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    window.addEventListener("servio:notification", loadNotifications);
    return () => window.removeEventListener("servio:notification", loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!bellRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;

  function markRead(id: number) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    );
    void fetch("/api/v1/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search jobs, professionals..."
            className="h-9 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      {role !== "PROFESSIONAL" && (
        <Link href="/post-job" className="hidden sm:inline-flex">
          <Button size="sm" className="bg-cta text-cta-foreground hover:bg-cta/90">
            Post a Job
          </Button>
        </Link>
      )}
      <div ref={bellRef} className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen((open) => !open)}
          className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-cta-foreground">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-[360px] rounded-2xl border border-border bg-popover p-3 shadow-elevated">
            <div className="mb-2 flex items-center justify-between px-2 pb-2 pt-1">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadNotifications > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadNotifications} new
                </span>
              )}
            </div>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="rounded-xl bg-muted px-3 py-4 text-sm text-muted-foreground">
                  You have no notifications yet.
                </p>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href ?? "/notifications"}
                    onClick={() => {
                      setNotificationsOpen(false);
                      markRead(notification.id);
                    }}
                    className="block rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      {!notification.readAt && (
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    {notification.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notification.description}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))
              )}
            </div>
            <Link
              href="/notifications"
              onClick={() => setNotificationsOpen(false)}
              className="mt-3 block rounded-lg border border-border bg-muted px-3 py-2 text-center text-sm font-medium text-primary hover:bg-muted/80"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ClientAccountMenu />
      </div>
    </header>
  );
}
