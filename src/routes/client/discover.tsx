"use client";

import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
const ProfessionalDiscoveryMap = dynamic(
  () => import("@/components/ProfessionalDiscoveryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full overflow-hidden rounded-2xl border bg-muted" />
    ),
  },
);
import { ProCard } from "@/components/ProCard";
import type { MarketplaceCategory, MarketplaceProfessional } from "@/lib/types/marketplace";
import type { ProfessionalDiscoveryResponse } from "@/lib/types/professional-discovery";
import { Map, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const PAGE_SIZE = 20;

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
  };
}

export default function Discover() {
  const [results, setResults] = useState<ProfessionalDiscoveryResponse | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState<number | "">("");
  const [availability, setAvailability] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [page, setPage] = useState(1);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const professionals = useMemo(
    () => (results ? results.professionals.map(toMarketplaceProfessional) : []),
    [results],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/marketplace/categories", { signal: controller.signal });
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
  }, [query, category, city, minRating, availability, distanceKm, originLat, originLng, verifiedOnly, page]);

  const totalProfessionals = results?.total ?? 0;

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find professionals</h1>
          <p className="text-sm text-muted-foreground">
            {totalProfessionals > 0
              ? `${totalProfessionals} vetted pros available across all categories.`
              : "Browse vetted professionals across all categories."}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Map className="h-4 w-4" /> View on map
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft h-fit lg:sticky lg:top-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Filters</h2>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setQuery("");
                setCategory("");
                setCity("");
                setMinRating("");
                setAvailability("");
                setDistanceKm("");
                setOriginLat(null);
                setOriginLng(null);
                setVerifiedOnly(true);
                setPage(1);
              }}
            >
              Clear all
            </button>
          </div>

          <FilterSection title="Category">
            <div className="space-y-2">
              {categories.slice(0, 6).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.name}
                    onChange={() => {
                      setCategory(c.name);
                      setPage(1);
                    }}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.professionalCount}
                  </span>
                </label>
              ))}
            </div>
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
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setOriginLat(position.coords.latitude);
                            setOriginLng(position.coords.longitude);
                            userLocationRef.current = {
                              lat: position.coords.latitude,
                              lng: position.coords.longitude,
                            };
                          },
                          () => {
                            alert("Unable to retrieve your location. Please enable location access or enter a city.");
                          }
                        );
                      }
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
              {(distanceKm !== "" && originLat !== null && originLng !== null) && (
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
            <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option>Sort: Best match</option>
              <option>Top rated</option>
              <option>Lowest price</option>
              <option>Closest</option>
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
            <>
              {showMap && (results?.professionals?.length ?? 0) > 0 && (
                <div ref={mapSectionRef} className="mb-6">
                  <ProfessionalDiscoveryMap
                    professionals={results?.professionals ?? []}
                    selectedPoint={selectedPoint ?? undefined}
                  />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {professionals.map((p) => (
                  <ProCard
                    key={p.id}
                    pro={p}
                    onShowLocation={() => {
                      const proResult = results?.professionals.find((item) => item.id === p.id);
                      if (!proResult?.displayPoint) return;
                      setSelectedPoint(proResult.displayPoint);
                      setShowMap(true);
                      window.requestAnimationFrame(() => {
                        mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                  />
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Showing {professionals.length} of {results?.total ?? professionals.length} professionals.
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
