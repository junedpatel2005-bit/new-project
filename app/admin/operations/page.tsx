"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportMenu } from "@/components/reports/ExportMenu";

type Job = {
  id: number;
  title: string | null;
  category: string | null;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  urgency: string;
  workMode: string;
  locationLabel: string | null;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
};
type Dispute = {
  id: number;
  issueType: string;
  priority: string;
  message: string;
  reporterRole: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
type OperationsData = { jobs: Job[]; disputes: Dispute[] };
type JobDetails = Job & {
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: string;
  locationAddress: string | null;
  jobDate: string | null;
  deadline: string | null;
  updatedAt: string;
  attachments: {
    id: number;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    previewUrl: string | null;
  }[];
  _count: { favoriteJobs: number };
  user: Job["user"] & {
    id: number;
    phone: string | null;
    companyName: string | null;
    address: string | null;
    isVerified: boolean;
    createdAt: string;
  };
  proposals: {
    id: number;
    professionalId: number;
    bidAmount: number;
    duration: string;
    status: string;
    origin: string;
    createdAt: string;
    professional: { firstName: string; lastName: string; email: string } | null;
  }[];
  project: {
    id: number;
    status: string;
    progress: number;
    currentStage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    milestones: {
      id: number;
      title: string;
      description: string | null;
      amount: number;
      dueDate: string | null;
      status: string;
      approvedAt: string | null;
    }[];
    financial: { milestoneTotal: number; paidAmount: number; remainingAmount: number };
  } | null;
};

const date = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
const tone = (value: string) =>
  ({
    OPEN: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    CLOSED: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
    DRAFT: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
    PENDING: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    RESOLVED: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    HIGH: "bg-rose-400/10 text-rose-300 ring-rose-400/20",
    MEDIUM: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    LOW: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
  })[value] ?? "bg-indigo-400/10 text-indigo-300 ring-indigo-400/20";
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function OperationsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [view, setView] = useState<"jobs" | "disputes">("jobs");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    void fetch("/api/v1/admin/data/jobs", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setData({ jobs: result.jobs ?? [], disputes: result.disputes ?? [] }))
      .catch(() => setData({ jobs: [], disputes: [] }));
  }, []);

  const jobs = useMemo(
    () =>
      (data?.jobs ?? []).filter((job) => {
        const text =
          `${job.title} ${job.category} ${job.user.firstName} ${job.user.lastName} ${job.locationLabel}`.toLowerCase();
        return text.includes(query.toLowerCase()) && (filter === "ALL" || job.status === filter);
      }),
    [data, query, filter],
  );
  const disputes = useMemo(
    () =>
      (data?.disputes ?? []).filter((dispute) => {
        const text =
          `${dispute.issueType} ${dispute.message} ${dispute.reporterRole}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (filter === "ALL" || dispute.status === filter || dispute.priority === filter)
        );
      }),
    [data, query, filter],
  );
  const toggleSelect = (id: number) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allJobsSelected = jobs.length > 0 && jobs.every((job) => selectedIds.has(job.id));
  const toggleSelectAllJobs = () =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allJobsSelected) jobs.forEach((job) => next.delete(job.id));
      else jobs.forEach((job) => next.add(job.id));
      return next;
    });
  const openDisputes = data?.disputes.filter((item) => item.status === "OPEN").length ?? 0;
  const runningProjects = data?.jobs.filter((item) => item.status === "RUNNING").length ?? 0;
  const completedProjects = data?.jobs.filter((item) => item.status === "COMPLETED").length ?? 0;
  const options =
    view === "jobs"
      ? ["ALL", "OPEN", "RUNNING", "COMPLETED", "DRAFT", "CLOSED"]
      : ["ALL", "OPEN", "RESOLVED", "HIGH", "MEDIUM", "LOW"];

  async function openJob(id: number) {
    setDetailsStatus("loading");
    setSelectedJob(null);
    try {
      const response = await fetch(`/api/v1/admin/jobs/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load job details");
      const result = await response.json();
      setSelectedJob(result.job);
      setDetailsStatus("idle");
    } catch {
      setDetailsStatus("error");
    }
  }

  return (
    <div className="pb-5">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 via-[#161d35] to-[#11182b] px-6 py-7 sm:px-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-300">
              Marketplace operations
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Jobs & disputes
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Monitor marketplace demand and keep service issues moving to resolution.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1020]/50 px-4 py-3 backdrop-blur">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-400">Operations health</p>
              <p className="text-sm font-semibold text-white">All systems active</p>
            </div>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="mt-6 h-80 animate-pulse rounded-3xl bg-white/5" />
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={BriefcaseBusiness}
              label="Total jobs"
              value={data.jobs.length}
              detail={`${data.jobs.filter((job) => job.status === "OPEN").length} currently open`}
              color="indigo"
              onClick={() => {
                setView("jobs");
                setFilter("ALL");
              }}
            />
            <Metric
              icon={Clock3}
              label="Open disputes"
              value={openDisputes}
              detail="Need team attention"
              color="amber"
              onClick={() => {
                setView("disputes");
                setFilter("OPEN");
              }}
            />
            <Metric
              icon={BriefcaseBusiness}
              label="Running projects"
              value={runningProjects}
              detail="Currently in progress"
              color="indigo"
              onClick={() => {
                setView("jobs");
                setFilter("RUNNING");
              }}
            />
            <Metric
              icon={CheckCircle2}
              label="Completed projects"
              value={completedProjects}
              detail="Finished work"
              color="emerald"
              onClick={() => {
                setView("jobs");
                setFilter("COMPLETED");
              }}
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035] shadow-2xl shadow-black/10">
            <div className="border-b border-white/10 px-5 pt-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    Operations queue
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Review the latest marketplace activity in one place.
                  </p>
                </div>
                <span className="rounded-full bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-slate-300">
                  {view === "jobs" ? jobs.length : disputes.length} records
                </span>
              </div>
              <div className="mt-5 flex gap-1">
                <Tab
                  active={view === "jobs"}
                  onClick={() => {
                    setView("jobs");
                    setFilter("ALL");
                  }}
                  icon={BriefcaseBusiness}
                  label="Jobs"
                  count={data.jobs.length}
                />
                <Tab
                  active={view === "disputes"}
                  onClick={() => {
                    setView("disputes");
                    setFilter("ALL");
                  }}
                  icon={CircleAlert}
                  label="Disputes"
                  count={data.disputes.length}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:px-6">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    view === "jobs"
                      ? "Search jobs, clients, locations..."
                      : "Search issue type or reporter..."
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0b1020]/80 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/10"
                />
              </label>
              <div className="flex items-center gap-2 overflow-x-auto">
                <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                {options.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === item ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    {label(item)}
                  </button>
                ))}
              </div>
            </div>
            {view === "jobs" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 sm:px-6">
                <label className="flex items-center gap-2 text-sm text-slate-400">
                  <Checkbox
                    checked={allJobsSelected}
                    onCheckedChange={toggleSelectAllJobs}
                    disabled={!jobs.length}
                  />
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all shown"}
                </label>
                <ExportMenu
                  endpoint="/api/admin/reports/jobs"
                  selectedIds={[...selectedIds]}
                  fileBaseName="jobs"
                />
              </div>
            )}
            <div className="divide-y divide-white/10">
              {view === "jobs"
                ? jobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onOpen={openJob}
                      selected={selectedIds.has(job.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))
                : disputes.map((dispute) => <DisputeRow key={dispute.id} dispute={dispute} />)}
              {(view === "jobs" ? jobs : disputes).length === 0 && <Empty view={view} />}
            </div>
          </section>
        </>
      )}
      {(selectedJob || detailsStatus !== "idle") && (
        <JobDetailsPanel
          job={selectedJob}
          status={detailsStatus}
          onClose={() => {
            setSelectedJob(null);
            setDetailsStatus("idle");
          }}
        />
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label: text,
  value,
  detail,
  color,
  onClick,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
  detail: string;
  color: "indigo" | "amber" | "rose" | "emerald";
  onClick: () => void;
}) {
  const colors = {
    indigo: "bg-indigo-400/10 text-indigo-300",
    amber: "bg-amber-400/10 text-amber-300",
    rose: "bg-rose-400/10 text-rose-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{text}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </button>
  );
}
function Tab({
  active,
  onClick,
  icon: Icon,
  label: text,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BriefcaseBusiness;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-3 text-sm font-semibold transition ${active ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
    >
      <Icon className="h-4 w-4" />
      {text}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[11px] ${active ? "bg-indigo-400/20 text-indigo-200" : "bg-white/5 text-slate-500"}`}
      >
        {count}
      </span>
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-400" />}
    </button>
  );
}
function JobRow({
  job,
  onOpen,
  selected,
  onToggleSelect,
}: {
  job: Job;
  onOpen: (id: number) => void;
  selected: boolean;
  onToggleSelect: (id: number) => void;
}) {
  const budget =
    job.budgetMin || job.budgetMax
      ? `$${(job.budgetMin ?? 0).toLocaleString()} – $${(job.budgetMax ?? job.budgetMin ?? 0).toLocaleString()}`
      : "Budget not set";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => void onOpen(job.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") void onOpen(job.id);
      }}
      className="group flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-4 px-5 py-5 text-left transition hover:bg-white/[.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:px-6"
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggleSelect(job.id)}
        onClick={(event) => event.stopPropagation()}
        aria-label={`Select ${job.title ?? "job"}`}
      />
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-400/10 text-indigo-300">
        <BriefcaseBusiness className="h-5 w-5" />
      </span>
      <div className="min-w-56 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-white">{job.title ?? `Untitled job #${job.id}`}</h3>
          <Badge value={job.status} />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {job.category ?? "General"} <span className="mx-1.5 text-slate-600">•</span>{" "}
          {job.user.firstName} {job.user.lastName}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {job.locationLabel ?? "Location not set"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Posted {date(job.createdAt)}
          </span>
        </div>
      </div>
      <div className="min-w-36 sm:text-right">
        <p className="text-sm font-semibold text-white">{budget}</p>
        <p className="mt-1 text-xs text-slate-500">
          {label(job.workMode)} · {label(job.urgency)} priority
        </p>
      </div>
      <ChevronRight className="hidden h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300 sm:block" />
    </div>
  );
}
function DisputeRow({ dispute }: { dispute: Dispute }) {
  return (
    <article className="group flex flex-wrap items-center gap-x-5 gap-y-4 px-5 py-5 transition hover:bg-white/[.035] sm:px-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-400/10 text-rose-300">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-56 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-white">{label(dispute.issueType)}</h3>
          <Badge value={dispute.status} />
          <Badge value={dispute.priority} />
        </div>
        <p className="mt-1 line-clamp-1 max-w-2xl text-sm text-slate-400">{dispute.message}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <UserRound className="h-3.5 w-3.5" />
          Reported by {label(dispute.reporterRole)} <span className="mx-1 text-slate-600">•</span>{" "}
          {date(dispute.createdAt)}
        </p>
      </div>
      <div className="min-w-36 sm:text-right">
        <p className="text-xs uppercase tracking-wider text-slate-500">Case #{dispute.id}</p>
        <p className="mt-1 text-sm font-medium text-slate-300">Updated {date(dispute.updatedAt)}</p>
      </div>
      <ChevronRight className="hidden h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300 sm:block" />
    </article>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone(value)}`}
    >
      {label(value)}
    </span>
  );
}
function Empty({ view }: { view: "jobs" | "disputes" }) {
  const Icon = view === "jobs" ? BriefcaseBusiness : CheckCircle2;
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold text-white">No matching {view} found</p>
      <p className="mt-1 text-sm text-slate-400">Try changing the search or status filter.</p>
    </div>
  );
}

function JobDetailsPanel({
  job,
  status,
  onClose,
}: {
  job: JobDetails | null;
  status: "idle" | "loading" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-details-title"
    >
      <section
        className="admin-job-details-scroll max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11182b] shadow-2xl shadow-black/40"
        aria-live="polite"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#11182b] px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-300">
              Job details
            </p>
            <h2 id="job-details-title" className="mt-1 text-xl font-semibold text-white">
              {job?.title ?? (status === "loading" ? "Loading job…" : "Job details")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close job details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {status === "loading" ? <div className="h-72 animate-pulse bg-white/[.025]" /> : null}
        {status === "error" ? (
          <p className="p-6 text-sm text-rose-300">
            Job details could not be loaded. Please try again.
          </p>
        ) : null}
        {job ? (
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={job.status} />
                <Badge value={job.urgency} />
                <span className="text-sm text-slate-400">
                  Job #{job.id} · Updated {date(job.updatedAt)}
                </span>
              </div>
              <DetailGrid
                items={[
                  ["Category", job.category ?? "General"],
                  ["Work mode", label(job.workMode)],
                  [
                    "Budget",
                    job.timingType === "HOURLY"
                      ? job.hourlyRate == null
                        ? "Not set"
                        : `$${job.hourlyRate.toLocaleString()}/hr`
                      : `$${job.budgetMin?.toLocaleString() ?? "—"} – $${job.budgetMax?.toLocaleString() ?? "—"}`,
                  ],
                  ["Location", job.locationAddress ?? job.locationLabel ?? "Not set"],
                  ["Job date", job.jobDate ? date(job.jobDate) : "Not set"],
                  ["Deadline", job.deadline ? date(job.deadline) : "Not set"],
                  ["Posted", date(job.createdAt)],
                  ["Saved", `${job._count.favoriteJobs} times`],
                ]}
              />
              <div>
                <h3 className="text-sm font-semibold text-white">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {job.description ?? "No description was provided."}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Proposals ({job.proposals.length})
                </h3>
                <div className="mt-3 space-y-2">
                  {job.proposals.length ? (
                    job.proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {proposal.professional
                              ? `${proposal.professional.firstName} ${proposal.professional.lastName}`
                              : `Professional #${proposal.professionalId}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {proposal.duration} · {date(proposal.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge value={proposal.status} />
                          <p className="mt-1 text-sm font-semibold text-white">
                            ${proposal.bidAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No proposals have been submitted.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Attachments ({job.attachments.length})
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.attachments.length ? (
                    job.attachments.map((attachment) =>
                      attachment.previewUrl ? (
                        <a
                          key={attachment.id}
                          href={attachment.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-indigo-400/25 bg-indigo-400/10 px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-400/20"
                        >
                          {attachment.fileName}
                        </a>
                      ) : (
                        <span
                          key={attachment.id}
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
                        >
                          {attachment.fileName}
                        </span>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-slate-400">No attachments.</p>
                  )}
                </div>
              </div>
            </div>
            <aside className="h-fit rounded-2xl border border-white/10 bg-black/10 p-5">
              <h3 className="text-sm font-semibold text-white">Client information</h3>
              <p className="mt-3 font-medium text-white">
                {job.user.firstName} {job.user.lastName}
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>{job.user.email}</p>
                <p>{job.user.phone ?? "Phone not provided"}</p>
                <p>{job.user.companyName ?? "No company listed"}</p>
                <p>{job.user.address ?? "Address not provided"}</p>
                <p className="pt-2 text-xs text-slate-500">
                  Account created {date(job.user.createdAt)} ·{" "}
                  {job.user.isVerified ? "Verified" : "Not verified"}
                </p>
              </div>
              {job.project ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <h3 className="text-sm font-semibold text-white">Project status</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {label(job.project.status)} · {job.project.progress}% complete
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {job.project.currentStage ?? "No current stage"}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/5 p-2">
                      <dt className="text-[10px] uppercase text-slate-500">Milestones</dt>
                      <dd className="mt-1 text-sm font-semibold text-white">
                        {job.project.milestones.length}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                      <dt className="text-[10px] uppercase text-slate-500">Paid</dt>
                      <dd className="mt-1 text-sm font-semibold text-white">
                        ${job.project.financial.paidAmount.toLocaleString()}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2">
                      <dt className="text-[10px] uppercase text-slate-500">Remaining</dt>
                      <dd className="mt-1 text-sm font-semibold text-white">
                        ${job.project.financial.remainingAmount.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Milestone work
                    </h4>
                    {job.project.milestones.length ? (
                      job.project.milestones.map((milestone) => (
                        <div key={milestone.id} className="rounded-lg border border-white/10 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white">{milestone.title}</p>
                            <Badge value={milestone.status} />
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            ${milestone.amount.toLocaleString()}
                            {milestone.dueDate ? ` · Due ${date(milestone.dueDate)}` : ""}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No milestones added.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid gap-x-5 gap-y-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:grid-cols-2">
      {items.map(([term, definition]) => (
        <div key={term}>
          <dt className="text-xs uppercase tracking-wider text-slate-500">{term}</dt>
          <dd className="mt-1 text-sm text-white">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
