"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppMobileNavigation, AppSidebar, type NavigationItem } from "@/components/AppNavigation";
import {
  clientItems,
  clientMobileItems,
  professionalItems,
  professionalMobileItems,
} from "@/lib/portal-navigation";

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
      {user && <AppSidebar items={items} pathname={pathname} user={user} />}
      <div className={user ? "lg:pl-64" : ""}>
        <AppHeader role={user?.role} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {title && (
            <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{title}</h1>
          )}
          {children}
        </main>
      </div>
      {user && <AppMobileNavigation items={mobileItems} pathname={pathname} />}
    </div>
  );
}
