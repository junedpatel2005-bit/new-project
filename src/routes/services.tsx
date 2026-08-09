"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderTree } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { MarketplaceCategory } from "@/lib/types/marketplace";

export default function Services() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    void fetch("/api/marketplace/categories")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load categories");
        setCategories((await response.json()) as MarketplaceCategory[]);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Marketplace</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Browse all services
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore categories backed by active professional profiles.
        </p>
        {status === "loading" && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        )}
        {status === "error" && (
          <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Categories could not be loaded. Please refresh and try again.
          </p>
        )}
        {status === "ready" && categories.length === 0 && (
          <p className="mt-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No service categories have been published yet.
          </p>
        )}
        {status === "ready" && categories.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/discover?category=${encodeURIComponent(category.slug)}`}
                className="group flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FolderTree className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-display text-base font-semibold">
                    {category.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {category.professionalCount} professionals
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {category.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
