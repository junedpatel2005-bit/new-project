"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Star,
  UserRound,
} from "lucide-react";

type DashboardData = {
  professional: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    professionalCategory: string | null;
    professionalCity: string | null;
    averageRating: number;
    reviewCount: number;
    isVerified: boolean;
    availabilityStatus: string;
    experienceYears: number | null;
  } | null;
  proposals: {
    id: number;
    jobTitle: string | null;
    clientName: string | null;
    bidAmount: number;
    duration: string;
  }[];
  activeProjects: {
    id: number;
    jobTitle: string | null;
    clientName: string | null;
    status: string;
    acceptedAt: string;
  }[];
  completedProjects: { id: number }[];
};

type Notification = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  readAt: string | null;
};

export default function ProfessionalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    void fetch("/api/portal/professional-jobs")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch(() => setError("Unable to load your professional dashboard."));
    void fetch("/api/portal/notifications")
      .then((response) => (response.ok ? response.json() : []))
      .then((items: Notification[]) => setNotifications(items.slice(0, 4)))
      .catch(() => setNotifications([]));
  }, []);

  const stats = useMemo(
    () => ({
      requests: data?.proposals.length ?? 0,
      active: data?.activeProjects.length ?? 0,
      completed: data?.completedProjects.length ?? 0,
      rating: data?.professional?.averageRating ?? 0,
    }),
    [data],
  );

  if (error)
    return (
      <AppShell>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          {error}
        </div>
      </AppShell>
    );

  if (!data || !data.professional)
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </AppShell>
    );

  const professional = data.professional;
  const name = `${professional.firstName} ${professional.lastName}`.trim();
  const availability = professional.availabilityStatus.replaceAll("_", " ");

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="h-24 gradient-primary" />
          <div className="flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-10 flex items-end gap-4">
              {professional.avatarUrl ? (
                <img
                  src={professional.avatarUrl}
                  alt={name}
                  className="h-20 w-20 rounded-2xl border-4 border-card object-cover"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-card bg-muted text-2xl font-semibold">
                  {name.slice(0, 1)}
                </div>
              )}
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold">
                  {name}
                  {professional.isVerified && <BadgeCheck className="h-5 w-5 text-primary" />}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {professional.professionalCategory ?? "Professional"}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/professional-profile">
                <Pencil className="mr-2 h-4 w-4" />
                Edit profile
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border px-6 py-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {professional.professionalCity ?? "Location not added"}
            </span>
            <Badge variant={professional.isVerified ? "secondary" : "outline"}>
              {professional.isVerified ? "Verified professional" : "Verification pending"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {availability}
            </Badge>
            {professional.experienceYears != null && (
              <span>{professional.experienceYears} years experience</span>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Completed jobs"
            value={stats.completed}
            icon={CheckCircle2}
            href="/professional/my-jobs?tab=completed"
          />
          <StatCard
            label="Active projects"
            value={stats.active}
            icon={BriefcaseBusiness}
            href="/professional/my-jobs?tab=active"
          />
          <StatCard
            label="Client requests"
            value={stats.requests}
            icon={Clock3}
            href="/professional/my-jobs?tab=proposals"
          />
          <StatCard
            label="Your rating"
            value={stats.rating ? stats.rating.toFixed(1) : "New"}
            icon={Star}
            href="/professional/reviews"
            note={`${professional.reviewCount} reviews`}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active work</h2>
              <Link
                href="/professional/my-jobs?tab=active"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 divide-y divide-border">
              {data.activeProjects.slice(0, 3).map((project) => (
                <div key={project.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BriefcaseBusiness className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {project.jobTitle ?? `Project #${project.id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.clientName ?? "Client"} · Started{" "}
                      {new Date(project.acceptedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{project.status}</Badge>
                  <Button asChild size="sm">
                    <Link href={`/project/${project.id}`}>Open</Link>
                  </Button>
                </div>
              ))}
              {!data.activeProjects.length && (
                <p className="py-6 text-sm text-muted-foreground">
                  No active work yet. Accept a client request to start a project.
                </p>
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
              {notifications.map((notification) => (
                <div key={notification.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-muted" : "bg-primary"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {notification.description}
                    </p>
                  </div>
                </div>
              ))}
              {!notifications.length && (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Incoming client requests</h2>
              <Link
                href="/professional/my-jobs?tab=proposals"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {data.proposals.slice(0, 3).map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{proposal.jobTitle ?? "New client request"}</p>
                    <p className="text-xs text-muted-foreground">
                      {proposal.clientName ?? "Client"} · {proposal.duration}
                    </p>
                  </div>
                  <p className="font-semibold">${proposal.bidAmount.toLocaleString()}</p>
                  <Button asChild size="sm">
                    <Link href="/professional/my-jobs?tab=proposals">Review</Link>
                  </Button>
                </div>
              ))}
              {!data.proposals.length && (
                <p className="py-6 text-sm text-muted-foreground">
                  No client requests waiting for you.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Professional profile</h2>
              <UserRound className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Keep your services, rates, and portfolio up to date so clients can find you.
            </p>
            <Button variant="link" className="mt-3 h-auto px-0" asChild>
              <Link href="/professional-profile">Edit profile</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  note,
}: {
  label: string;
  value: number | string;
  icon: typeof Star;
  href: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/70 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
          {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
        </div>
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </Link>
  );
}
