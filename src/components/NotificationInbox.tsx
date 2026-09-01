"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  Check,
  CheckCheck,
  CircleDollarSign,
  FileCheck,
  FileText,
  Filter,
  FolderGit2,
  Info,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Notification = {
  id: number;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: string;
  readAt: string | null;
  projectId: number | null;
  jobId: number | null;
  isProject?: boolean;
  projectTitle: string | null;
};

type TimelineProject = {
  project: { id: number; progress: number; status: string };
  timeline: Array<{
    id: number;
    title: string;
    description: string | null;
    createdAt: string;
    actorRole: string;
  }>;
};

function getNotificationCategoryIcon(type: string) {
  if (type.includes("MILESTONE") || type.includes("PAYMENT") || type.includes("PAYOUT")) {
    return { icon: CircleDollarSign, bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (type.includes("DISPUTE")) {
    return { icon: AlertTriangle, bg: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (type.includes("VERIFICATION") || type.includes("SECURITY")) {
    return { icon: ShieldCheck, bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  if (type.includes("PROPOSAL") || type.includes("BID") || type.includes("OFFER")) {
    return { icon: FileText, bg: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (type.includes("WORK") || type.includes("REVISION") || type.includes("STAGE")) {
    return { icon: FileCheck, bg: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (type.includes("ACCOUNT") || type.includes("USER") || type.includes("WELCOME")) {
    return { icon: UserCheck, bg: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  if (type.includes("MESSAGE")) {
    return { icon: MessageSquare, bg: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (type.includes("JOB") || type.includes("PROJECT")) {
    return { icon: Briefcase, bg: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  return { icon: Bell, bg: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function NotificationInbox({ admin: isAdmin = false }: { admin?: boolean } = {}) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"projects" | "other">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Timeline Dialog State
  const [timelineProjectId, setTimelineProjectId] = useState<number | null>(null);
  const [timelineProject, setTimelineProject] = useState<TimelineProject | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(false);

  // Clear Confirmation Modal
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/portal/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load notifications");
      const data = (await response.json()) as Notification[];
      setItems(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    window.addEventListener("servio:notification", loadNotifications);
    window.addEventListener("focus", loadNotifications);
    return () => {
      window.removeEventListener("servio:notification", loadNotifications);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [loadNotifications]);

  // Filtered notifications
  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      if (unreadOnly && item.readAt) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const text = `${item.title} ${item.description ?? ""} ${item.projectTitle ?? ""}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [items, unreadOnly, searchQuery]);

  // Categorize between Project notifications and Other notifications
  const projectNotifications = useMemo(() => {
    return filteredItems.filter((item) => item.isProject || item.projectId !== null || item.jobId !== null);
  }, [filteredItems]);

  const otherNotifications = useMemo(() => {
    return filteredItems.filter((item) => !item.isProject && item.projectId === null && item.jobId === null);
  }, [filteredItems]);

  // Group Project Notifications by Project / Job
  const projectGroups = useMemo(() => {
    const groups = new Map<string, { key: string; projectId: number | null; jobId: number | null; title: string; notifications: Notification[] }>();

    projectNotifications.forEach((item) => {
      const groupKey = item.projectId ? `project-${item.projectId}` : item.jobId ? `job-${item.jobId}` : `item-${item.id}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          projectId: item.projectId,
          jobId: item.jobId,
          title: item.projectTitle || (item.projectId ? `Project #${item.projectId}` : item.jobId ? `Job #${item.jobId}` : item.title),
          notifications: [],
        });
      }
      groups.get(groupKey)!.notifications.push(item);
    });

    return [...groups.values()].map((g) => ({
      ...g,
      notifications: g.notifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }));
  }, [projectNotifications]);

  const totalUnread = useMemo(() => items?.filter((item) => !item.readAt).length ?? 0, [items]);
  const projectUnread = useMemo(
    () => items?.filter((item) => (item.isProject || item.projectId !== null) && !item.readAt).length ?? 0,
    [items],
  );
  const otherUnread = useMemo(
    () => items?.filter((item) => !item.isProject && item.projectId === null && !item.readAt).length ?? 0,
    [items],
  );

  // Mark single or multiple notifications as read
  async function markRead(ids: number[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((current) =>
      current ? current.map((item) => (ids.includes(item.id) ? { ...item, readAt: item.readAt ?? now } : item)) : null,
    );
    await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }

  // Mark all notifications as read
  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((current) => current ? current.map((item) => ({ ...item, readAt: item.readAt ?? now })) : null);
    await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }

  // Delete single notification
  async function deleteNotification(id: number, event?: React.MouseEvent) {
    if (event) event.stopPropagation();
    setItems((current) => current ? current.filter((item) => item.id !== id) : null);
    await fetch("/api/portal/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }

  // Clear all notifications
  async function clearAllNotifications() {
    setItems([]);
    setConfirmClearAll(false);
    await fetch("/api/portal/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    window.dispatchEvent(new CustomEvent("servio:notifications-read"));
  }

  // Handle clicking on a notification item
  async function handleNotificationClick(item: Notification) {
    if (!item.readAt) {
      await markRead([item.id]);
    }
    if (item.href) {
      router.push(item.href);
    }
  }

  // Open Project Timeline modal
  async function openTimelineModal(projectId: number, event?: React.MouseEvent) {
    if (event) event.stopPropagation();
    setTimelineProjectId(projectId);
    setTimelineLoading(true);
    setTimelineError(false);
    try {
      const response = await fetch(`/api/portal/project?id=${projectId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Timeline fetch failed");
      const data = (await response.json()) as TimelineProject;
      setTimelineProject(data);
    } catch {
      setTimelineError(true);
    } finally {
      setTimelineLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Real-Time Notifications
            </span>
            <span className="text-xs font-medium text-slate-400">· Live updates</span>
          </div>
          <h1 className="mt-2.5 font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Track real-time project milestones, job proposals, escrow payments, and security alerts.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read ({totalUnread})
            </button>
          )}

          {(items?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition shadow-2xs"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs & Search Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* 2 Primary Tabs */}
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1.5 gap-1.5 self-start shadow-inner">
            {/* Tab 1: Project Notifications */}
            <button
              type="button"
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "projects"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FolderGit2 className="h-4 w-4 text-indigo-600" />
              <span>Project Notifications</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "projects"
                    ? projectUnread > 0
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {projectNotifications.length}
              </span>
            </button>

            {/* Tab 2: Other Notifications */}
            <button
              type="button"
              onClick={() => setActiveTab("other")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "other"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Bell className="h-4 w-4 text-indigo-600" />
              <span>Other Notifications</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "other"
                    ? otherUnread > 0
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {otherNotifications.length}
              </span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search updates…"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Unread Only Toggle */}
            <button
              type="button"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-2xs ${
                unreadOnly
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Unread Only</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4 py-8">
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-2xs">
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
              <h3 className="mt-2 text-sm font-bold text-rose-900">Unable to load notifications</h3>
              <p className="mt-1 text-xs text-rose-700">Please check your internet connection and reload.</p>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* TAB 1: Project Notifications View */}
          {!loading && !error && activeTab === "projects" && (
            <div className="space-y-5">
              {projectGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                  <FolderGit2 className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-3 text-sm font-bold text-slate-800">No project notifications</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Milestone updates, work submissions, and job proposals will appear organized here.
                  </p>
                </div>
              ) : (
                projectGroups.map((group) => {
                  const unreadCount = group.notifications.filter((n) => !n.readAt).length;
                  const isExpanded = expandedProjects.has(group.projectId ?? 0);
                  const visibleNotifications = isExpanded
                    ? group.notifications
                    : group.notifications.slice(0, 3);

                  return (
                    <section
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
                    >
                      {/* Project Card Group Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold shadow-2xs">
                            <FolderGit2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-900">
                                {group.title}
                              </h3>
                              {unreadCount > 0 && (
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-200">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              {group.projectId ? `Project #${group.projectId}` : `Job #${group.jobId}`} · {group.notifications.length} updates recorded
                            </p>
                          </div>
                        </div>

                        {/* Project Actions */}
                        <div className="flex items-center gap-2">
                          {group.projectId && (
                            <button
                              type="button"
                              onClick={(e) => void openTimelineModal(group.projectId!, e)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Timeline</span>
                            </button>
                          )}
                          {group.projectId && (
                            <button
                              type="button"
                              onClick={() => router.push(`/project/${group.projectId}/tracking`)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-2xs"
                            >
                              <span>Open Project</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification Item List in this Project */}
                      <div className="divide-y divide-slate-100">
                        {visibleNotifications.map((item) => {
                          const { icon: Icon, bg } = getNotificationCategoryIcon(item.type);
                          return (
                            <div
                              key={item.id}
                              onClick={() => void handleNotificationClick(item)}
                              className={`group flex items-start gap-4 p-4 sm:p-5 transition cursor-pointer hover:bg-slate-50/80 ${
                                !item.readAt ? "bg-indigo-50/30" : "bg-white"
                              }`}
                            >
                              {/* Category Icon */}
                              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${bg}`}>
                                <Icon className="h-4 w-4" />
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-sm tracking-tight ${
                                      !item.readAt ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                                    }`}
                                  >
                                    {item.title}
                                  </p>
                                  {!item.readAt && (
                                    <span className="h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-100 shrink-0" />
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                                  {item.href && (
                                    <span className="text-indigo-600 font-bold group-hover:underline flex items-center gap-1">
                                      View details <ArrowRight className="h-3 w-3 inline" />
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quick Actions (Delete / Mark Read) */}
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                {!item.readAt && (
                                  <button
                                    type="button"
                                    title="Mark as read"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void markRead([item.id]);
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Delete notification"
                                  onClick={(e) => void deleteNotification(item.id, e)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expand / Collapse Button */}
                      {group.notifications.length > 3 && (
                        <div className="border-t border-slate-100 bg-slate-50/40 p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProjects((current) => {
                                const next = new Set(current);
                                if (isExpanded) next.delete(group.projectId ?? 0);
                                else next.add(group.projectId ?? 0);
                                return next;
                              })
                            }
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                          >
                            {isExpanded
                              ? "Show fewer updates"
                              : `View ${group.notifications.length - 3} older updates for this project`}
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Other Notifications View */}
          {!loading && !error && activeTab === "other" && (
            <div className="space-y-3">
              {otherNotifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                  <Bell className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-3 text-sm font-bold text-slate-800">No other notifications</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Account, verification, system messages, and announcements will appear here.
                  </p>
                </div>
              ) : (
                otherNotifications.map((item) => {
                  const { icon: Icon, bg } = getNotificationCategoryIcon(item.type);
                  return (
                    <div
                      key={item.id}
                      onClick={() => void handleNotificationClick(item)}
                      className={`group flex items-start gap-4 rounded-2xl border border-slate-200 p-4 sm:p-5 transition cursor-pointer hover:border-indigo-200 hover:shadow-xs ${
                        !item.readAt ? "bg-indigo-50/20 border-indigo-200/80" : "bg-white"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${bg}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm tracking-tight ${
                              !item.readAt ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                            }`}
                          >
                            {item.title}
                          </p>
                          {!item.readAt && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-100 shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          {item.href && (
                            <span className="text-indigo-600 font-bold group-hover:underline flex items-center gap-1">
                              Action link <ArrowRight className="h-3 w-3 inline" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        {!item.readAt && (
                          <button
                            type="button"
                            title="Mark as read"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markRead([item.id]);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete notification"
                          onClick={(e) => void deleteNotification(item.id, e)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Project Timeline Modal Dialog */}
      <Dialog
        open={timelineProjectId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTimelineProjectId(null);
            setTimelineProject(null);
            setTimelineError(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl bg-white rounded-3xl p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-xl text-slate-900">
              Project Timeline Activity
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {timelineProject
                ? `Project #${timelineProjectId} · ${timelineProject.project.progress}% completed`
                : "Inspecting milestone progression..."}
            </DialogDescription>
          </DialogHeader>

          {timelineLoading && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-2 text-xs font-semibold text-slate-500">Loading activity timeline…</p>
            </div>
          )}

          {!timelineLoading && timelineError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              Unable to load project timeline data.
            </div>
          )}

          {!timelineLoading && timelineProject && (
            <div className="mt-4 space-y-6">
              {/* Progress Tracker */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Overall Progress</span>
                  <span className="text-indigo-600">{timelineProject.project.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${timelineProject.project.progress}%` }}
                  />
                </div>
              </div>

              {/* Chronological Events */}
              <div className="relative border-l-2 border-slate-200 pl-5 space-y-6 ml-3">
                {timelineProject.timeline.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No logged activity yet for this project.</p>
                ) : (
                  timelineProject.timeline.map((event) => (
                    <div key={event.id} className="relative">
                      {/* Step Dot */}
                      <span className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full bg-indigo-600 ring-4 ring-white border-2 border-indigo-200" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                            {event.actorRole}
                          </span>
                        </div>
                        {event.description && (
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{event.description}</p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400 font-medium">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Clear all notifications?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will remove all notifications from your inbox. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmClearAll(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void clearAllNotifications()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition shadow-2xs"
            >
              Confirm Clear
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
