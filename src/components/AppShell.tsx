"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppMobileNavigation, AppSidebar, type NavigationItem } from "@/components/AppNavigation";
import {
  BadgeCheck,
  BellRing,
  Briefcase,
  FileBarChart,
  FolderKanban,
  Home,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";

const clientItems: NavigationItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/discover", icon: Users, label: "Find pros" },
  { to: "/post-job", icon: PlusCircle, label: "Post a job" },
  { to: "/my-jobs", icon: FolderKanban, label: "Projects" },
  { to: "/reports", icon: FileBarChart, label: "Reports" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/verification", icon: BadgeCheck, label: "Verification" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
];

const professionalItems: NavigationItem[] = [
  { to: "/professional/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/professional/my-jobs", icon: FolderKanban, label: "My Jobs" },
  { to: "/professional/running-projects", icon: Briefcase, label: "Running Projects" },
  { to: "/professional/reports", icon: FileBarChart, label: "Reports" },
  { to: "/verification", icon: BadgeCheck, label: "Verification" },
  { to: "/professional/reviews", icon: Star, label: "Reviews" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
  { to: "/professional-profile", icon: User, label: "Profile" },
];

const clientMobileItems: NavigationItem[] = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/discover", icon: Search, label: "Search" },
  { to: "/my-jobs", icon: Briefcase, label: "Jobs" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/dashboard", icon: User, label: "Profile" },
];

const professionalMobileItems: NavigationItem[] = [
  { to: "/professional/dashboard", icon: Home, label: "Home" },
  { to: "/professional/my-jobs", icon: Briefcase, label: "Jobs" },
  { to: "/professional/running-projects", icon: Briefcase, label: "Running" },
  { to: "/professional/reviews", icon: Star, label: "Reviews" },
  { to: "/earnings", icon: Wallet, label: "Earnings" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
  { to: "/professional-profile", icon: User, label: "Profile" },
];

type PortalUser = {
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
};

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [items, setItems] = useState<NavigationItem[]>(clientItems);
  const [mobileItems, setMobileItems] = useState<NavigationItem[]>(clientMobileItems);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: PortalUser } | null) => {
        const nextUser = data?.user ?? null;
        setUser(nextUser);
        const professional = nextUser?.role === "PROFESSIONAL";
        setItems(professional ? professionalItems : clientItems);
        setMobileItems(professional ? professionalMobileItems : clientMobileItems);
      })
      .catch(() => {
        setUser(null);
        setItems(clientItems);
        setMobileItems(clientMobileItems);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <AppSidebar items={items} pathname={pathname} />
      <div className="lg:pl-64">
        <AppHeader role={user?.role} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {title && (
            <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{title}</h1>
          )}
          {children}
        </main>
      </div>
      <AppMobileNavigation items={mobileItems} pathname={pathname} />
    </div>
  );
}
