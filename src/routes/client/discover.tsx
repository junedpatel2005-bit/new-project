"use client";

import { AppShell } from "@/components/AppShell";
import { ProCard } from "@/components/ProCard";
import type { MarketplaceCategory, MarketplaceProfessional } from "@/lib/types/marketplace";
import { Map, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export default function Discover() {
  const [professionals, setProfessionals] = useState<MarketplaceProfessional[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [prosResponse, categoriesResponse] = await Promise.all([
          fetch("/api/marketplace/professionals", { signal: controller.signal }),
          fetch("/api/marketplace/categories", { signal: controller.signal }),
        ]);
        if (!prosResponse.ok || !categoriesResponse.ok)
          throw new Error("Marketplace request failed");
        setProfessionals((await prosResponse.json()) as MarketplaceProfessional[]);
        setCategories((await categoriesResponse.json()) as MarketplaceCategory[]);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find professionals</h1>
          <p className="text-sm text-muted-foreground">
            {professionals.length * 350}+ vetted pros across all categories.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Map className="h-4 w-4" /> View on map
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft h-fit lg:sticky lg:top-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Filters</h2>
            <button className="text-xs text-primary hover:underline">Clear all</button>
          </div>

          <FilterSection title="Category">
            <div className="space-y-2">
              {categories.slice(0, 6).map((c) => (
                <label key={c.name} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.professionalCount}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Hourly rate">
            <div className="px-1">
              <input
                type="range"
                min="10"
                max="300"
                defaultValue="120"
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>$10</span>
                <span>$300+</span>
              </div>
            </div>
          </FilterSection>

          <FilterSection title="Distance">
            <select className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm">
              <option>Within 5 miles</option>
              <option>Within 10 miles</option>
              <option>Within 25 miles</option>
              <option>Anywhere</option>
            </select>
          </FilterSection>

          <FilterSection title="Availability">
            {["Available now", "This week", "Next week"].map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                {a}
              </label>
            ))}
          </FilterSection>

          <FilterSection title="Rating">
            <div className="space-y-2">
              {[5, 4, 3].map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                  {r}.0 & up
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Verified only">
            <label className="flex items-center justify-between text-sm">
              <span>Verified pros</span>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
          </FilterSection>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Try 'plumber', 'react developer', 'wedding photographer'"
              />
            </div>
            <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option>Sort: Best match</option>
              <option>Top rated</option>
              <option>Lowest price</option>
              <option>Closest</option>
            </select>
            <Button variant="outline" size="sm" className="gap-2 lg:hidden">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>

          {/* Map placeholder */}
          <div className="mb-4 hidden h-40 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-soft md:block">
            <div className="flex h-full items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Pros near you</p>
                <p className="text-xs text-muted-foreground">
                  {professionals.filter((p) => p.location !== null).length} professionals available
                </p>
              </div>
              <div className="relative h-full w-1/2">
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-1 opacity-40">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="rounded bg-primary/20" />
                  ))}
                </div>
                <div className="grid h-full grid-cols-2 gap-3 p-6">
                  {professionals.slice(0, 4).map((professional) => (
                    <span
                      key={professional.id}
                      className="h-3 w-3 animate-pulse rounded-full bg-primary ring-4 ring-primary/20"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {status === "loading" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
            </div>
          )}
          {status === "error" && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              Professionals could not be loaded. Refresh the page to try again.
            </div>
          )}
          {status === "ready" && professionals.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No professionals match these filters yet.
            </div>
          )}
          {status === "ready" && professionals.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {professionals.map((p) => (
                <ProCard key={p.id} pro={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ResultSkeleton() {
  return (
    <div aria-hidden className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40" />
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
