"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Briefcase,
  Bookmark,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Heart,
  MapPin,
  Search,
  Star,
  UserRound,
} from "lucide-react";

type JobSummary = {
  id: number;
  title: string | null;
  category: string | null;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: string;
  locationAddress: string | null;
  description: string | null;
  clientName: string | null;
  createdAt: string;
  proposalCount: number;
};

type SavedJob = JobSummary;

type Proposal = {
  id: number;
  jobId: number;
  jobTitle: string | null;
  clientName: string | null;
  bidAmount: number;
  duration: string;
  coverLetter: string;
  status: string;
  createdAt: string;
};

type ActiveProject = {
  id: number;
  jobId: number;
  jobTitle: string | null;
  clientName: string | null;
  status: string;
  acceptedAt: string;
};

type CompletedProject = {
  id: number;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
};

type ProfessionalMyJobsData = {
  openJobs: JobSummary[];
  savedJobs: SavedJob[];
  proposals: Proposal[];
  offers: Proposal[];
  activeProjects: ActiveProject[];
  completedProjects: CompletedProject[];
};

const tabs = [
  { value: "find", label: "Find Jobs", icon: Briefcase },
  { value: "saved", label: "Saved", icon: Bookmark },
  { value: "proposals", label: "Proposals", icon: FileText },
  { value: "offers", label: "Offers", icon: CheckCircle },
  { value: "active", label: "Active", icon: Clock },
  { value: "completed", label: "Completed", icon: Star },
] as const;

type TabKey = (typeof tabs)[number]["value"];

const usd = (value: number | null) =>
  value == null ? "Not set" : `$${value.toLocaleString("en-US")}`;
const proposalStatus = (status: string) =>
  ({
    PENDING: "Pending Client Response",
    ACCEPTED: "Proposal Accepted",
    REJECTED: "Proposal Declined",
  })[status] ?? status.replaceAll("_", " ");

function ProfessionalMyJobsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<ProfessionalMyJobsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingRequestId, setAcceptingRequestId] = useState<number | null>(null);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>(((searchParams.get("tab") as TabKey) ?? "find") as TabKey);

  useEffect(() => {
    const nextTab = (searchParams.get("tab") as TabKey) ?? "find";
    setTab(nextTab);
  }, [searchParams]);

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch("/api/portal/professional-jobs", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json()) as ProfessionalMyJobsData);
      setError(null);
    } catch {
      setError("Unable to load your jobs workspace.");
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace, tab]);

  useEffect(() => {
    const refreshWhenFocused = () => void loadWorkspace();
    window.addEventListener("focus", refreshWhenFocused);
    return () => window.removeEventListener("focus", refreshWhenFocused);
  }, [loadWorkspace]);

  const counts = useMemo(
    () => ({
      find: data?.openJobs.length ?? 0,
      saved: data?.savedJobs.length ?? 0,
      proposals: data?.proposals.length ?? 0,
      offers: data?.offers.length ?? 0,
      active: data?.activeProjects.length ?? 0,
      completed: data?.completedProjects.length ?? 0,
    }),
    [data],
  );

  const selectedList = useMemo(() => {
    if (!data) return [];
    switch (tab) {
      case "find":
        return data.openJobs;
      case "saved":
        return data.savedJobs;
      case "proposals":
        return data.proposals;
      case "offers":
        return data.offers;
      case "active":
        return data.activeProjects;
      case "completed":
        return data.completedProjects;
    }
  }, [data, tab]);

  const savedJobIds = useMemo(() => new Set(data?.savedJobs.map((job) => job.id) ?? []), [data]);
  const matchingJobs = useMemo(() => {
    if (tab !== "find" && tab !== "saved") return [];
    const term = query.trim().toLowerCase();
    const jobs = selectedList as JobSummary[];
    if (!term) return jobs;
    return jobs.filter((job) =>
      [job.title, job.category, job.locationAddress, job.clientName].some((value) =>
        value?.toLowerCase().includes(term),
      ),
    );
  }, [query, selectedList, tab]);

  function setTabAndSync(value: TabKey) {
    setTab(value);
    const next = new URLSearchParams(searchParams as unknown as URLSearchParams);
    next.set("tab", value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function acceptHireRequest(requestId: number) {
    setAcceptingRequestId(requestId);
    setError(null);
    try {
      const response = await fetch(`/api/professional/project-requests/${requestId}`, {
        method: "PATCH",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to accept the hire request.");
      await loadWorkspace();
      setTabAndSync("active");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to accept the hire request.");
    } finally {
      setAcceptingRequestId(null);
    }
  }

  async function toggleSavedJob(job: JobSummary) {
    const isSaved = savedJobIds.has(job.id);
    setSavingJobId(job.id);
    try {
      const response = await fetch(`/api/professional/favorite-jobs/${job.id}`, {
        method: isSaved ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error();
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          savedJobs: isSaved
            ? current.savedJobs.filter((savedJob) => savedJob.id !== job.id)
            : [...current.savedJobs, job],
        };
      });
    } catch {
      setError("Unable to update your saved jobs. Please try again.");
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Manage proposals, saved work, offers, and your active contracts from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/earnings">View earnings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/notifications">Notifications</Link>
          </Button>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTabAndSync("proposals")}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left transition hover:border-primary/60"
        >
          <p className="text-sm text-muted-foreground">Sent proposals</p>
          <p className="mt-1 text-3xl font-semibold text-primary">{counts.proposals}</p>
          <p className="mt-1 text-xs text-muted-foreground">Track client responses</p>
        </button>
        <button
          type="button"
          onClick={() => setTabAndSync("active")}
          className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
        >
          <p className="text-sm text-muted-foreground">Active work</p>
          <p className="mt-1 text-3xl font-semibold">{counts.active}</p>
          <p className="mt-1 text-xs text-muted-foreground">Projects currently in progress</p>
        </button>
        <button
          type="button"
          onClick={() => setTabAndSync("completed")}
          className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/60"
        >
          <p className="text-sm text-muted-foreground">Completed work</p>
          <p className="mt-1 text-3xl font-semibold">{counts.completed}</p>
          <p className="mt-1 text-xs text-muted-foreground">Finished engagements and earnings</p>
        </button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTabAndSync(item.value)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              tab === item.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card hover:border-primary/70"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
              <Badge variant={tab === item.value ? "secondary" : "outline"}>
                {counts[item.value]}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.label === "Find Jobs"
                ? "Browse open work opportunities."
                : item.label === "Saved"
                  ? "Review jobs you bookmarked."
                  : item.label === "Proposals"
                    ? "Requests awaiting your response."
                    : item.label === "Offers"
                      ? "Offers your clients have sent."
                      : item.label === "Active"
                        ? "Work currently in progress."
                        : "Completed engagements and earnings."}
            </p>
          </button>
        ))}
      </div>

      {(tab === "find" || tab === "saved") && (
        <div className="relative mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by job title, category, client, or location"
            className="pl-9"
          />
        </div>
      )}

      <div className="mt-8">
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            {error}
          </div>
        ) : !data ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            <div className="h-72 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "find" || tab === "saved" ? (
              matchingJobs.length ? (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {matchingJobs.map((job) => (
                    <li
                      key={job.id}
                      className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/70"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                            {job.category ?? "General"}
                          </p>
                          <h2 className="mt-1 text-lg font-semibold">
                            {job.title ?? `Job #${job.id}`}
                          </h2>
                          {job.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {job.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {job.locationAddress ?? "Remote"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-4 w-4" />
                              {job.clientName ?? "Client"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm text-muted-foreground">
                            {job.clientName ?? "Client"}
                          </p>
                          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                            {job.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <DollarSign className="h-4 w-4 text-primary" />
                          {job.timingType === "HOURLY"
                            ? `${usd(job.hourlyRate)} / hour`
                            : `${usd(job.budgetMin)} – ${usd(job.budgetMax)}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>{job.proposalCount} saved</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link href={`/professional/my-jobs/${job.id}`}>View details</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => void toggleSavedJob(job)}
                          disabled={savingJobId === job.id}
                        >
                          <Heart
                            className={`h-4 w-4 ${savedJobIds.has(job.id) ? "fill-current text-rose-500" : ""}`}
                          />
                          {savedJobIds.has(job.id) ? "Saved" : "Save"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  {query ? "No jobs match your search." : "No jobs found in this tab."}
                </div>
              )
            ) : tab === "proposals" || tab === "offers" ? (
              selectedList.length ? (
                <ul className="grid gap-4">
                  {(selectedList as Proposal[]).map((proposal) => (
                    <li key={proposal.id} className="rounded-3xl border border-border bg-card p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {proposal.clientName ?? "Client"}
                          </p>
                          <h2 className="mt-1 text-xl font-semibold">
                            {proposal.jobTitle ?? `Job #${proposal.jobId}`}
                          </h2>
                          <p className="mt-2 text-sm text-muted-foreground">{proposal.duration}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={proposal.status === "PENDING" ? "secondary" : "outline"}>
                            {proposalStatus(proposal.status)}
                          </Badge>
                          <span className="text-sm font-semibold">
                            ${proposal.bidAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {proposal.coverLetter ? (
                        <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
                          {proposal.coverLetter}
                        </p>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/job/${proposal.jobId}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                            View job
                          </Link>
                          {tab === "offers" && proposal.status === "PENDING" && (
                            <Button
                              size="sm"
                              onClick={() => void acceptHireRequest(proposal.id)}
                              disabled={acceptingRequestId === proposal.id}
                            >
                              {acceptingRequestId === proposal.id
                                ? "Starting..."
                                : "Accept & start work"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No proposals or offers yet.
                </div>
              )
            ) : tab === "active" ? (
              selectedList.length ? (
                <ul className="grid gap-4">
                  {(selectedList as ActiveProject[]).map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/project/${project.id}/tracking`}
                        aria-label={`Open ${project.jobTitle ?? `project ${project.jobId}`}`}
                        className="block rounded-3xl border border-border bg-card p-6 transition hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {project.clientName ?? "Client"}
                            </p>
                            <h2 className="mt-1 text-xl font-semibold">
                              {project.jobTitle ?? `Project #${project.jobId}`}
                            </h2>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{project.status}</p>
                            <p className="mt-1 text-sm">
                              Accepted {new Date(project.acceptedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-primary">
                            Manage &amp; Track Project
                          </span>
                          <Badge variant="secondary">Work in progress</Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No active projects yet.
                </div>
              )
            ) : selectedList.length ? (
              <ul className="grid gap-4">
                {(selectedList as CompletedProject[]).map((project) => (
                  <li key={project.id} className="rounded-3xl border border-border bg-card p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                        <h2 className="mt-1 text-xl font-semibold">
                          ${project.amount.toLocaleString()}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No completed work yet.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ProfessionalMyJobs() {
  return (
    <Suspense fallback={null}>
      <ProfessionalMyJobsContent />
    </Suspense>
  );
}
