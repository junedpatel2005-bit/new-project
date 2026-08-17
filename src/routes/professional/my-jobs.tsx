"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Map, MapPin, SlidersHorizontal, Star, ShieldCheck, Heart } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MarketplaceCategory } from "@/lib/types/marketplace";

const ProfessionalJobsMap = dynamic(() => import("@/components/ProfessionalJobsMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

const PAGE_SIZE = 20;
const segmentOptions: [string, string][] = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
];

type JobListItem = {
  id: number;
  title: string;
  category: string | null;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  distanceKm: number | null;
  description: string | null;
  clientName: string | null;
  clientRating: number;
  clientVerified: boolean;
  createdAt: string;
  proposalCount: number;
};

type JobsResponse = {
  professional?: { professionalLatitude: number | null; professionalLongitude: number | null };
  openJobs: JobListItem[];
  savedJobs: JobListItem[];
  proposals: unknown[];
  offers: unknown[];
  activeProjects: unknown[];
  completedProjects: unknown[];
};

function formatBudgetAmount(value: number | null | undefined, timingType?: string | null) {
  if (timingType === "HOURLY" && value != null) return `$${value.toLocaleString()}/hr`;
  if (value == null) return "Budget on request";
  return `$${value.toLocaleString()}`;
}

function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
  timingType?: string | null,
) {
  if (timingType === "HOURLY") {
    return min == null ? "Hourly rate not set" : `$${min.toLocaleString()}/hr`;
  }
  if (min == null && max == null) return "Budget on request";
  return `$${min?.toLocaleString() ?? "—"} – $${max?.toLocaleString() ?? "—"}`;
}

