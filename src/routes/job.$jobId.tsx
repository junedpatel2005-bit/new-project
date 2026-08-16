"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Paperclip,
  AlertTriangle,
  Search,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MarketplaceJob } from "@/lib/types/marketplace";
import type {
  ProfessionalDiscoveryResponse,
  ProfessionalDiscoveryResult,
} from "@/lib/types/professional-discovery";

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
  locationLat: number | null;
  locationLng: number | null;
  jobDate: string | null;
  deadline: string | null;
  timingType: "FIXED" | "HOURLY";
  hourlyRate: number | null;
  projectId: number | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  createdAt: string;
  attachments: {
    id: number;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    previewUrl: string | null;
  }[];
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
  locationLat: number | null;
  locationLng: number | null;
  jobDate: string | null;
  deadline: string | null;
  timingType: "FIXED" | "HOURLY";
  hourlyRate: number | null;
  projectId?: number | null;
  createdAt: string;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  proposalCount?: number;
  client?: { name: string; avatar: string | null; rating: number };
  attachments: {
    id: number;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    previewUrl: string | null;
  }[];
};
type JobProposal = {
  id: number;
  professionalId: number;
  bidAmount: number;
  duration: string;
  coverLetter: string;
  status: string;
  createdAt: string;
  professional: {
    id: number;
    firstName: string;
    lastName: string;
    professionalCategory: string | null;
    professionalCity: string | null;
    averageRating: number;
    reviewCount: number;
    isVerified: boolean;
  } | null;
};

