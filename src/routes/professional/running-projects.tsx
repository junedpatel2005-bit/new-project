"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/LoadingSkeleton";

type RunningProject = {
  id: number;
  jobTitle: string | null;
  clientName: string | null;
  status: string;
  acceptedAt: string;
  deadline: string | null;
  budget: number | null;
  timingType: string;
  progress: number;
  currentStage: string | null;
};

function displayStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(project: RunningProject) {
  if (project.budget == null) return "Amount pending";
  return project.timingType === "HOURLY"
    ? `$${project.budget.toLocaleString()}/hr`
    : `$${project.budget.toLocaleString()}`;
}

export default function RunningProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<RunningProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/portal/professional-jobs", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { activeProjects?: RunningProject[] }) => {
        if (active) setProjects(data.activeProjects ?? []);
      })
      .catch(() => {
        if (active) setError("Your active projects could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term
      ? projects
      : projects.filter((project) =>
          [project.jobTitle, project.clientName, project.status].some((value) =>
            value?.toLowerCase().includes(term),
          ),
        );
  }, [projects, search]);
  const inProgress = projects.filter((project) => project.status === "IN_PROGRESS").length;
  const totalValue = projects.reduce(
    (sum, project) => sum + (project.timingType === "HOURLY" ? 0 : (project.budget ?? 0)),
    0,
  );
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
    : 0;

  return (
    <AppShell>
      <div className="space-y-7">
        <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,var(--color-ink),var(--color-primary))] px-6 py-7 text-white shadow-card sm:px-8 sm:py-8">
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full bg-cta/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65">
                <Sparkles className="h-3.5 w-3.5" /> Professional workspace
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Keep your work moving.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                Track delivery, stay ahead of deadlines, and give every client a clear view of
                progress.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-white/65">Portfolio progress</p>
              <p className="mt-1 text-xl font-bold">
                {averageProgress}%{" "}
                <span className="text-sm font-medium text-white/70">average completion</span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={BriefcaseBusiness}
            label="Active projects"
            value={projects.length}
            tint="bg-primary/10 text-primary"
          />
          <Metric
            icon={Clock3}
            label="In progress"
            value={inProgress}
            tint="bg-amber-500/10 text-amber-600"
          />
          <Metric
            icon={CircleDollarSign}
            label="Active value"
            value={`$${totalValue.toLocaleString()}`}
            tint="bg-emerald-500/10 text-emerald-600"
          />
          <Metric
            icon={CheckCircle2}
            label="Average progress"
            value={`${averageProgress}%`}
            tint="bg-blue-500/10 text-blue-600"
          />
        </section>

        <section>
          <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-xl font-semibold">Running projects</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleProjects.length} active{" "}
                {visibleProjects.length === 1 ? "project" : "projects"}
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder="Search projects or clients"
              />
            </div>
          </div>
          {error ? (
            <p className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-5 space-y-4">
            {loading ? (
              <CardListSkeleton count={2} />
            ) : (
              visibleProjects.map((project) => (
                <article
                  key={project.id}
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:border-primary/25 hover:shadow-card"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold">
                              {project.jobTitle ?? `Project #${project.id}`}
                            </h3>
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                              {displayStatus(project.status)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {project.currentStage ?? "Project setup and planning"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {project.clientName ?? "Client"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {project.deadline
                                ? `Due ${new Date(project.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                                : `Started ${new Date(project.acceptedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-5 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            Agreed value
                          </p>
                          <p className="mt-1 font-semibold">{money(project)}</p>
                        </div>
                        <Button asChild>
                          <Link
                            href={`/project/${project.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="hidden sm:inline">View workspace</span>
                            <span className="sm:hidden">View</span>
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Project progress</span>
                        <span className="font-bold text-primary">{project.progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-cta))] transition-all duration-700"
                          style={{ width: `${Math.min(Math.max(project.progress, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
            {!loading && !error && !visibleProjects.length ? (
              <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.025] px-6 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <BriefcaseBusiness className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {search ? "No matching projects" : "No active projects yet"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {search
                    ? "Try another project or client name."
                    : "Accepted client work will appear here when it starts."}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof BriefcaseBusiness;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
