"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Clock, MapPin, Calendar, DollarSign, FileText, Paperclip, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import type { MarketplaceJob } from "@/lib/types/marketplace";

type OwnerJob = {
  id: number;
  title: string | null;
  description: string | null;
  category: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  workMode: "ON_SITE" | "REMOTE" | "BOTH";
  locationLabel: string | null;
  locationAddress: string | null;
  jobDate: string | null;
  deadline: string | null;
  timingType: "FIXED" | "HOURLY";
  hourlyRate: number | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  createdAt: string;
  attachments: { id: number; fileName: string; fileType: string | null; fileSize: number | null; previewUrl: string | null }[];
};

type ViewJob = {
  title: string;
  description: string;
  category: string;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  workMode: "ON_SITE" | "REMOTE" | "BOTH";
  location: string | null;
  locationAddress: string | null;
  jobDate: string | null;
  deadline: string | null;
  timingType: "FIXED" | "HOURLY";
  hourlyRate: number | null;
  createdAt: string;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  proposalCount?: number;
  client?: { name: string; avatar: string | null; rating: number };
  attachments: { id: number; fileName: string; fileType: string | null; fileSize: number | null; previewUrl: string | null }[];
};

function fromMarketplace(job: MarketplaceJob): ViewJob {
  return {
    ...job,
    proposalCount: job.proposalCount,
    client: job.client,
    attachments: job.attachments,
  };
}

function fromOwner(job: OwnerJob): ViewJob {
  return {
    title: job.title ?? "Untitled job",
    description: job.description ?? "",
    category: job.category ?? "Uncategorized",
    budgetMin: job.budgetMin,
    budgetMax: job.budgetMax,
    urgency: job.urgency,
    workMode: job.workMode,
    location: job.locationLabel,
    locationAddress: job.locationAddress,
    jobDate: job.jobDate,
    deadline: job.deadline,
    timingType: job.timingType,
    hourlyRate: job.hourlyRate,
    createdAt: job.createdAt,
    status: job.status,
    attachments: job.attachments,
  };
}

function formatBudget(job: ViewJob) {
  if (job.timingType === "HOURLY" && job.hourlyRate !== null) {
    return `$${job.hourlyRate.toLocaleString()}/hr`;
  }
  return job.budgetMin === null && job.budgetMax === null
    ? "Budget on request"
    : `$${job.budgetMin?.toLocaleString() ?? "—"} – $${job.budgetMax?.toLocaleString() ?? "—"}`;
}

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<ViewJob | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  useEffect(() => {
    void fetch(`/api/marketplace/job?id=${encodeURIComponent(jobId)}`)
      .then(async (response) => {
        if (response.status === 404) {
          const ownerResponse = await fetch(`/api/client/jobs/${encodeURIComponent(jobId)}`);
          if (!ownerResponse.ok) return setStatus("missing");
          const { job: ownerJob } = (await ownerResponse.json()) as { job: OwnerJob };
          setJob(fromOwner(ownerJob));
          return setStatus("ready");
        }
        if (!response.ok) throw new Error("Unable to load job");
        setJob(fromMarketplace((await response.json()) as MarketplaceJob));
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

  const isOwner = !job.client;
  const jobDateFormatted = formatDate(job.jobDate);
  const deadlineFormatted = formatDate(job.deadline);
  const isDeadlinePassed = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <AppShell>
      <article className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{job.category}</span>
          <span className="rounded-full bg-muted px-3 py-1">
            {job.urgency.toLowerCase()} urgency
          </span>
          {job.status && (
            <span className={`rounded-full px-3 py-1 ${
              job.status === "OPEN" ? "bg-green/10 text-green" :
              job.status === "CLOSED" ? "bg-red/10 text-red" :
              "bg-muted"
            }`}>
              {job.status.toLowerCase()}
            </span>
          )}
          <span className="rounded-full bg-blue/10 px-3 py-1 text-blue">
            {job.timingType === "HOURLY" ? "Hourly" : "Fixed Price"}
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
          {job.proposalCount !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {job.proposalCount} saved applications
            </span>
          )}
        </div>

        {/* Key Details Grid */}
        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Budget
            </dt>
            <dd className="mt-1 font-semibold">{formatBudget(job)}</dd>
          </div>
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Work mode
            </dt>
            <dd className="mt-1 font-semibold">{job.workMode.replace("_", " ")}</dd>
          </div>
          {jobDateFormatted && (
            <div className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Preferred date
              </dt>
              <dd className="mt-1 font-semibold">{jobDateFormatted}</dd>
            </div>
          )}
          {deadlineFormatted && (
            <div className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Deadline
              </dt>
              <dd className={`mt-1 font-semibold ${isDeadlinePassed ? "text-destructive" : ""}`}>
                {deadlineFormatted}
                {isDeadlinePassed && <span className="ml-1 text-xs text-destructive">(Passed)</span>}
              </dd>
            </div>
          )}
          {job.client && (
            <div className="rounded-xl border border-border p-4 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                Client rating
              </dt>
              <dd className="mt-1 font-semibold">{job.client.rating.toFixed(1)} / 5</dd>
            </div>
          )}
          {job.locationAddress && (
            <div className="rounded-xl border border-border p-4 sm:col-span-2 lg:col-span-2">
              <dt className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Full address
              </dt>
              <dd className="mt-1 font-medium text-sm">{job.locationAddress}</dd>
            </div>
          )}
        </dl>

        {/* Attachments */}
        {job.attachments && job.attachments.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attachments
            </h2>
            <div className="mt-3 space-y-2">
              {job.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.fileType ? `${attachment.fileType.toUpperCase()} • ` : ""}
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">
            {job.description}
          </p>
        </section>

        {/* Actions */}
        <div className="mt-8 border-t border-border pt-6">
          {job.client ? (
            <>
              <p className="font-medium">Posted by {job.client.name}</p>
              {job.status === "OPEN" && !isOwner && (
                <Button className="mt-4 w-full sm:w-auto" size="lg">
                  Submit Proposal
                </Button>
              )}
              {job.status !== "OPEN" && !isOwner && (
                <p className="mt-4 text-muted-foreground">
                  This job is no longer accepting proposals.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <p className="font-medium text-muted-foreground self-center">This is your job posting.</p>
              {job.status === "OPEN" && (
                <>
                  <Button variant="outline">Edit Job</Button>
                  <Button variant="destructive">Close Job</Button>
                </>
              )}
              {job.status === "CLOSED" && (
                <Button variant="outline">Reopen Job</Button>
              )}
              {job.status === "DRAFT" && (
                <Button>Publish Job</Button>
              )}
            </div>
          )}
        </div>
      </article>
    </AppShell>
  );
}
