"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, MapPin, Search, Star } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import type { MarketplaceCategory, MarketplaceJob } from "@/lib/types/marketplace";

function budget(job: MarketplaceJob) {
  if (job.timingType === "HOURLY")
    return job.hourlyRate == null ? "Rate not set" : `$${job.hourlyRate.toLocaleString()}/hr`;
  if (job.budgetMin == null && job.budgetMax == null) return "Budget on request";
  return `$${job.budgetMin?.toLocaleString() ?? "—"} – $${job.budgetMax?.toLocaleString() ?? "—"}`;
}

const workModeOptions: [string, string][] = [
  ["REMOTE", "Remote"],
  ["ON_SITE", "On site"],
  ["BOTH", "Flexible"],
];

export default function Services() {
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [urgency, setUrgency] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/marketplace/jobs", { cache: "no-store" }),
      fetch("/api/v1/marketplace/categories", { cache: "no-store" }),
    ])
      .then(async ([jobsResponse, categoriesResponse]) => {
        if (!jobsResponse.ok || !categoriesResponse.ok)
          throw new Error("Unable to load marketplace jobs");
        setJobs((await jobsResponse.json()) as MarketplaceJob[]);
        setCategories((await categoriesResponse.json()) as MarketplaceCategory[]);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: { role?: string } } | null) => setRole(data?.user?.role ?? null))
      .catch(() => setRole(null));
  }, []);

  const visibleJobs = useMemo(() => {
    const text = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesText =
        !text ||
        [job.title, job.description, job.category, job.client.name, job.location]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
      return (
        matchesText &&
        (!category || job.category === category) &&
        (!workMode || job.workMode === workMode) &&
        (!urgency || job.urgency === urgency)
      );
    });
  }, [jobs, query, category, workMode, urgency]);

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setWorkMode("");
    setUrgency("");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Marketplace jobs
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Browse client jobs
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore open work posted by clients and find the right service category for you.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="mt-5 space-y-6">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Job, client, location"
                    className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </label>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Service category
                </legend>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="category"
                      checked={!category}
                      onChange={() => setCategory("")}
                      className="accent-primary"
                    />
                    All categories
                  </label>
                  {categories.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="category"
                        checked={category === item.name}
                        onChange={() => setCategory(item.name)}
                        className="accent-primary"
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Work mode
                </legend>
                <div className="space-y-2">
                  {workModeOptions.map(([value, text]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="workMode"
                        checked={workMode === value}
                        onChange={() => setWorkMode(workMode === value ? "" : value)}
                        className="accent-primary"
                      />
                      {text}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Urgency
                </legend>
                <div className="space-y-2">
                  {["HIGH", "MEDIUM", "LOW"].map((value) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="urgency"
                        checked={urgency === value}
                        onChange={() => setUrgency(urgency === value ? "" : value)}
                        className="accent-primary"
                      />
                      {value[0] + value.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {status === "ready"
                  ? `${visibleJobs.length} open ${visibleJobs.length === 1 ? "job" : "jobs"}`
                  : "Loading jobs…"}
              </p>
              {role === "CLIENT" ? (
                <Button asChild size="sm">
                  <Link href="/post-job">Post a job</Link>
                </Button>
              ) : null}
            </div>
            {status === "loading" && (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-60 animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            )}
            {status === "error" && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Jobs could not be loaded. Please refresh and try again.
              </p>
            )}
            {status === "ready" && !visibleJobs.length && (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No open jobs match these filters.
              </p>
            )}
            {status === "ready" && visibleJobs.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/job/${job.id}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {job.category}
                        </p>
                        <h2 className="mt-2 truncate font-display text-lg font-semibold">
                          {job.title}
                        </h2>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${job.urgency === "HIGH" ? "bg-rose-500/10 text-rose-600" : "bg-muted text-muted-foreground"}`}
                      >
                        {job.urgency.toLowerCase()} priority
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {job.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location ?? "Remote"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {budget(job)}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                          {job.client.name.charAt(0)}
                        </span>
                        <span>
                          <span className="block font-medium text-foreground">
                            {job.client.name}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {job.client.rating.toFixed(1)} client rating
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-primary group-hover:underline">
                        View job
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
