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
} from "lucide-react";

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

  useEffect(() => {
    void fetch("/api/admin/data/jobs", { cache: "no-store" })
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
  const openDisputes = data?.disputes.filter((item) => item.status === "OPEN").length ?? 0;
  const urgent =
    data?.disputes.filter((item) => item.status === "OPEN" && item.priority === "HIGH").length ?? 0;
  const options =
    view === "jobs"
      ? ["ALL", "OPEN", "DRAFT", "CLOSED"]
      : ["ALL", "OPEN", "RESOLVED", "HIGH", "MEDIUM", "LOW"];

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
            />
            <Metric
              icon={Clock3}
              label="Open disputes"
              value={openDisputes}
              detail="Need team attention"
              color="amber"
            />
            <Metric
              icon={AlertTriangle}
              label="High-priority cases"
              value={urgent}
              detail="Escalated service issues"
              color="rose"
            />
            <Metric
              icon={CheckCircle2}
              label="Resolved disputes"
              value={data.disputes.filter((item) => item.status === "RESOLVED").length}
              detail="Closed out successfully"
              color="emerald"
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
            <div className="divide-y divide-white/10">
              {view === "jobs"
                ? jobs.map((job) => <JobRow key={job.id} job={job} />)
                : disputes.map((dispute) => <DisputeRow key={dispute.id} dispute={dispute} />)}
              {(view === "jobs" ? jobs : disputes).length === 0 && <Empty view={view} />}
            </div>
          </section>
        </>
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
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: number;
  detail: string;
  color: "indigo" | "amber" | "rose" | "emerald";
}) {
  const colors = {
    indigo: "bg-indigo-400/10 text-indigo-300",
    amber: "bg-amber-400/10 text-amber-300",
    rose: "bg-rose-400/10 text-rose-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
  };
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.055]">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{text}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
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
function JobRow({ job }: { job: Job }) {
  const budget =
    job.budgetMin || job.budgetMax
      ? `$${(job.budgetMin ?? 0).toLocaleString()} – $${(job.budgetMax ?? job.budgetMin ?? 0).toLocaleString()}`
      : "Budget not set";
  return (
    <article className="group flex flex-wrap items-center gap-x-5 gap-y-4 px-5 py-5 transition hover:bg-white/[.035] sm:px-6">
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
    </article>
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
