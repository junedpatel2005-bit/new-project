"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CircleAlert,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Notification = {
  id: number;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
  projectId: number | null;
  projectTitle: string | null;
};

type TimelineProject = {
  project: { id: number; progress: number };
  timeline: Array<{
    id: number;
    title: string;
    description: string | null;
    createdAt: string;
    actorRole: string;
  }>;
};

function NotificationIcon({ type }: { type: string }) {
  const Icon =
    type === "NEW_MESSAGE" || type.includes("MESSAGE")
      ? MessageCircle
      : type.includes("DISPUTE") || type.includes("VERIFICATION")
        ? CircleAlert
        : type.includes("JOB") || type.includes("PROPOSAL") || type.includes("MILESTONE")
          ? BriefcaseBusiness
          : Bell;
  return <Icon className="h-4 w-4" />;
}

export function NotificationInbox({ admin: isAdmin = false }: { admin?: boolean } = {}) {
  const admin = false;
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"projects" | "other">("projects");
  const [timelineProject, setTimelineProject] = useState<TimelineProject | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/portal/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const incoming = (await response.json()) as Notification[];
      setItems((current) => {
        if (!current) return incoming;
        const merged = new Map(current.map((item) => [item.id, item]));
        incoming.forEach((item) =>
          merged.set(item.id, { ...item, readAt: merged.get(item.id)?.readAt ?? item.readAt }),
        );
        return [...merged.values()].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener("servio:notification", load);
    return () => window.removeEventListener("servio:notification", load);
  }, [load]);

  const unread = useMemo(() => items?.filter((item) => !item.readAt).length ?? 0, [items]);
  const projectGroups = useMemo(() => {
    const groups = new Map<number, Notification[]>();
    items?.forEach((item) => {
      if (item.projectId != null)
        groups.set(item.projectId, [...(groups.get(item.projectId) ?? []), item]);
    });
    return [...groups].map(([projectId, notifications]) => ({
      projectId,
      notifications,
      title: notifications[0]?.projectTitle || `Project #${projectId}`,
    }));
  }, [items]);
  const standalone = items?.filter((item) => item.projectId == null) ?? [];
  const projectNotificationCount = projectGroups.reduce(
    (total, group) => total + group.notifications.length,
    0,
  );

  async function markRead(ids: number[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems(
      (current) =>
        current?.map((item) => (ids.includes(item.id) ? { ...item, readAt: now } : item)) ?? null,
    );
    await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }
  async function open(ids: number[], href: string | null) {
    await markRead(ids.filter((id) => items?.find((item) => item.id === id)?.readAt == null));
    if (href) router.push(href);
  }
  async function openProjectTimeline(ids: number[], projectId: number, href: string | null) {
    if (!isAdmin) return open(ids, href);
    await markRead(ids.filter((id) => items?.find((item) => item.id === id)?.readAt == null));
    setTimelineLoading(true);
    setTimelineError(false);
    try {
      const response = await fetch(`/api/v1/portal/project?id=${projectId}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setTimelineProject((await response.json()) as TimelineProject);
    } catch {
      setTimelineError(true);
    } finally {
      setTimelineLoading(false);
    }
  }
  async function markAllRead() {
    const now = new Date().toISOString();
    setItems(
      (current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? now })) ?? null,
    );
    await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }

  const muted = admin ? "text-slate-400" : "text-muted-foreground";
  const row = (item: Notification) => (
    <button
      key={item.id}
      type="button"
      onClick={() => void open([item.id], item.href)}
      className={`group flex w-full items-start gap-3 border-b py-4 text-left transition last:border-b-0 hover:bg-muted/45 ${!item.readAt ? "-mx-2 rounded-lg px-2" : ""} ${admin ? "border-white/10" : "border-border/70"}`}
    >
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${admin ? "bg-indigo-400/15 text-indigo-300" : "bg-primary/10 text-primary"}`}
      >
        <NotificationIcon type={item.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={`text-sm ${item.readAt ? "font-medium" : "font-semibold"}`}>
            {item.title}
          </span>
          {!item.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        </span>
        {item.description && (
          <span className={`mt-1 block line-clamp-2 text-sm ${muted}`}>{item.description}</span>
        )}
        <span className={`mt-1.5 block text-xs ${muted}`}>
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </span>
      <ArrowRight
        className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${muted}`}
      />
    </button>
  );

  return (
    <div
      className={`overflow-hidden rounded-2xl border text-foreground shadow-soft ${admin ? "border-white/10 bg-[#11182b] text-white" : "border-border bg-card"}`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-4 border-b px-5 py-5 sm:px-7 ${admin ? "border-white/10" : "border-border"}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl ${admin ? "bg-indigo-500/15 text-indigo-300" : "bg-primary/10 text-primary"}`}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Notifications</h1>
            <p className={`mt-0.5 text-sm ${muted}`}>Project updates and account activity</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={`font-semibold ${unread ? "text-primary" : muted}`}>
            {unread} unread
          </span>
          <span className={muted}>·</span>
          <span className={muted}>{items?.length ?? 0} total</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-primary hover:bg-primary/10"
            >
              <Check className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
      </header>
      <div className={`px-5 py-5 sm:px-7 ${admin ? "bg-[#0b1020]" : "bg-muted/15"}`}>
        <div className="mb-5 flex w-fit gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setView("projects")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${view === "projects" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Project notifications{" "}
            <span className="ml-1 opacity-75">{projectNotificationCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("other")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${view === "other" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Other notifications <span className="ml-1 opacity-75">{standalone.length}</span>
          </button>
        </div>
        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            Notifications could not be loaded.
          </p>
        )}
        {!items && !error && <div className="h-40 animate-pulse rounded-xl bg-muted" />}
        {items && !items.length && (
          <div
            className={`rounded-xl border border-dashed p-12 text-center ${admin ? "border-white/10" : "border-border"}`}
          >
            <Bell className={`mx-auto h-9 w-9 ${muted}`} />
            <p className={`mt-3 text-sm ${muted}`}>No notifications yet</p>
            <p className={`mt-1 text-sm ${muted}`}>
              Updates about your projects and account will appear here.
            </p>
          </div>
        )}
        {items && items.length > 0 && (
          <div className="space-y-5">
            {view === "projects" &&
              projectGroups.map((group) => {
                const latest = group.notifications[0];
                if (!latest) return null;
                const expanded = expandedProjects.has(group.projectId);
                const visible = expanded ? group.notifications : group.notifications.slice(0, 3);
                const unreadCount = group.notifications.filter((item) => !item.readAt).length;
                const timelineHref = latest.href
                  ? `${latest.href}${latest.href.includes("?") ? "&" : "?"}tab=timeline`
                  : null;
                return (
                  <section
                    key={group.projectId}
                    className={`rounded-xl border px-4 sm:px-5 ${admin ? "border-white/10 bg-white/[.02]" : "border-border bg-card"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div>
                        <h2 className="text-base font-semibold sm:text-lg">{group.title}</h2>
                        <p className={`mt-1 text-xs ${muted}`}>
                          Project #{group.projectId} · {latest.title} ·{" "}
                          {new Date(latest.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${unreadCount ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {unreadCount} unread
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void openProjectTimeline(
                              group.notifications.map((item) => item.id),
                              group.projectId,
                              timelineHref,
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${admin ? "text-indigo-300 hover:bg-white/10" : "text-primary hover:bg-primary/10"}`}
                        >
                          View timeline <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className={`divide-y ${admin ? "divide-white/10" : "divide-border/70"}`}>
                      {visible.map(row)}
                    </div>
                    {group.notifications.length > 3 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProjects((current) => {
                            const next = new Set(current);
                            if (expanded) next.delete(group.projectId);
                            else next.add(group.projectId);
                            return next;
                          })
                        }
                        className="w-full py-3 text-center text-xs font-semibold text-primary hover:underline"
                      >
                        {expanded
                          ? "Show less"
                          : `View ${group.notifications.length - 3} more updates`}
                      </button>
                    )}
                  </section>
                );
              })}
            {view === "other" && standalone.length > 0 && (
              <section
                className={`rounded-xl border px-4 sm:px-5 ${admin ? "border-white/10 bg-white/[.02]" : "border-border bg-card"}`}
              >
                <h2 className="py-4 text-sm font-semibold">Other notifications</h2>
                <div className={`divide-y ${admin ? "divide-white/10" : "divide-border/70"}`}>
                  {standalone.map(row)}
                </div>
              </section>
            )}
            {((view === "projects" && projectGroups.length === 0) ||
              (view === "other" && standalone.length === 0)) && (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <Bell className={`mx-auto h-8 w-8 ${muted}`} />
                <p className={`mt-3 text-sm ${muted}`}>
                  {view === "projects"
                    ? "No project notifications yet"
                    : "No other notifications yet"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog
        open={isAdmin && (timelineLoading || timelineError || timelineProject !== null)}
        onOpenChange={(open) => {
          if (!open && !timelineLoading) {
            setTimelineProject(null);
            setTimelineError(false);
          }
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project timeline</DialogTitle>
            <DialogDescription>
              {timelineProject
                ? `Project #${timelineProject.project.id} · ${timelineProject.project.progress}% complete`
                : "Loading project activity..."}
            </DialogDescription>
          </DialogHeader>
          {timelineError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              The project timeline could not be loaded.
            </p>
          ) : timelineLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : timelineProject?.timeline.length ? (
            <div className="divide-y divide-border/70">
              {timelineProject.timeline.map((event) => (
                <div key={event.id} className="flex gap-3 py-4">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    {event.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()} · {event.actorRole.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No timeline activity yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
