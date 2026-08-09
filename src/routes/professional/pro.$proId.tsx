"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import type { MarketplaceProfessional } from "@/lib/types/marketplace";

export default function ProProfile() {
  const { proId } = useParams<{ proId: string }>();
  const [professional, setProfessional] = useState<MarketplaceProfessional | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  useEffect(() => {
    void fetch(`/api/marketplace/professional?id=${encodeURIComponent(proId)}`)
      .then(async (response) => {
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) throw new Error("Unable to load professional");
        setProfessional((await response.json()) as MarketplaceProfessional);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [proId]);
  if (status === "loading")
    return (
      <AppShell>
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  if (status === "missing")
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
          This professional is unavailable.
        </p>
      </AppShell>
    );
  if (status === "error" || !professional)
    return (
      <AppShell>
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          The profile could not be loaded. Please try again.
        </p>
      </AppShell>
    );
  return (
    <AppShell>
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="h-28 gradient-primary" />
        <div className="px-6 pb-8 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {professional.avatar ? (
                <img
                  src={professional.avatar}
                  alt={professional.name}
                  className="h-24 w-24 rounded-2xl border-4 border-card object-cover"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-muted text-3xl font-semibold">
                  {professional.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                  {professional.name}
                  {professional.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                </h1>
                <p className="text-muted-foreground">{professional.title}</p>
              </div>
            </div>
            <Button disabled>Sign in to hire</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              {professional.rating.toFixed(1)} ({professional.reviews} reviews)
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {professional.location ?? "Remote"}
            </span>
            <span>Availability: {professional.availability.replace("_", " ")}</span>
          </div>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-3 text-muted-foreground">
              {professional.bio ?? "This professional has not added an introduction yet."}
            </p>
          </section>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {professional.skills.length ? (
                professional.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-border px-3 py-1 text-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills published yet.</p>
              )}
            </div>
          </section>
          <section className="mt-8 rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Hourly rate</p>
            <p className="mt-1 text-2xl font-semibold">
              {professional.hourlyRate === null
                ? "Contact for pricing"
                : `$${professional.hourlyRate}/hr`}
            </p>
          </section>
        </div>
      </article>
    </AppShell>
  );
}
