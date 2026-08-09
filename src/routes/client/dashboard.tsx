"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Briefcase,
  FileText,
  DollarSign,
  Star,
  ArrowUpRight,
  MoreHorizontal,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardData = {
  user: { firstName: string; averageRating: number };
  spent: number;
  jobs: {
    id: number;
    title: string;
    category: string;
    status: string;
    budgetMin: number | null;
    budgetMax: number | null;
    createdAt: string;
    _count: { favoriteJobs: number };
  }[];
  proposals: {
    id: number;
    professionalId: number;
    bidAmount: number;
    duration: string;
    coverLetter: string;
  }[];
  notifications: {
    id: number;
    title: string;
    description: string | null;
    createdAt: string;
    readAt: string | null;
  }[];
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch(() => setError("Sign in as a client to view your dashboard."));
  }, []);
  const stats = data
    ? [
        {
          label: "Active jobs",
          value: String(data.jobs.length),
          icon: Briefcase,
          tint: "text-primary bg-primary/10",
        },
        {
          label: "Open proposals",
          value: String(data.proposals.length),
          icon: FileText,
          tint: "text-accent bg-accent/15",
        },
        {
          label: "Spent this month",
          value: `$${data.spent.toLocaleString()}`,
          icon: DollarSign,
          tint: "text-success bg-success/15",
        },
        {
          label: "Avg. rating",
          value: data.user.averageRating.toFixed(1),
          icon: Star,
          tint: "text-warning bg-warning/15",
        },
      ]
    : [];
  return (
    <AppShell>
      <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{data ? `, ${data.user.firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your projects today.
          </p>
        </div>
        <Button asChild>
          <Link href="/post-job">+ Post a new job</Link>
        </Button>
      </div>
      {error ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.tint}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Active jobs</h2>
                <Link href="/post-job" className="text-sm text-primary hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-4 divide-y divide-border">
                {data?.jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/job/${job.id}`}
                    className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.category} · {job._count.favoriteJobs} saved ·{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary md:inline-block">
                      {job.status}
                    </span>
                    <span className="text-sm font-medium">${job.budgetMin ?? 0}</span>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                {data?.jobs.length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">No jobs posted yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Notifications</h2>
                <Link href="/notifications" className="text-sm text-primary hover:underline">
                  All
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {data?.notifications.map((n) => (
                  <div key={n.id} className="flex gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-muted" : "bg-primary"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.description}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {data?.notifications.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
              <h2 className="text-lg font-semibold">Recent proposals</h2>
              <div className="mt-4 space-y-4">
                {data?.proposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-4 rounded-xl border border-border p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">Professional #{p.professionalId}</p>
                        <div className="text-right">
                          <p className="font-semibold">${p.bidAmount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{p.duration}</p>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {p.coverLetter}
                      </p>
                    </div>
                  </div>
                ))}
                {data?.proposals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No proposals yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Saved pros</h2>
                <Bookmark className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                No saved professionals yet.
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
