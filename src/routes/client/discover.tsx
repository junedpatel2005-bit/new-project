"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
const ProfessionalDiscoveryMap = dynamic(() => import("@/components/ProfessionalDiscoveryMap"), {
  ssr: false,
});
const ProfessionalsPreviewMap = dynamic(() => import("@/components/ProfessionalsPreviewMap"), {
  ssr: false,
});
import { ProCard } from "@/components/ProCard";
import Skeleton from "react-loading-skeleton";
import type { MarketplaceCategory, MarketplaceProfessional } from "@/lib/types/marketplace";
import type { ProfessionalDiscoveryResponse } from "@/lib/types/professional-discovery";
import { Map, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const PAGE_SIZE = 20;
const segmentOptions: [string, string][] = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
];

function toMarketplaceProfessional(
  professional: ProfessionalDiscoveryResponse["professionals"][number],
): MarketplaceProfessional {
  return {
    id: professional.id,
    name: professional.name,
    title: professional.title,
    avatar: professional.avatarUrl,
    rating: professional.rating,
    reviews: professional.reviewCount,
    hourlyRate: professional.hourlyRate,
    location: professional.location,
    availability: professional.availabilityStatus,
    verified: professional.verified,
    skills: professional.skills,
    bio: professional.bio,
    approximateDistanceKm: professional.approximateDistanceKm,
  };
}

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [results, setResults] = useState<ProfessionalDiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [availability, setAvailability] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [sort, setSort] = useState<
    "recommended" | "rating" | "distance" | "most-reviewed" | "price"
  >("recommended");
  const [page, setPage] = useState(1);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const professionals = useMemo(
    () => (results ? results.professionals.map(toMarketplaceProfessional) : []),
    [results],
  );

  function requestMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginLat(position.coords.latitude);
        setOriginLng(position.coords.longitude);
        setDistanceKm((current) => (current === "" ? 25 : current));
        setPage(1);
        userLocationRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      () => {
        alert("Unable to retrieve your location. Please enable location access or enter a city.");
      },
    );
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/v1/marketplace/categories", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load categories");
        setCategories((await response.json()) as MarketplaceCategory[]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("discover.categories.load", error);
        }
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (segment) params.set("segment", segment);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (minRating !== "") params.set("minRating", String(minRating));
    if (availability) params.set("availability", availability);
    if (distanceKm !== "" && originLat !== null && originLng !== null) {
      params.set("distanceKm", String(distanceKm));
      params.set("originLat", String(originLat));
      params.set("originLng", String(originLng));
    }
    if (verifiedOnly) params.set("verified", "true");
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    async function loadProfessionals() {
      try {
        const response = await fetch(`/api/v1/professionals?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load professionals");
        setResults((await response.json()) as ProfessionalDiscoveryResponse);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("discover.professionals.load", error);
          setStatus("error");
        }
      }
    }

    void loadProfessionals();
    return () => controller.abort();
  }, [
    query,
    segment,
    category,
    city,
    minRating,
    availability,
    distanceKm,
    originLat,
    originLng,
    verifiedOnly,
    sort,
    page,
  ]);

  const totalProfessionals = results?.total ?? 0;
  const topCategories = useMemo(
    () =>
      segment
        ? categories.filter((item) => item.parentId === null && item.segment === segment)
        : [],
    [categories, segment],
  );
  const selectedCategory = useMemo(
    () => categories.find((item) => item.name === category) ?? null,
    [categories, category],
  );
  const activeTopCategory = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory.parentId === null) return selectedCategory;
    return categories.find((item) => item.id === selectedCategory.parentId) ?? null;
  }, [categories, selectedCategory]);
  const subCategories = useMemo(
    () =>
      activeTopCategory ? categories.filter((item) => item.parentId === activeTopCategory.id) : [],
    [categories, activeTopCategory],
  );

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find professionals</h1>
          <p className="text-sm text-muted-foreground">
            {totalProfessionals > 0
              ? `${totalProfessionals} vetted pros available across all categories.`
              : "Browse vetted professionals across all categories."}
          </p>
        </div>
      </div>

      {jobId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="font-semibold">Choose a professional for your job</p>
            <p className="text-sm text-muted-foreground">
              When you select Hire, your job details will be included in the request.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/job/${jobId}`)}>
            Back to job
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft h-fit lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
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
                setAvailability("");
                setDistanceKm("");
                setOriginLat(null);
                setOriginLng(null);
                setVerifiedOnly(false);
                setPage(1);
              }}
            >
              Clear all
            </button>
          </div>

          <FilterSection title="Category">
            <div className="mb-3 flex flex-wrap gap-2">
              {segmentOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSegment((current) => (current === value ? "" : value));
                    setCategory("");
                    setPage(1);
                  }}
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
            {segment ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="category"
                    checked={category === ""}
                    onChange={() => {
                      setCategory("");
                      setPage(1);
                    }}
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
                      onChange={() => {
                        setCategory(item.name);
                        setPage(1);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.professionalCount}</span>
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
                    onChange={() => {
                      setCategory(activeTopCategory?.name ?? "");
                      setPage(1);
                    }}
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
                      onChange={() => {
                        setCategory(item.name);
                        setPage(1);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.professionalCount}</span>
                  </label>
                ))}
              </div>
            )}
          </FilterSection>

          <FilterSection title="Verified only">
            <label className="flex items-center justify-between text-sm">
              <span>Verified pros</span>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => {
                  setVerifiedOnly(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-border accent-primary"
              />
            </label>
          </FilterSection>

          <FilterSection title="City">
            <Input
              className="text-sm"
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setPage(1);
              }}
              placeholder="e.g., Toronto, Vancouver"
            />
          </FilterSection>

          <FilterSection title="Distance">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={distanceKm !== "" && originLat !== null && originLng !== null}
                  onChange={(event) => {
                    if (event.target.checked) {
                      requestMyLocation();
                    } else {
                      setDistanceKm("");
                      setOriginLat(null);
                      setOriginLng(null);
                      userLocationRef.current = null;
                    }
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>Use my location</span>
              </label>
              {distanceKm !== "" && originLat !== null && originLng !== null && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="w-20">Within</span>
                    <select
                      className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                      value={distanceKm}
                      onChange={(event) => {
                        setDistanceKm(Number(event.target.value));
                        setPage(1);
                      }}
                    >
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={25}>25 km</option>
                      <option value={50}>50 km</option>
                      <option value={100}>100 km</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setDistanceKm("");
                      setOriginLat(null);
                      setOriginLng(null);
                      userLocationRef.current = null;
                      setPage(1);
                    }}
                  >
                    Clear location
                  </button>
                </div>
              )}
            </div>
          </FilterSection>

          <FilterSection title="Minimum Rating">
            <div className="space-y-2">
              {[
                { value: 4.5, label: "4.5+ stars" },
                { value: 4, label: "4+ stars" },
                { value: 3.5, label: "3.5+ stars" },
                { value: 3, label: "3+ stars" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === option.value}
                    onChange={() => {
                      setMinRating(minRating === option.value ? "" : option.value);
                      setPage(1);
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === ""}
                  onChange={() => {
                    setMinRating("");
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>Any rating</span>
              </label>
            </div>
          </FilterSection>

          <FilterSection title="Availability">
            <div className="space-y-2">
              {[
                { value: "AVAILABLE", label: "Available now" },
                { value: "BUSY", label: "Busy" },
                { value: "UNAVAILABLE", label: "Unavailable" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="availability"
                    checked={availability === option.value}
                    onChange={() => {
                      setAvailability(availability === option.value ? "" : option.value);
                      setPage(1);
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="availability"
                  checked={availability === ""}
                  onChange={() => {
                    setAvailability("");
                    setPage(1);
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>Any availability</span>
              </label>
            </div>
          </FilterSection>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Try 'plumber', 'react developer', 'wedding photographer'"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => {
                const value = event.target.value as typeof sort;
                setSort(value);
                setPage(1);
                if (value === "distance" && (originLat === null || originLng === null)) {
                  requestMyLocation();
                }
              }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="recommended">Sort: Best match</option>
              <option value="rating">Top rated</option>
              <option value="price">Lowest price</option>
              <option value="distance">Closest</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setShowMap((current) => {
                  const next = !current;
                  if (!current && mapSectionRef.current) {
                    window.requestAnimationFrame(() => {
                      mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }
                  return next;
                });
              }}
            >
              <Map className="h-4 w-4" /> {showMap ? "Hide map" : "View on map"}
            </Button>
          </div>

          {!showMap && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setShowMap(true);
                if (mapSectionRef.current) {
                  window.requestAnimationFrame(() => {
                    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                event.currentTarget.click();
              }}
              className="mb-4 hidden h-40 w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 shadow-soft transition-all hover:border-primary/50 hover:shadow-elevated md:block"
            >
              <div className="flex h-full items-center justify-between gap-6">
                <div className="text-left">
                  <p className="text-sm font-semibold">Professionals near you</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(results?.professionals ?? []).filter((p) => p.displayPoint).length} available
                    • Click to view on map
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Approximate location — shown for privacy
                  </p>
                </div>
                <div className="h-full w-1/2">
                  <ProfessionalsPreviewMap professionals={results?.professionals ?? []} />
                </div>
              </div>
            </div>
          )}

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
            <>
              {showMap && (results?.professionals?.length ?? 0) > 0 && (
                <div ref={mapSectionRef} className="mb-6">
                  <Suspense
                    fallback={
                      <div className="h-[520px] w-full overflow-hidden rounded-2xl border bg-muted animate-pulse" />
                    }
                  >
                    <ProfessionalDiscoveryMap
                      professionals={results?.professionals ?? []}
                      selectedPoint={selectedPoint ?? undefined}
                    />
                  </Suspense>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Approximate location — shown for privacy
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {professionals.map((p) => (
                  <ProCard
                    key={p.id}
                    pro={p}
                    onCardClick={() => router.push(`/pro/${p.id}`)}
                    profileHref={
                      jobId ? `/pro/${p.id}?jobId=${encodeURIComponent(jobId)}` : undefined
                    }
                    onShowLocation={() => {
                      const proResult = results?.professionals.find((item) => item.id === p.id);
                      if (!proResult?.displayPoint) return;
                      setSelectedPoint(proResult.displayPoint);
                      setShowMap(true);
                      window.requestAnimationFrame(() => {
                        mapSectionRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      });
                    }}
                  />
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Showing {professionals.length} of {results?.total ?? professionals.length}{" "}
                  professionals.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!results?.hasMore}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Discover() {
  return (
    <Suspense fallback={<ResultSkeleton />}>
      <DiscoverContent />
    </Suspense>
  );
}

function ResultSkeleton() {
  return (
    <div aria-hidden className="rounded-2xl border border-border bg-card p-5">
      <Skeleton height={18} width="38%" />
      <Skeleton className="mt-4" height={24} width="72%" />
      <Skeleton className="mt-6" height={14} count={2} />
      <Skeleton className="mt-5" height={38} borderRadius={8} />
    </div>
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
