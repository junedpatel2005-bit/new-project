"use client";

import Link from "next/link";
import { useEffect, useState, type ElementType } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export type NavigationItem = { to: string; icon: ElementType; label: string };

function useUnreadMessages() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => {
      void fetch("/api/v1/messages", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { contacts?: { unreadCount?: number }[] } | null) =>
          setCount(
            data?.contacts?.reduce((total, contact) => total + (contact.unreadCount ?? 0), 0) ?? 0,
          ),
        )
        .catch(() => setCount(0));
    };
    load();
    window.addEventListener("servio:message", load);
    window.addEventListener("servio:message-read", load);
    window.addEventListener("servio:notifications-read", load);
    return () => {
      window.removeEventListener("servio:message", load);
      window.removeEventListener("servio:message-read", load);
      window.removeEventListener("servio:notifications-read", load);
    };
  }, []);
  return count;
}

function useUnreadNotifications() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => {
      void fetch("/api/v1/portal/notifications", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { readAt?: string | null }[] | null) =>
          setCount(data?.filter((notification) => !notification.readAt).length ?? 0),
        )
        .catch(() => setCount(0));
    };
    load();
    window.addEventListener("servio:notification", load);
    window.addEventListener("servio:message", load);
    window.addEventListener("servio:message-read", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("servio:notification", load);
      window.removeEventListener("servio:message", load);
      window.removeEventListener("servio:message-read", load);
      window.removeEventListener("focus", load);
    };
  }, []);
  return count;
}

export function AppSidebar({ items, pathname }: { items: NavigationItem[]; pathname: string }) {
  const unreadMessages = useUnreadMessages();
  const unreadNotifications = useUnreadNotifications();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-primary font-medium text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.label === "Messages" && unreadMessages > 0 && !active && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1 text-[10px] font-bold text-cta-foreground">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
              {item.label === "Notifications" && unreadNotifications > 0 && !active && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1 text-[10px] font-bold text-cta-foreground">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppMobileNavigation({
  items,
  pathname,
}: {
  items: NavigationItem[];
  pathname: string;
}) {
  const unreadMessages = useUnreadMessages();
  const unreadNotifications = useUnreadNotifications();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-6">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.label}
              href={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label === "Messages" && unreadMessages > 0 && !active && (
                <span className="absolute ml-5 mt-[-18px] grid h-4 min-w-4 place-items-center rounded-full bg-cta px-1 text-[9px] font-bold text-cta-foreground">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
              {item.label === "Notifications" && unreadNotifications > 0 && !active && (
                <span className="absolute ml-5 mt-[-18px] grid h-4 min-w-4 place-items-center rounded-full bg-cta px-1 text-[9px] font-bold text-cta-foreground">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
