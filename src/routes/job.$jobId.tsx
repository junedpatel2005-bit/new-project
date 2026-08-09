"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import type { MarketplaceJob } from "@/lib/types/marketplace";

function formatBudget(job: MarketplaceJob) {
  return job.budgetMin === null && job.budgetMax === null
    ? "Budget on request"
    : `$${job.budgetMin?.toLocaleString() ?? "—"} – $${job.budgetMax?.toLocaleString() ?? "—"}`;
}

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<MarketplaceJob | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  useEffect(() => {
    void fetch(`/api/marketplace/job?id=${encodeURIComponent(jobId)}`)
      .then(async (response) => {
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) throw new Error("Unable to load job");
        setJob((await response.json()) as MarketplaceJob);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [jobId]);
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
          This job is no longer available.
        </p>
      </AppShell>
    );
  if (status === "error" || !job)
    return (
      <AppShell>
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          The job could not be loaded. Please try again.
        </p>
      </AppShell>
    );
  return (
    <AppShell>
      <article className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{job.category}</span>
          <span className="rounded-full bg-muted px-3 py-1">
            {job.urgency.toLowerCase()} urgency
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{job.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {job.location ?? "Remote"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            {job.proposalCount} saved applications
          </span>
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Budget</dt>
            <dd className="mt-1 font-semibold">{formatBudget(job)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Work mode</dt>
            <dd className="mt-1 font-semibold">{job.workMode.replace("_", " ")}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground">Client rating</dt>
            <dd className="mt-1 font-semibold">{job.client.rating.toFixed(1)} / 5</dd>
          </div>
        </dl>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">
            {job.description}
          </p>
        </section>
        <div className="mt-8 border-t border-border pt-6">
          <p className="font-medium">Posted by {job.client.name}</p>
          <Button className="mt-4" disabled>
            Sign in as a professional to submit a proposal
          </Button>
        </div>
      </article>
    </AppShell>
  );
}