function ProfessionalJobsContent() {
  const router = useRouter();
  const [openJobs, setOpenJobs] = useState<JobListItem[]>([]);
  const [hasServiceLocation, setHasServiceLocation] = useState(true);
  const [savedJobs, setSavedJobs] = useState<JobListItem[]>([]);
  const [view, setView] = useState<"all" | "saved">("all");
  const jobs = view === "saved" ? savedJobs : openJobs;
  const savedIds = useMemo(() => new Set(savedJobs.map((job) => job.id)), [savedJobs]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("Best match");
  const [showMap, setShowMap] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  function showJobLocation(jobId: number) {
    setSelectedJobId(jobId);
    setShowMap(true);
    window.requestAnimationFrame(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/v1/portal/professional-jobs", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load jobs");
        const payload = (await response.json()) as JobsResponse;
        if (!active) return;
        setOpenJobs(payload.openJobs ?? []);
        setSavedJobs(payload.savedJobs ?? []);
        setHasServiceLocation(
          payload.professional?.professionalLatitude != null &&
            payload.professional?.professionalLongitude != null,
        );
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError("Unable to load jobs. Please refresh and try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadJobs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "saved") setView("saved");
  }, []);

  useEffect(() => {
    void fetch("/api/v1/marketplace/categories")
      .then((response) => (response.ok ? response.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function bumpProposalCount(list: JobListItem[], jobId: number, delta: number) {
    return list.map((item) =>
      item.id === jobId
        ? { ...item, proposalCount: Math.max(0, item.proposalCount + delta) }
        : item,
    );
  }

  function applySaveChange(saved: boolean, job: JobListItem, delta: number) {
    setOpenJobs((current) => bumpProposalCount(current, job.id, delta));
    setSavedJobs((current) => {
      const bumped = bumpProposalCount(current, job.id, delta);
      if (saved) return bumped.filter((item) => item.id !== job.id);
      if (bumped.some((item) => item.id === job.id)) return bumped;
      return [...bumped, { ...job, proposalCount: Math.max(0, job.proposalCount + delta) }];
    });
  }

  async function toggleSave(job: JobListItem, saved: boolean) {
    const delta = saved ? -1 : 1;
    applySaveChange(saved, job, delta);
    try {
      const response = await fetch(`/api/v1/professional/favorite-jobs/${job.id}`, {
        method: saved ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error();
    } catch {
      applySaveChange(!saved, job, -delta);
      setError("Unable to update saved jobs. Please try again.");
    }
  }

  const topCategories = useMemo(
    () => (segment ? categories.filter((c) => c.parentId === null && c.segment === segment) : []),
    [categories, segment],
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === category) ?? null,
    [categories, category],
  );
  const activeTopCategory = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory.parentId === null) return selectedCategory;
    return categories.find((c) => c.id === selectedCategory.parentId) ?? null;
  }, [categories, selectedCategory]);
  const subCategories = useMemo(
    () => (activeTopCategory ? categories.filter((c) => c.parentId === activeTopCategory.id) : []),
    [categories, activeTopCategory],
  );
  const jobCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      if (!job.category) continue;
      counts[job.category] = (counts[job.category] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const value = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !value ||
        [job.title, job.category, job.locationAddress, job.clientName]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(value));
      const matchesCategory = !category || job.category === category;
      const matchesCity =
        !city || (job.locationAddress ?? "").toLowerCase().includes(city.toLowerCase());
      const matchesRating = minRating === "" || (job.clientRating ?? 0) >= Number(minRating);
      const matchesVerified = !verifiedOnly || job.clientVerified;
      return matchesQuery && matchesCategory && matchesCity && matchesRating && matchesVerified;
    });
  }, [jobs, query, category, city, minRating, verifiedOnly]);

  const visibleJobs = useMemo(() => {
    const sorted = [...filteredJobs];
    if (sort === "Highest rated") {
      sorted.sort((a, b) => (b.clientRating ?? 0) - (a.clientRating ?? 0));
    }
    if (sort === "Newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted.slice(0, PAGE_SIZE);
  }, [filteredJobs, sort]);

  useEffect(() => {
    if (visibleJobs.length === 0) {
      setSelectedJobId(null);
      return;
    }

    const firstJob = visibleJobs[0];
    if (!firstJob) {
      setSelectedJobId(null);
      return;
    }

    if (!selectedJobId || !visibleJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(firstJob.id);
    }
  }, [selectedJobId, visibleJobs]);

  const mapJobs = useMemo(
    () =>
      visibleJobs.filter(
        (job): job is JobListItem & { locationLat: number; locationLng: number } =>
          job.locationLat !== null && job.locationLng !== null,
      ),
    [visibleJobs],
  );

  const selectedJob = mapJobs.find((job) => job.id === selectedJobId) ?? mapJobs[0] ?? null;
  const mapCenter: [number, number] = selectedJob
    ? [selectedJob.locationLat, selectedJob.locationLng]
    : [20, 0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {view === "saved" ? "Saved jobs" : "Find jobs"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleJobs.length} jobs available
            {jobs.length ? ` across ${jobs.length} listings` : ""}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${view === "all" ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            All jobs
          </button>
          <button
            type="button"
            onClick={() => setView("saved")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${view === "saved" ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className="h-3.5 w-3.5" />
            Saved ({savedJobs.length})
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Filters</h2>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setQuery("");
                setSegment("");
                setCategory("");
                setCity("");
                setMinRating("");
                setVerifiedOnly(false);
              }}
            >
              Clear all
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Category
              </p>
              <div className="mb-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-background p-1">
                {segmentOptions.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSegment((current) => (current === value ? "" : value));
                      setCategory("");
                    }}
                    className={`truncate rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition ${
                      segment === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {segment ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="category"
                      checked={category === ""}
                      onChange={() => setCategory("")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>All categories</span>
                  </label>
                  {topCategories.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="category"
                        checked={category === item.name}
                        onChange={() => setCategory(item.name)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">{item.name}</span>
                      {jobCountByCategory[item.name] ? (
                        <span className="text-xs text-muted-foreground">
                          {jobCountByCategory[item.name]}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select Residential, Commercial, or Industrial to see categories.
                </p>
              )}
              {subCategories.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sub-category of {activeTopCategory?.name}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="subcategory"
                      checked={category === activeTopCategory?.name}
                      onChange={() => setCategory(activeTopCategory?.name ?? "")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>General {activeTopCategory?.name}</span>
                  </label>
                  {subCategories.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="subcategory"
                        checked={category === item.name}
                        onChange={() => setCategory(item.name)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">{item.name}</span>
                      {jobCountByCategory[item.name] ? (
                        <span className="text-xs text-muted-foreground">
                          {jobCountByCategory[item.name]}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Verified only
              </p>
              <label className="flex items-center justify-between text-sm">
                <span>Verified pros</span>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) => setVerifiedOnly(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                City
              </p>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="e.g. Toronto, Vancouver"
              />
            </div>

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Minimum rating
              </p>
              <select
                value={minRating}
                onChange={(event) =>
                  setMinRating(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Any rating</option>
                <option value={4}>4.0+ stars</option>
                <option value={4.5}>4.5+ stars</option>
                <option value={4.8}>4.8+ stars</option>
              </select>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try 'plumber', 'react developer', 'wedding photographer'"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-10 appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm"
                >
                  <option>Best match</option>
                  <option>Highest rated</option>
                  <option>Newest</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowMap((current) => !current)}
                className="gap-2"
              >
                <Map className="h-4 w-4" />
                {showMap ? "Hide map" : "Show map"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Jobs near you</span>
              </div>
              <span className="text-sm text-muted-foreground">{visibleJobs.length} results</span>
            </div>

            {!loading && !hasServiceLocation && (
              <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                Set your location and service radius in{" "}
                <Link href="/professional/setup" className="font-semibold underline">
                  your profile
                </Link>{" "}
                to see distances and jobs sorted by how close they are to you.
              </p>
            )}

            {showMap && (
              <div
                ref={mapSectionRef}
                className="relative mb-4 h-[320px] overflow-hidden rounded-2xl border border-border"
              >
                {mapJobs.length > 0 ? (
                  <>
                    <ProfessionalJobsMap
                      center={mapCenter}
                      jobs={mapJobs}
                      onSelectJob={setSelectedJobId}
                    />
                    {selectedJob ? (
                      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border-2 border-white bg-[#ff4d7d] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg">
                        {selectedJob.title}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_10%),linear-gradient(180deg,#bfe8ef_0%,#b1d7df_100%)] text-sm text-muted-foreground">
                    None of your matching jobs have a pinned location yet.
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                <div className="h-28 animate-pulse rounded-2xl bg-muted" />
                <div className="h-28 animate-pulse rounded-2xl bg-muted" />
              </div>
            ) : visibleJobs.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleJobs.map((job) => {
                  const saved = savedIds.has(job.id);
                  return (
                    <article
                      key={job.id}
                      onClick={() => router.push(`/job/${job.id}`)}
                      className={`cursor-pointer rounded-2xl border bg-background p-4 transition hover:border-primary/40 ${
                        selectedJobId === job.id ? "border-primary shadow-soft" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                            {job.category ?? "General"}
                          </p>
                          <h3 className="mt-2 text-[17px] font-semibold leading-tight text-foreground">
                            {job.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{job.locationAddress ?? "Remote"}</span>
                            {job.distanceKm !== null && (
                              <span className="inline-flex items-center gap-1 font-medium text-primary">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.distanceKm < 1
                                  ? "Less than 1 km away"
                                  : `${job.distanceKm.toFixed(1)} km away`}
                              </span>
                            )}
                            {job.clientName ? <span>{job.clientName}</span> : null}
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                              {job.clientRating.toFixed(1)}
                            </span>
                            {job.clientVerified && (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {job.status}
                          </span>
                          <button
                            type="button"
                            aria-label={saved ? "Remove from saved jobs" : "Save this job"}
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleSave(job, saved);
                            }}
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                              saved
                                ? "bg-cta/10 text-cta"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {job.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {job.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatBudgetRange(job.budgetMin, job.budgetMax, job.timingType)}
                        </span>
                        <span>•</span>
                        <span>{formatBudgetAmount(job.hourlyRate, job.timingType)}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm">
                            <Link
                              href={`/job/${job.id}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              View details
                            </Link>
                          </Button>
                          {job.locationLat !== null && job.locationLng !== null && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={(event) => {
                                event.stopPropagation();
                                showJobLocation(job.id);
                              }}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              Show location
                            </Button>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {job.proposalCount} pros saved
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
                {view === "saved" && !savedJobs.length
                  ? "You haven't saved any jobs yet. Tap the heart on a job to save it here."
                  : "No jobs match your current filters."}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProfessionalMyJobs() {
  return (
    <Suspense fallback={null}>
      <ProfessionalJobsContent />
    </Suspense>
  );
}
