"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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

const PortalTitleContext = createContext<{
  title?: string;
  setTitle: (title?: string) => void;
}>({ setTitle: () => {} });

export function PortalTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | undefined>(undefined);
  return (
    <PortalTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PortalTitleContext.Provider>
  );
}

export function usePortalTitle() {
  return useContext(PortalTitleContext);
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { title } = usePortalTitle();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [items, setItems] = useState<NavigationItem[]>(clientItems);
  const [mobileItems, setMobileItems] = useState<NavigationItem[]>(clientMobileItems);
  const profileRoute =
    pathname === "/client-profile" ||
    pathname === "/professional-profile" ||
    pathname === "/professional/setup";
  const showPortalNavigation = user && (!profileRoute || searchParams.get("from") === "dashboard");

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
      {showPortalNavigation && <AppSidebar items={items} pathname={pathname} />}
      <div className={showPortalNavigation ? "lg:pl-64" : ""}>
        <AppHeader role={user?.role} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {title && (
            <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{title}</h1>
          )}
          {children}
        </main>
      </div>
      {showPortalNavigation && <AppMobileNavigation items={mobileItems} pathname={pathname} />}
    </div>
  );
}
