"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Bell, Search } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Wallet,
  BellRing,
  ShieldCheck,
  PlusCircle,
  MessageSquare,
  BadgeCheck,
  Home,
  Briefcase,
  User,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientAccountMenu } from "@/components/ClientAccountMenu";

const clientItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/discover", icon: Users, label: "Find pros" },
  { to: "/post-job", icon: PlusCircle, label: "Post a job" },
  { to: "/my-jobs", icon: FolderKanban, label: "Projects" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/verification", icon: BadgeCheck, label: "Verification" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
];

const professionalItems = [
  { to: "/professional/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/professional/my-jobs", icon: FolderKanban, label: "My Jobs" },
  { to: "/professional/running-projects", icon: Briefcase, label: "Running Projects" },
  { to: "/verification", icon: BadgeCheck, label: "Verification" },
  { to: "/professional/reviews", icon: Star, label: "Reviews" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
  { to: "/professional-profile", icon: User, label: "Profile" },
];

const clientMobileItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/discover", icon: Search, label: "Search" },
  { to: "/my-jobs", icon: Briefcase, label: "Jobs" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/dashboard", icon: User, label: "Profile" },
];

const professionalMobileItems = [
  { to: "/professional/dashboard", icon: Home, label: "Home" },
  { to: "/professional/my-jobs", icon: Briefcase, label: "Jobs" },
  { to: "/professional/running-projects", icon: Briefcase, label: "Running" },
  { to: "/professional/reviews", icon: Star, label: "Reviews" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
  { to: "/professional-profile", icon: User, label: "Profile" },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const path = usePathname();
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
  } | null>(null);
  const [items, setItems] = useState(clientItems);
  const [mobileItemsState, setMobileItemsState] = useState(clientMobileItems);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            user?: { firstName: string; lastName: string; role: string; avatarUrl: string | null };
          } | null,
        ) => {
          const nextUser = data?.user ?? null;
          setUser(nextUser);
          if (nextUser?.role === "PROFESSIONAL") {
            setItems(professionalItems);
            setMobileItemsState(professionalMobileItems);
          } else {
            setItems(clientItems);
            setMobileItemsState(clientMobileItems);
          }
        },
      )
      .catch(() => {
        setUser(null);
        setItems(clientItems);
        setMobileItemsState(clientMobileItems);
      });
  }, []);
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="px-3 py-2">
          {items.map((it) => {
            const active = path === it.to || path.startsWith(`${it.to}/`);
            return (
              <Link
                key={it.to}
                href={it.to}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium shadow-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-ink p-4 text-ink-foreground shadow-elevated">
          <p className="font-display text-sm font-semibold text-white">Upgrade to Pro</p>
          <p className="mt-1 text-xs text-white/70">Unlock AI proposals & priority support.</p>
          <Button size="sm" className="mt-3 w-full bg-cta text-cta-foreground hover:bg-cta/90">
            Upgrade
          </Button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search jobs, professionals…"
                className="h-9 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          {user?.role !== "PROFESSIONAL" ? (
            <Link href="/post-job" className="hidden sm:inline-flex">
              <Button size="sm" className="bg-cta text-cta-foreground hover:bg-cta/90">
                Post a Job
              </Button>
            </Link>
          ) : null}
          <Link
            href="/notifications"
            className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cta" />
          </Link>
          <div className="flex items-center gap-2">
            <ClientAccountMenu />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {title && (
            <h1 className="font-display mb-6 text-3xl font-bold tracking-tight">{title}</h1>
          )}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-6">
          {mobileItemsState.map((it) => {
            const active = path === it.to || path.startsWith(`${it.to}/`);
            return (
              <Link
                key={it.label}
                href={it.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <it.icon className="h-5 w-5" />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