function fromMarketplace(job: MarketplaceJob): ViewJob {
  return {
    ...job,
    locationLat: job.locationLat,
    locationLng: job.locationLng,
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
    locationLat: job.locationLat,
    locationLng: job.locationLng,
    jobDate: job.jobDate,
    deadline: job.deadline,
    timingType: job.timingType,
    hourlyRate: job.hourlyRate,
    projectId: job.projectId,
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
  const [finderOpen, setFinderOpen] = useState(false);
  const [professionals, setProfessionals] = useState<ProfessionalDiscoveryResult[]>([]);
  const [finderQuery, setFinderQuery] = useState("");
  const [finderStatus, setFinderStatus] = useState<"idle" | "loading" | "error">("idle");
  const [viewerRole, setViewerRole] = useState<"CLIENT" | "PROFESSIONAL" | null>(null);
  const [ownProposal, setOwnProposal] = useState<{ id: number; status: string } | null>(null);
  const [clientProposals, setClientProposals] = useState<JobProposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalPrice, setProposalPrice] = useState("");
  const [proposalDuration, setProposalDuration] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [pendingAcceptProposal, setPendingAcceptProposal] = useState<JobProposal | null>(null);
  useEffect(() => {
    async function loadJob() {
      try {
        const authResponse = await fetch("/api/v1/auth/me");
        const auth = (await authResponse.json().catch(() => null)) as {
          user?: { role?: "CLIENT" | "PROFESSIONAL" } | null;
        } | null;
        setViewerRole(auth?.user?.role ?? null);
        const ownerResponse = await fetch(`/api/v1/client/jobs/${encodeURIComponent(jobId)}`);
        if (ownerResponse.ok) {
          const { job: ownerJob, proposals } = (await ownerResponse.json()) as {
            job: OwnerJob;
            proposals: JobProposal[];
          };
          setJob(fromOwner(ownerJob));
          setClientProposals(proposals ?? []);
          setStatus("ready");
          return;
        }
        if (ownerResponse.status !== 404) throw new Error("Unable to load job");

        const response = await fetch(`/api/v1/marketplace/job?id=${encodeURIComponent(jobId)}`);
        if (!response.ok) {
          if (response.status === 404) return setStatus("missing");
          throw new Error("Unable to load job");
        }
        const marketplaceJob = fromMarketplace((await response.json()) as MarketplaceJob);
        marketplaceJob.status = marketplaceJob.status ?? "OPEN";
        if (auth?.user?.role === "PROFESSIONAL") {
          const proposalResponse = await fetch(
            `/api/v1/professional/proposals?jobId=${encodeURIComponent(jobId)}`,
          );
          if (proposalResponse.ok) {
            const proposalData = (await proposalResponse.json()) as {
              proposal: { id: number; status: string } | null;
            };
            setOwnProposal(proposalData.proposal);
          }
        }
        const projectResponse = await fetch(
          `/api/v1/portal/project?jobId=${encodeURIComponent(jobId)}`,
        );
        if (projectResponse.ok) {
          const projectData = (await projectResponse.json()) as { project: { id: number } };
          marketplaceJob.projectId = projectData.project.id;
        }
        setJob(marketplaceJob);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    void loadJob();
  }, [jobId]);

  async function searchProfessionals(query = finderQuery) {
    setFinderStatus("loading");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (query.trim()) params.set("query", query.trim());
      const response = await fetch(`/api/v1/professionals?${params.toString()}`);
      if (!response.ok) throw new Error();
      const data = (await response.json()) as ProfessionalDiscoveryResponse;
      setProfessionals(data.professionals);
      setFinderStatus("idle");
    } catch {
      setFinderStatus("error");
    }
  }

  function openFinder() {
    setFinderOpen(true);
    if (!professionals.length) void searchProfessionals("");
  }
  async function sendProposal() {
    const bidAmount = Number(proposalPrice);
    if (
      !Number.isSafeInteger(bidAmount) ||
      bidAmount < 1 ||
      !proposalDuration.trim() ||
      !proposalMessage.trim()
    ) {
      setProposalError("Enter a valid price, delivery estimate, and message.");
      return;
    }
    setProposalBusy(true);
    setProposalError(null);
    try {
      const response = await fetch("/api/v1/professional/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: Number(jobId),
          bidAmount,
          duration: proposalDuration,
          coverLetter: proposalMessage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to send your proposal.");
      setOwnProposal({ id: payload.proposal.id, status: payload.proposal.status });
      setShowProposalForm(false);
    } catch (error) {
      setProposalError(error instanceof Error ? error.message : "Unable to send your proposal.");
    } finally {
      setProposalBusy(false);
    }
  }
  async function reviewProposal(proposal: JobProposal, action: "accept" | "reject") {
    const response = await fetch(`/api/v1/client/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return alert(payload?.error || "Unable to update this proposal.");
    if (action === "accept" && payload.project?.id)
      window.location.assign(`/project/${payload.project.id}/tracking`);
    else
      setClientProposals((items) =>
        items.map((item) => (item.id === proposal.id ? { ...item, status: "REJECTED" } : item)),
      );
  }
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
            <span
              className={`rounded-full px-3 py-1 ${
                job.status === "OPEN"
                  ? "bg-green/10 text-green"
                  : job.status === "CLOSED"
                    ? "bg-red/10 text-red"
                    : "bg-muted"
              }`}
            >
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
                {isDeadlinePassed && (
                  <span className="ml-1 text-xs text-destructive">(Passed)</span>
                )}
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

        {(job.locationAddress || (job.locationLat !== null && job.locationLng !== null)) && (
          <section className="mt-6 max-w-2xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Project location</h2>
                <p className="text-sm text-muted-foreground">Where this job was posted</p>
              </div>
            </div>
            <iframe
              title={`Map for ${job.title}`}
              className="mt-3 h-[220px] w-full rounded-2xl border border-border"
              loading="lazy"
              src={
                job.locationLat !== null && job.locationLng !== null
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${job.locationLng - 0.01}%2C${job.locationLat - 0.01}%2C${job.locationLng + 0.01}%2C${job.locationLat + 0.01}&layer=mapnik&marker=${job.locationLat}%2C${job.locationLng}`
                  : `https://www.google.com/maps?q=${encodeURIComponent(job.locationAddress ?? job.location ?? "")}&output=embed`
              }
            />
          </section>
        )}

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
        {isOwner && (
          <section className="mt-8 border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Proposals & Bidding</h2>
                <p className="text-sm text-muted-foreground">
                  Review and manage proposals from professionals
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {clientProposals.length > 0 && (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="font-semibold text-sm text-primary">
                    {clientProposals.length} proposal{clientProposals.length !== 1 ? "s" : ""}{" "}
                    received
                  </p>
                </div>
              )}
              {clientProposals.map((proposal) => (
                <article
                  key={proposal.id}
                  className="rounded-xl border border-border p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {proposal.professional
                            ? `${proposal.professional.firstName} ${proposal.professional.lastName}`
                            : "Professional"}
                        </h3>
                        {proposal.professional?.isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {proposal.professional?.professionalCategory ?? "Professional"}
                        {proposal.professional?.professionalCity
                          ? ` · ${proposal.professional.professionalCity}`
                          : ""}
                      </p>
                      {proposal.professional && (
                        <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {proposal.professional.averageRating.toFixed(1)} (
                          {proposal.professional.reviewCount} reviews)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          proposal.status === "PENDING"
                            ? "bg-yellow/10 text-yellow"
                            : proposal.status === "ACCEPTED"
                              ? "bg-green/10 text-green"
                              : "bg-red/10 text-red"
                        }`}
                      >
                        {proposal.status === "PENDING" ? "Pending Review" : proposal.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Proposed Price</p>
                      <p className="mt-1 text-lg font-semibold">
                        ${proposal.bidAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-xs text-muted-foreground">Delivery Time</p>
                      <p className="mt-1 text-lg font-semibold">{proposal.duration}</p>
                    </div>
                  </div>
                  <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Proposal Message</p>
                    <p className="text-sm whitespace-pre-wrap text-foreground">
                      {proposal.coverLetter}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {proposal.professional && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/pro/${proposal.professional.id}`}>View Profile</Link>
                      </Button>
                    )}
                    {proposal.status === "PENDING" && job.status === "OPEN" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green hover:bg-green/90"
                          onClick={() => setPendingAcceptProposal(proposal)}
                        >
                          Accept & Hire
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void reviewProposal(proposal, "reject")}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {!clientProposals.length && (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No proposals yet. Share this job to attract professionals.
                </p>
              )}
            </div>
          </section>
        )}
        {!isOwner && job.client && viewerRole === "PROFESSIONAL" && (
          <section className="mt-8 border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Send Your Proposal</h2>
                <p className="text-sm text-muted-foreground">
                  Submit your bid and let the client review your offer
                </p>
              </div>
            </div>
            {ownProposal ? (
              <div
                className={`rounded-xl border p-5 ${
                  ownProposal.status === "ACCEPTED"
                    ? "border-green/30 bg-green/5"
                    : ownProposal.status === "REJECTED"
                      ? "border-red/30 bg-red/5"
                      : "border-yellow/30 bg-yellow/5"
                }`}
              >
                <p
                  className={`font-semibold text-sm ${
                    ownProposal.status === "ACCEPTED"
                      ? "text-green"
                      : ownProposal.status === "REJECTED"
                        ? "text-red"
                        : "text-yellow"
                  }`}
                >
                  {ownProposal.status === "PENDING"
                    ? "✓ Proposal Submitted — Awaiting Client Response"
                    : ownProposal.status === "REJECTED"
                      ? "✗ Proposal Declined — Client selected another professional"
                      : "✓ Proposal Accepted — Project Started"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowProposalForm(true)}
                >
                  Modify Proposal
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border p-6 bg-card">
                <p className="text-sm text-muted-foreground mb-4">
                  Submit a proposal for this job. Include your price, delivery estimate, and a
                  message for the client.
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setProposalPrice(
                      String(
                        job.timingType === "HOURLY"
                          ? (job.hourlyRate ?? "")
                          : (job.budgetMax ?? job.budgetMin ?? ""),
                      ),
                    );
                    setShowProposalForm(true);
                  }}
                >
                  Submit Proposal
                </Button>
              </div>
            )}
          </section>
        )}
        {/* Actions - Footer Section */}
        <div className="mt-8 border-t border-border pt-6">
          {job.client ? (
            <>
              <p className="font-medium mb-4">Posted by {job.client.name}</p>
              {job.projectId && (
                <Button className="w-full sm:w-auto" asChild>
                  <Link href={`/project/${job.projectId}/tracking`}>Track Project</Link>
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="font-medium text-muted-foreground">This is your job posting.</p>
              {job.projectId ? (
                <Button className="w-full sm:w-auto" asChild>
                  <Link href={`/project/${job.projectId}`}>Track Project</Link>
                </Button>
              ) : (
                job.status === "OPEN" && (
                  <>
                    <Button className="w-full sm:w-auto" onClick={openFinder}>
                      Find a professional
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/post-job?edit=${jobId}`} className="w-full sm:w-auto">
                        Edit Job
                      </a>
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        if (
                          !confirm("Close this job? It will no longer appear in the marketplace.")
                        )
                          return;
                        const response = await fetch(`/api/v1/client/jobs/${jobId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "CLOSED" }),
                        });
                        if (!response.ok) {
                          const data = await response.json().catch(() => null);
                          alert(data?.error || "Unable to close job.");
                          return;
                        }
                        const { job: updatedJob } = await response.json();
                        setJob(fromOwner(updatedJob));
                      }}
                    >
                      Close Job
                    </Button>
                  </>
                )
              )}
              {job.status === "CLOSED" && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    if (!confirm("Reopen this job? It will appear again in the marketplace."))
                      return;
                    const response = await fetch(`/api/v1/client/jobs/${jobId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "OPEN" }),
                    });
                    if (!response.ok) {
                      const data = await response.json().catch(() => null);
                      alert(data?.error || "Unable to reopen job.");
                      return;
                    }
                    const { job: updatedJob } = await response.json();
                    setJob(fromOwner(updatedJob));
                  }}
                >
                  Reopen Job
                </Button>
              )}
              {job.status === "DRAFT" && <Button className="w-full sm:w-auto">Publish Job</Button>}
            </div>
          )}
          {showProposalForm && (
            <section className="mt-5 rounded-xl border bg-muted/30 p-4">
              <h2 className="text-lg font-semibold">Send Proposal</h2>
              <div className="mt-3 grid gap-3 [&_input]:rounded-md [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2">
                <input
                  type="number"
                  min="1"
                  value={proposalPrice}
                  onChange={(event) => setProposalPrice(event.target.value)}
                  placeholder="Your price"
                />
                <input
                  value={proposalDuration}
                  onChange={(event) => setProposalDuration(event.target.value)}
                  placeholder="Estimated delivery (for example, 14 days)"
                />
                <textarea
                  value={proposalMessage}
                  onChange={(event) => setProposalMessage(event.target.value)}
                  placeholder="Message to Client"
                  rows={5}
                />
              </div>
              {proposalError && <p className="mt-3 text-sm text-destructive">{proposalError}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setShowProposalForm(false)}>
                  Cancel
                </Button>
                <Button disabled={proposalBusy} onClick={() => void sendProposal()}>
                  {proposalBusy ? "Sending…" : "Send Proposal"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </article>
      <Dialog
        open={pendingAcceptProposal !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAcceptProposal(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm hire</DialogTitle>
            <DialogDescription>
              {pendingAcceptProposal
                ? `Hire ${pendingAcceptProposal.professional?.firstName ?? "this professional"} for $${pendingAcceptProposal.bidAmount.toLocaleString()}?`
                : "Hire this professional?"}
            </DialogDescription>
          </DialogHeader>

          {pendingAcceptProposal && (
            <div className="space-y-3 py-2 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Job:</span> {job.title}
              </p>
              <p>
                <span className="font-semibold text-foreground">Agreed amount:</span> ${" "}
                {pendingAcceptProposal.bidAmount.toLocaleString()}
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingAcceptProposal(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingAcceptProposal) return;
                setPendingAcceptProposal(null);
                await reviewProposal(pendingAcceptProposal, "accept");
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={finderOpen} onOpenChange={setFinderOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find a professional</DialogTitle>
            <DialogDescription>
              Choose a verified professional for {job.title}. Their hire request will include this
              job.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void searchProfessionals();
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={finderQuery}
                onChange={(event) => setFinderQuery(event.target.value)}
                placeholder="Search by name, service, or skill"
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={finderStatus === "loading"}>
              {finderStatus === "loading" ? "Searching..." : "Search"}
            </Button>
          </form>
          {finderStatus === "error" && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Professionals could not be loaded. Please try again.
            </p>
          )}
          {finderStatus === "loading" && !professionals.length && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-36 animate-pulse rounded-2xl bg-muted" />
              <div className="h-36 animate-pulse rounded-2xl bg-muted" />
            </div>
          )}
          {finderStatus !== "loading" && professionals.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {professionals.map((professional) => (
                <article key={professional.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    {professional.avatarUrl ? (
                      <img
                        src={professional.avatarUrl}
                        alt={professional.name}
                        className="h-11 w-11 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted font-semibold">
                        {professional.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{professional.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{professional.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {professional.rating.toFixed(1)} · {professional.reviewCount} reviews
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {professional.verified ? "Verified professional" : "Verification pending"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {professional.hourlyRate == null
                        ? "Contact for pricing"
                        : `$${professional.hourlyRate}/hr`}{" "}
                      · {professional.location ?? "Remote"}
                    </p>
                    <Button asChild size="sm">
                      <Link href={`/pro/${professional.id}?jobId=${encodeURIComponent(jobId)}`}>
                        Select
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {finderStatus === "idle" && professionals.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No verified professionals match this search.
            </p>
          )}
          <div className="border-t border-border pt-4 text-right">
            <Button variant="link" asChild>
              <Link href={`/discover?jobId=${encodeURIComponent(jobId)}`}>
                Open full professional search
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
