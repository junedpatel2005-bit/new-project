"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export type NavigationItem = { to: string; icon: ElementType; label: string };

export function AppSidebar({ items, pathname }: { items: NavigationItem[]; pathname: string }) {
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
  );
}

export function AppMobileNavigation({
  items,
  pathname,
}: {
  items: NavigationItem[];
  pathname: string;
}) {
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
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
