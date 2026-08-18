"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DollarSign, MapPin, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MarketplaceCategory, MarketplaceJob } from "@/lib/types/marketplace";
import { sanitizeInlineHtml } from "@/lib/sanitizeInlineHtml";

function budget(job: MarketplaceJob) {
  if (job.timingType === "HOURLY")
    return job.hourlyRate == null ? "Rate not set" : `₹${job.hourlyRate.toLocaleString()}/hr`;
  if (job.budgetMin == null && job.budgetMax == null) return "Budget on request";
  return `₹${job.budgetMin?.toLocaleString() ?? "—"} – ₹${job.budgetMax?.toLocaleString() ?? "—"}`;
}

const DEFAULT_NEAR_ME_RADIUS_KM = 25;
const MIN_NEAR_ME_RADIUS_KM = 1;
const MAX_NEAR_ME_RADIUS_KM = 100;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

const workModeOptions: [string, string][] = [
  ["REMOTE", "Remote"],
  ["ON_SITE", "On site"],
  ["BOTH", "Flexible"],
];

const segmentTabs: [string, string][] = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
];

export default function Services() {
  const [jobs, setJobs] = useState<MarketplaceJob[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [urgency, setUrgency] = useState("");
  const [nearMe, setNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_NEAR_ME_RADIUS_KM);
  const [role, setRole] = useState<string | null>(null);
  const [pageText, setPageText] = useState<Record<string, string>>({});
  const [cmsEdit, setCmsEdit] = useState(false);

  const text = (key: string, fallback: string) => pageText[key] || fallback;
  const editableText = (key: string, fallback: string) =>
    cmsEdit ? (
      <span
        contentEditable
        suppressContentEditableWarning
        onClick={(event) => event.preventDefault()}
        onBlur={(event) => {
          const value = sanitizeInlineHtml(event.currentTarget.innerHTML);
          if (!event.currentTarget.textContent?.trim()) return;
          setPageText((current) => ({ ...current, [key]: value }));
          window.parent.postMessage(
            { type: "servio-cms-text", key, value },
            window.location.origin,
          );
        }}
        className="rounded outline-none ring-2 ring-indigo-400/50 focus:ring-indigo-500"
        title="Click and type to edit"
        dangerouslySetInnerHTML={{ __html: text(key, fallback) }}
      />
    ) : (
      <span dangerouslySetInnerHTML={{ __html: text(key, fallback) }} />
    );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("cmsPreview") === "1";
    setCmsEdit(params.get("cmsEdit") === "1");
    if (preview) {
      try {
        setPageText(
          JSON.parse(
            window.sessionStorage.getItem("servio-home-preview:/services") ?? "{}",
          ) as Record<string, string>,
        );
      } catch {
        setPageText({});
      }
      return;
    }
    void fetch("/api/v1/website/page-text?path=/services")
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { text?: Record<string, string> } | null) => setPageText(result?.text ?? {}));
  }, []);

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

  const visibleCategories = useMemo(
    () => categories.filter((item) => !segment || item.segment === segment),
    [categories, segment],
  );
  const segmentCategoryNames = useMemo(
    () => new Set(visibleCategories.map((item) => item.name)),
    [visibleCategories],
  );

  const jobsWithDistance = useMemo(() => {
    if (!userLocation) return jobs.map((job) => ({ job, distanceKm: null as number | null }));
    const [lat, lng] = userLocation;
    return jobs.map((job) => ({
      job,
      distanceKm:
        job.locationLat != null && job.locationLng != null
          ? distanceKm(lat, lng, job.locationLat, job.locationLng)
          : null,
    }));
  }, [jobs, userLocation]);

  const visibleJobs = useMemo(() => {
    const text = query.trim().toLowerCase();
    return jobsWithDistance
      .filter(({ job }) => {
        const matchesText =
          !text ||
          [job.title, job.description, job.category, job.client.name, job.location]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(text));
        return (
          matchesText &&
          (!segment || !job.category || segmentCategoryNames.has(job.category)) &&
          (!category || job.category === category) &&
          (!workMode || job.workMode === workMode) &&
          (!urgency || job.urgency === urgency)
        );
      })
      .filter(({ distanceKm: value }) => !nearMe || (value !== null && value <= radiusKm))
      .sort((a, b) => {
        if (!nearMe) return 0;
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      });
  }, [
    jobsWithDistance,
    query,
    segment,
    segmentCategoryNames,
    category,
    workMode,
    urgency,
    nearMe,
    radiusKm,
  ]);

  const selectSegment = (value: string) => {
    setSegment((current) => (current === value ? "" : value));
    setCategory("");
  };

  function toggleNearMe(checked: boolean) {
    setNearMe(checked);
    setLocationError(null);
    if (!checked || userLocation) return;
    if (!navigator.geolocation) {
      setLocationError("Location isn't available in this browser.");
      setNearMe(false);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocationError("Location permission was not granted.");
        setLocating(false);
        setNearMe(false);
      },
    );
  }

  const clearFilters = () => {
    setQuery("");
    setSegment("");
    setCategory("");
    setWorkMode("");
    setUrgency("");
    setNearMe(false);
    setLocationError(null);
    setRadiusKm(DEFAULT_NEAR_ME_RADIUS_KM);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {editableText("eyebrow", "Marketplace jobs")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          {editableText("heading", "Browse client jobs")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {editableText(
            "description",
            "Explore open work posted by clients and find the right service category for you.",
          )}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
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
              <div role="tablist" aria-label="Service category" className="flex flex-wrap gap-2">
                {segmentTabs.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={segment === value}
                    onClick={() => selectSegment(value)}
                    className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                      segment === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                  Location
                </legend>
                <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Jobs near me
                  </span>
                  <input
                    type="checkbox"
                    checked={nearMe}
                    onChange={(event) => toggleNearMe(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
                {locating && <p className="mt-1.5 text-xs text-muted-foreground">Locating…</p>}
                {locationError && (
                  <p className="mt-1.5 text-xs text-destructive">{locationError}</p>
                )}
                {nearMe && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Radius</span>
                      <span className="font-semibold text-foreground">{radiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_NEAR_ME_RADIUS_KM}
                      max={MAX_NEAR_ME_RADIUS_KM}
                      value={radiusKm}
                      onChange={(event) => setRadiusKm(Number(event.target.value))}
                      className="mt-1.5 h-1.5 w-full cursor-pointer accent-primary"
                    />
                  </div>
                )}
              </fieldset>
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
                  {visibleCategories.map((item) => (
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
              <div data-db-section="jobs" className="grid gap-4 md:grid-cols-2">
                {visibleJobs.map(({ job, distanceKm: jobDistanceKm }) => (
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
                        {jobDistanceKm !== null && (
                          <span className="font-medium text-primary">
                            ·{" "}
                            {jobDistanceKm < 1
                              ? "Less than 1 km away"
                              : `${jobDistanceKm.toFixed(1)} km away`}
                          </span>
                        )}
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
    </div>
  );
}
