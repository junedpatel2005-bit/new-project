"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Search, ShieldCheck, Users } from "lucide-react";
import { ProCard } from "@/components/ProCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import type { MarketplaceCategory, MarketplaceProfessional } from "@/lib/types/marketplace";

export default function Landing() {
  const [data, setData] = useState<{
    categories: MarketplaceCategory[];
    professionals: MarketplaceProfessional[];
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void Promise.all([
      fetch("/api/marketplace/categories"),
      fetch("/api/marketplace/professionals"),
    ])
      .then(async ([categories, professionals]) => {
        if (!categories.ok || !professionals.ok) throw new Error("Marketplace request failed");
        setData({
          categories: (await categories.json()) as MarketplaceCategory[],
          professionals: (await professionals.json()) as MarketplaceProfessional[],
        });
      })
      .catch(() => setFailed(true));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verified marketplace
              professionals
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Find trusted professionals for work that matters.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Post work, compare qualified professionals, and manage every project in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/discover">
                  <Search className="mr-2 h-4 w-4" />
                  Browse professionals
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/post-job">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Post a job
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Live marketplace
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold">Featured services</h2>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              href="/services"
            >
              All services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!data && !failed && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}
          {failed && (
            <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Marketplace data is unavailable. Please refresh to try again.
            </p>
          )}
          {data && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/discover?category=${encodeURIComponent(category.slug)}`}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/30"
                >
                  <Users className="h-6 w-6 text-primary" />
                  <p className="mt-4 font-semibold">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {category.professionalCount} professionals
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Featured
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  Professionals ready to help
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                href="/discover"
              >
                Browse all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {!data && !failed && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}
            {data && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {data.professionals.slice(0, 4).map((professional) => (
                  <ProCard key={professional.id} pro={professional} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
