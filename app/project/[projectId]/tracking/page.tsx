"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  History,
  LayoutGrid,
  MapPin,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Person = { firstName: string; lastName: string } | null;
type Milestone = {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  dueDate: string | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  payment: { status: string; professionalPayoutAmount: number } | null;
};
type Event = {
  id: number;
  title: string;
  description: string | null;
  actorRole: string;
  createdAt: string;
  progress: number | null;
  stage: string | null;
  attachmentJson: string | null;
  milestoneId: number | null;
};
type Attachment = { id: number; name: string; mimeType?: string; sizeBytes?: number; url: string };
type Upload = {
  id: number;
  title: string;
  note: string | null;
  fileName: string | null;
  fileUrl: string | null;
  filesJson: string | null;
  roundNumber: number;
  status: string;
  createdAt: string;
  milestoneId: number | null;
};

type Data = {
  project: {
    id: number;
    status: string;
    progress: number;
    currentStage: string | null;
    acceptedAt: string;
    startedAt: string | null;
    completedAt: string | null;
  };
  job: {
    title: string | null;
    jobDate: string | null;
    deadline: string | null;
    budgetMax: number | null;
    paymentMethod: "WALLET" | "OFFLINE";
    locationAddress: string | null;
    locationLat: number | null;
    locationLng: number | null;
  } | null;
  professional: Person;
  client: Person;
  viewerRole: "CLIENT" | "PROFESSIONAL";
  milestones: Milestone[];
  uploads: Upload[];
  revisions: { note: string | null; createdAt: string }[];
  timeline: Event[];
  agreedAmount: number | null;
  review: {
    id: number;
    rating: number;
    comment: string | null;
    createdAt: string;
    professionalResponse: string | null;
    professionalResponseAt: string | null;
  } | null;
  dispute: {
    id: number;
    issueType: string;
    priority: string;
    message: string;
    status: string;
    reporterRole: string;
    createdAt: string;
  } | null;
};

const name = (p: Person, fallback: string) => (p ? `${p.firstName} ${p.lastName}` : fallback);
const label = (status: string) =>
  ({
    READY_TO_START: "Ready to Start",
    IN_PROGRESS: "In Progress",
    AWAITING_CLIENT_REVIEW: "Awaiting Client Review",
    REVISION_REQUESTED: "Revision Requested",
    FINAL_WORK_SUBMITTED: "Final Work Submitted",
    AWAITING_PROFESSIONAL_CONFIRMATION: "Awaiting Professional Confirmation",
    COMPLETED: "Completed",
  })[status] ?? status.replaceAll("_", " ");
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Not started yet";
const dateInputValue = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : undefined;
function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function milestoneStatusStyle(status: string) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "AWAITING_CLIENT_REVIEW") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "REVISION_REQUESTED") return "border-red-200 bg-red-50 text-red-700";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-border bg-muted text-muted-foreground";
}
function milestoneAccent(status: string) {
  if (status === "APPROVED") return "border-l-emerald-500";
  if (status === "AWAITING_CLIENT_REVIEW") return "border-l-purple-500";
  if (status === "REVISION_REQUESTED") return "border-l-red-500";
  if (status === "IN_PROGRESS") return "border-l-amber-500";
  return "border-l-border";
}
function milestoneOverdueDays(milestone: Milestone): number | null {
  if (!milestone.dueDate || milestone.status === "APPROVED") return null;
  const diffMs = Date.now() - new Date(milestone.dueDate).getTime();
  const days = Math.ceil(diffMs / 86400000);
  return days > 0 ? days : null;
}
const needsAction = (status: string) =>
  status === "REVISION_REQUESTED" ||
  status === "AWAITING_CLIENT_REVIEW" ||
  status === "FINAL_WORK_SUBMITTED" ||
  status === "AWAITING_PROFESSIONAL_CONFIRMATION";
const disputeEligibleStatuses = [
  "READY_TO_START",
  "IN_PROGRESS",
  "AWAITING_CLIENT_REVIEW",
  "REVISION_REQUESTED",
  "FINAL_WORK_SUBMITTED",
  "COMPLETED",
  "CLOSED",
];

export default function SharedProjectTrackingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState("0");
  const [stage, setStage] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [workTitle, setWorkTitle] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [workFiles, setWorkFiles] = useState<File[]>([]);
  const [workMilestoneId, setWorkMilestoneId] = useState("auto");
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [approvalMilestone, setApprovalMilestone] = useState<Milestone | null>(null);
  const [approvalWalletBalance, setApprovalWalletBalance] = useState<number | null>(null);
  const [approvalError, setApprovalError] = useState("");
  const [approvalSuccess, setApprovalSuccess] = useState<{
    charged: number;
    professionalReceives: number;
    adminReceives: number;
    platformEarnings: number;
    remainingBalance: number;
  } | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState<number | "">("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewResponseForm, setShowReviewResponseForm] = useState(false);
  const [reviewResponse, setReviewResponse] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeType, setDisputeType] = useState("PAYMENT");
  const [disputePriority, setDisputePriority] = useState("MEDIUM");
  const [disputeMessage, setDisputeMessage] = useState("");
  const actionInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/v1/portal/project?id=${encodeURIComponent(projectId)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load this project.");
    setData((await response.json()) as Data);
  }, [projectId]);
  useEffect(() => {
    void refresh().catch((error: unknown) =>
      setMessage(error instanceof Error ? error.message : "Unable to load this project."),
    );
  }, [refresh]);

  useEffect(() => {
    if (!approvalMilestone) return;
    setApprovalError("");
    setApprovalSuccess(null);
    void fetch("/api/v1/wallet", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((wallet: { wallet?: { balance?: number } }) =>
        setApprovalWalletBalance(wallet.wallet?.balance ?? 0),
      )
      .catch(() => setApprovalWalletBalance(null));
  }, [approvalMilestone]);

  const action = async (
    key: string,
    payload: Record<string, unknown> = {},
    alreadyLocked = false,
  ) => {
    if (!alreadyLocked && actionInFlight.current) return;
    if (!alreadyLocked) actionInFlight.current = true;
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/portal/project-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: key, projectId: Number(projectId), ...payload }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Unable to update project.");
      setNote("");
      setFiles([]);
      setWorkTitle("");
      setWorkNote("");
      setWorkFiles([]);
      setWorkMilestoneId("auto");
      setShowProgress(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update project.");
    } finally {
      setBusy(null);
      if (!alreadyLocked) actionInFlight.current = false;
    }
  };
  const actionWithFiles = async (
    key: string,
    payload: Record<string, unknown> = {},
    selectedFiles = files,
  ) => {
    if (!selectedFiles.length) return setMessage("Choose at least one file.");
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setBusy(key);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("projectId", String(projectId));
      selectedFiles.forEach((file) => form.append("files", file));
      const response = await fetch("/api/v1/portal/project-files", { method: "POST", body: form });
      const result = (await response.json().catch(() => null)) as {
        attachments?: Attachment[];
        error?: string;
      } | null;
      if (!response.ok || !result?.attachments?.length)
        throw new Error(result?.error || "Unable to store the selected files.");
      await action(
        key,
        { ...payload, attachmentIds: result.attachments.map((file) => file.id) },
        true,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to store the selected files.");
      setBusy(null);
    } finally {
      actionInFlight.current = false;
    }
  };

  async function approveMilestoneWithPayment(milestoneId: number) {
    if (actionInFlight.current) return false;
    actionInFlight.current = true;
    setBusy("approve-milestone");
    try {
      const offlinePayment = data?.job?.paymentMethod === "OFFLINE";
      const response = await fetch(
        offlinePayment ? "/api/v1/portal/project-actions" : "/api/wallet/milestone",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            offlinePayment
              ? { action: "approve-milestone", projectId: Number(projectId), milestoneId }
              : { projectId: Number(projectId), milestoneId },
          ),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        charged?: number;
        professionalReceives?: number;
        adminReceives?: number;
        platformEarnings?: number;
        remainingBalance?: number;
      } | null;
      if (!response.ok) {
        setApprovalError(
          result?.error ??
            (offlinePayment
              ? "Unable to record offline payment."
              : "Unable to complete wallet payment."),
        );
        return false;
      }
      await refresh().catch(() => undefined);
      setApprovalWalletBalance(result?.remainingBalance ?? null);
      setApprovalSuccess({
        charged: result?.charged ?? 0,
        professionalReceives: result?.professionalReceives ?? 0,
        adminReceives: result?.adminReceives ?? 0,
        platformEarnings: result?.platformEarnings ?? 0,
        remainingBalance: result?.remainingBalance ?? 0,
      });
      return true;
    } finally {
      actionInFlight.current = false;
      setBusy(null);
    }
  }

  if (!data)
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl">
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
          <div className="mt-6 h-10 w-72 animate-pulse rounded-xl bg-muted" />
          <div className="mt-4 h-48 animate-pulse rounded-2xl bg-muted" />
          {message && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {message}
            </p>
          )}
        </div>
      </AppShell>
    );

  const client = name(data.client, "Client"),
    professional = name(data.professional, "Professional");
  const isClient = data.viewerRole === "CLIENT";
  const current = data.milestones.find((m) =>
    ["IN_PROGRESS", "REVISION_REQUESTED", "AWAITING_CLIENT_REVIEW"].includes(m.status),
  );
  const completed = data.milestones.filter((m) => m.status === "APPROVED").length;
  const remaining = data.job?.deadline
    ? Math.ceil((new Date(data.job.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const canFinal =
    data.milestones.length > 0 && data.milestones.every((m) => m.status === "APPROVED");
  const totalMilestoneValue = data.milestones.reduce(
    (total, milestone) => total + milestone.amount,
    0,
  );
  const remainingMilestoneAmount =
    data.agreedAmount == null ? null : Math.max(0, data.agreedAmount - totalMilestoneValue);
  const milestoneMinDate = dateInputValue(data.job?.jobDate);
  const milestoneMaxDate = dateInputValue(data.job?.deadline);
  const paidToProfessional = data.milestones.reduce(
    (total, milestone) =>
      total +
      (milestone.payment?.status === "COMPLETED"
        ? (milestone.payment.professionalPayoutAmount ?? 0)
        : 0),
    0,
  );
  const clientPaidMilestoneTotal = data.milestones.reduce(
    (total, milestone) =>
      total + (milestone.payment && milestone.payment.status !== "FAILED" ? milestone.amount : 0),
    0,
  );
  const remainingClientPayment = Math.max(0, totalMilestoneValue - clientPaidMilestoneTotal);
  const remainingProfessionalPayout = Math.max(
    0,
    data.milestones.reduce(
      (total, milestone) =>
        total +
        (milestone.payment?.professionalPayoutAmount ??
          Math.max(0, Math.ceil(milestone.amount * 0.9))),
      0,
    ) - paidToProfessional,
  );
  const unpaidMilestones = data.milestones.filter(
    (milestone) => !milestone.payment || milestone.payment.status === "FAILED",
  );
  const attachments = (event: Event): Attachment[] => {
    try {
      const parsed: unknown = JSON.parse(event.attachmentJson ?? "[]");
      return Array.isArray(parsed)
        ? parsed.filter(
            (value): value is Attachment =>
              typeof value === "object" &&
              value !== null &&
              typeof value.id === "number" &&
              typeof value.name === "string" &&
              typeof value.url === "string",
          )
        : [];
    } catch {
      return [];
    }
  };
  const uploadAttachments = (upload: Upload): Attachment[] => {
    try {
      const parsed: unknown = JSON.parse(upload.filesJson ?? "[]");
      return Array.isArray(parsed)
        ? parsed.filter(
            (value): value is Attachment =>
              typeof value === "object" &&
              value !== null &&
              typeof value.id === "number" &&
              typeof value.name === "string" &&
              typeof value.url === "string",
          )
        : [];
    } catch {
      return [];
    }
  };
  const submit = (milestoneId: number) => {
    if (!note.trim() || !files.length)
      return setMessage("Enter a completion note and choose at least one file.");
    void actionWithFiles("submit-milestone", { milestoneId, note });
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6">
        {message && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {message}
          </div>
        )}

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,var(--color-ink),var(--color-primary))] px-6 py-7 text-white shadow-card sm:px-8 sm:py-8">
          <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-cta/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65">
                <Sparkles className="h-3.5 w-3.5" /> Project tracking
              </p>
              <h1 className="mt-3 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {data.job?.title ?? `Project #${data.project.id}`}
              </h1>
              <p className="mt-2 text-sm text-white/75">
                {isClient ? `Professional: ${professional}` : `Client: ${client}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="h-fit border-white/25 bg-white/15 px-3 py-1.5 text-white hover:bg-white/15">
                {label(data.project.status)}
              </Badge>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs text-white/65">Overall progress</p>
                <p className="mt-1 text-xl font-bold">{data.project.progress}%</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-1.5">
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Milestones</span>
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Work Upload</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 shadow-soft">
              {isClient &&
              data.project.status !== "COMPLETED" &&
              data.project.status !== "AWAITING_PROFESSIONAL_CONFIRMATION" ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted p-4">
                  <div>
                    <p className="font-semibold">Ready to request project completion?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review the current project work and ask the professional to confirm
                      completion.
                    </p>
                  </div>
                  <Button
                    disabled={busy === "complete-project"}
                    onClick={() => setShowCompleteModal(true)}
                  >
                    Request completion confirmation
                  </Button>
                </div>
              ) : !isClient && data.project.status === "AWAITING_PROFESSIONAL_CONFIRMATION" ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
                  <div>
                    <p className="font-semibold text-amber-950">Client requested completion</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Confirm that the final work is complete to close this project.
                    </p>
                  </div>
                  <Button
                    disabled={busy === "confirm-project-completion"}
                    onClick={() => void action("confirm-project-completion")}
                  >
                    {busy === "confirm-project-completion" ? "Confirming…" : "Confirm completion"}
                  </Button>
                </div>
              ) : data.project.status === "AWAITING_PROFESSIONAL_CONFIRMATION" ? (
                <div className="rounded-2xl bg-muted p-4">
                  <p className="font-semibold">Waiting for professional confirmation</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The professional has been notified and must confirm before the project is
                    completed.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-muted p-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Overall progress</span>
                    <span className="text-primary">{data.project.progress}%</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-cta))] transition-all duration-700"
                      style={{ width: `${Math.min(Math.max(data.project.progress, 0), 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info icon={Clock3} label="Started" value={date(data.project.startedAt)} />
                <Info icon={CalendarDays} label="Deadline" value={date(data.job?.deadline)} />
                <Info
                  icon={AlertCircle}
                  label="Time remaining"
                  value={
                    remaining == null
                      ? "Not set"
                      : remaining < 0
                        ? `${Math.abs(remaining)} days overdue`
                        : `${remaining} days`
                  }
                  tone={remaining != null && remaining < 0 ? "text-destructive" : undefined}
                />
                <Info
                  icon={Wallet}
                  label="Project amount"
                  value={
                    data.agreedAmount == null
                      ? "Amount pending"
                      : `₹${data.agreedAmount.toLocaleString("en-IN")}`
                  }
                />
                <Info
                  icon={Wallet}
                  label="Total milestone value"
                  value={`₹${totalMilestoneValue.toLocaleString("en-IN")}`}
                />
                <Info
                  icon={CheckCircle2}
                  label="Paid to professional"
                  value={`₹${paidToProfessional.toLocaleString("en-IN")}`}
                />
                <Info
                  icon={AlertCircle}
                  label="Remaining to pay"
                  value={`₹${remainingProfessionalPayout.toLocaleString("en-IN")}`}
                  tone={remainingProfessionalPayout > 0 ? "text-amber-700" : "text-emerald-700"}
                />
              </div>
              {(data.job?.locationAddress ||
                (data.job?.locationLat !== null && data.job?.locationLng !== null)) && (
                <div className="mt-5 border-t border-border pt-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-base font-semibold">Project location</h2>
                      <p className="text-sm text-muted-foreground">
                        {isClient
                          ? "Where you asked the professional to work"
                          : "Exact address — visible now that you're hired"}
                      </p>
                    </div>
                  </div>
                  {data.job?.locationAddress && (
                    <p className="mt-2 text-sm font-medium">{data.job.locationAddress}</p>
                  )}
                  {data.job?.locationLat != null && data.job?.locationLng != null && (
                    <iframe
                      title="Project location"
                      className="mt-3 h-[220px] w-full rounded-2xl border border-border"
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${data.job.locationLat},${data.job.locationLng}&z=15&output=embed`}
                    />
                  )}
                </div>
              )}
            </section>

            <section
              className={`rounded-2xl border p-5 shadow-soft ${
                needsAction(data.project.status)
                  ? "border-amber-300/50 bg-amber-50/60"
                  : "border-primary/20 bg-primary/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    needsAction(data.project.status)
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {needsAction(data.project.status) ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      needsAction(data.project.status) ? "text-amber-700" : "text-primary"
                    }`}
                  >
                    {needsAction(data.project.status) ? "Action required" : "Current status"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {statusHeading(data.project.status, current?.title)}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {statusText(
                      data.project.status,
                      isClient,
                      client,
                      professional,
                      current?.title,
                      data.revisions[0]?.note,
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.viewerRole === "CLIENT" && data.project.status === "READY_TO_START" && (
                  <Button
                    disabled={busy === "start-work"}
                    onClick={() => void action("start-work")}
                  >
                    {busy === "start-work" ? "Starting…" : "Start Work"}
                  </Button>
                )}
                {!isClient && data.project.status === "IN_PROGRESS" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProgress(String(data.project.progress));
                      setStage(data.project.currentStage ?? "");
                      setShowProgress(true);
                    }}
                  >
                    Update Progress
                  </Button>
                )}
                {!isClient && data.project.status !== "COMPLETED" && (
                  <Button variant="outline" onClick={() => setShowRequestModal(true)}>
                    Request client
                  </Button>
                )}
              </div>
            </section>

            {isClient && data.project.status !== "COMPLETED" && (
              <section className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Add milestone</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add as many delivery checkpoints as this project needs. Set the amount for
                      each milestone when you create it.
                    </p>
                  </div>
                  <Button onClick={() => setShowMilestoneModal(true)}>Create milestone</Button>
                </div>
              </section>
            )}

            {showProgress && (
              <Form
                title="Update Progress"
                onCancel={() => setShowProgress(false)}
                onSubmit={() => {
                  const value = Number(progress);
                  if (
                    !Number.isInteger(value) ||
                    value < 0 ||
                    value > 100 ||
                    !stage.trim() ||
                    !note.trim()
                  )
                    return setMessage("Enter valid progress, stage, and update.");
                  void action("update-progress", { progress: value, stage, note });
                }}
                busy={busy === "update-progress"}
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  placeholder="Progress (%)"
                />
                <input
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="Current stage"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Work update"
                />
              </Form>
            )}

            {!isClient && canFinal && data.project.status === "IN_PROGRESS" && (
              <section className="rounded-2xl border bg-card p-5 shadow-soft">
                <h2 className="text-lg font-semibold">Final work</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  All milestones are approved. Submit final work for client approval.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <FilePicker inputId="final-work-files" files={files} setFiles={setFiles} />
                  <Button
                    onClick={() => {
                      const finalNote = prompt("Final work note")?.trim();
                      if (!finalNote || !files.length)
                        return setMessage("Enter a final note and choose files.");
                      void actionWithFiles("submit-final-work", {
                        note: finalNote,
                      });
                    }}
                  >
                    Submit Final Work
                  </Button>
                </div>
              </section>
            )}

            {data.project.status === "COMPLETED" && (
              <section
                id="project-feedback"
                className="scroll-mt-24 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Project completion
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">Project feedback</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tell us about your experience with {isClient ? professional : client}.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!data.dispute) setShowDisputeForm(true);
                      document.getElementById("project-dispute")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    Report issue / Raise dispute
                  </Button>
                </div>

                <div className="mt-5 rounded-xl border bg-card p-4 shadow-soft">
                  <p className="font-medium">
                    {isClient ? "Rate professional" : "View ratings & client reviews"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isClient
                      ? data.review
                        ? `Submitted: ${data.review.rating}/5`
                        : "Share your feedback and experience."
                      : data.review
                        ? `${data.review.rating}/5${data.review.comment ? ` · “${data.review.comment}”` : ""}`
                        : "The client has not left a review yet."}
                  </p>
                  {isClient && !data.review && (
                    <Button className="mt-4" size="sm" onClick={() => setShowReviewForm(true)}>
                      {isClient ? "Rate professional" : "Rate client"}
                    </Button>
                  )}
                  {!isClient && data.review && !data.review.professionalResponse && (
                    <Button
                      className="mt-4"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewResponseForm(true)}
                    >
                      Respond to review
                    </Button>
                  )}
                  {!isClient && data.review?.professionalResponse && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Your response: {data.review.professionalResponse}
                    </p>
                  )}
                </div>

                {showReviewForm && !data.review && (
                  <div className="mt-4 rounded-xl border bg-card p-4">
                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm font-medium">
                        Rating
                        <select
                          value={reviewRating}
                          onChange={(event) => setReviewRating(Number(event.target.value))}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {[5, 4, 3, 2, 1].map((value) => (
                            <option key={value} value={value}>
                              {value} / 5
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Review comment
                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Share what went well, or what could be improved."
                          className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewComment("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (!reviewRating) return;
                          void action("submit-review", {
                            rating: reviewRating,
                            comment: reviewComment.trim() || null,
                          });
                          setShowReviewForm(false);
                          setReviewComment("");
                        }}
                      >
                        Save rating & review
                      </Button>
                    </div>
                  </div>
                )}

                {showReviewResponseForm &&
                  !isClient &&
                  data.review &&
                  !data.review.professionalResponse && (
                    <div className="mt-4 rounded-xl border bg-card p-4">
                      <label className="grid gap-2 text-sm font-medium">
                        Response to client review
                        <textarea
                          value={reviewResponse}
                          onChange={(event) => setReviewResponse(event.target.value)}
                          placeholder="Thank the client or add helpful context."
                          className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewResponseForm(false);
                            setReviewResponse("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (!reviewResponse.trim()) return;
                            void action("respond-to-review", { response: reviewResponse.trim() });
                            setShowReviewResponseForm(false);
                            setReviewResponse("");
                          }}
                        >
                          Save response
                        </Button>
                      </div>
                    </div>
                  )}
              </section>
            )}

            {disputeEligibleStatuses.includes(data.project.status) && (
              <section
                id="project-dispute"
                className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-soft"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Report issue / Raise dispute</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.dispute
                        ? `${data.dispute.issueType} · ${data.dispute.status}`
                        : "Escalate any unresolved payment, quality, or delivery issue."}
                    </p>
                    {data.dispute && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Raised by{" "}
                        {(data.dispute.reporterRole === "CLIENT") === isClient
                          ? "you"
                          : data.dispute.reporterRole === "CLIENT"
                            ? "the client"
                            : "the professional"}
                      </p>
                    )}
                  </div>
                  {!data.dispute && data.project.status !== "COMPLETED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDisputeForm((value) => !value)}
                    >
                      {showDisputeForm
                        ? "Hide report / dispute form"
                        : "Report issue / Raise dispute"}
                    </Button>
                  )}
                </div>

                {showDisputeForm && !data.dispute && (
                  <div className="mt-4 rounded-xl border bg-card p-4">
                    <div className="grid gap-3">
                      <label className="grid gap-2 text-sm font-medium">
                        Issue type
                        <select
                          value={disputeType}
                          onChange={(event) => setDisputeType(event.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="PAYMENT">Payment</option>
                          <option value="QUALITY">Quality</option>
                          <option value="COMMUNICATION">Communication</option>
                          <option value="DELIVERY">Delivery</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Priority
                        <select
                          value={disputePriority}
                          onChange={(event) => setDisputePriority(event.target.value)}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        Message
                        <textarea
                          value={disputeMessage}
                          onChange={(event) => setDisputeMessage(event.target.value)}
                          placeholder="Describe the issue clearly and include any relevant context."
                          className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDisputeForm(false);
                          setDisputeMessage("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (!disputeMessage.trim()) return setMessage("Add a dispute message.");
                          void action("submit-dispute", {
                            issueType: disputeType,
                            priority: disputePriority,
                            message: disputeMessage.trim(),
                          });
                          setShowDisputeForm(false);
                          setDisputeMessage("");
                        }}
                      >
                        Raise dispute
                      </Button>
                    </div>
                  </div>
                )}
                {data.dispute && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium uppercase tracking-wide text-amber-800">
                      <span>Issue: {data.dispute.issueType.replaceAll("_", " ")}</span>
                      <span>Priority: {data.dispute.priority}</span>
                      <span>Status: {data.dispute.status}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-foreground">
                      {data.dispute.message}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Submitted {date(data.dispute.createdAt)}. The admin dispute team can review
                      this case.
                    </p>
                  </div>
                )}
              </section>
            )}
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <section className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Milestones</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {completed} of {data.milestones.length} completed
                  </span>
                  {isClient && data.project.status !== "COMPLETED" && (
                    <Button size="sm" onClick={() => setShowMilestoneModal(true)}>
                      Add milestone
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {data.milestones.map((milestone, index) => {
                  const filled = milestone?.status === "APPROVED";
                  const active =
                    milestone &&
                    ["IN_PROGRESS", "REVISION_REQUESTED", "AWAITING_CLIENT_REVIEW"].includes(
                      milestone.status,
                    );
                  return (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        filled
                          ? "bg-emerald-500"
                          : milestone?.status === "REVISION_REQUESTED"
                            ? "bg-red-500"
                            : active
                              ? "bg-amber-400"
                              : milestone
                                ? "bg-primary/40"
                                : "bg-muted"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="mt-5 space-y-3">
                {data.milestones.map((m) => {
                  const overdueDays = milestoneOverdueDays(m);
                  const milestoneUploads = data.uploads.filter(
                    (upload) => upload.milestoneId === m.id,
                  );
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border-l-4 bg-muted p-4 ${milestoneAccent(m.status)}`}
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-semibold">{m.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {m.description || "No description"} · ₹{m.amount.toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.dueDate
                              ? `Due ${new Date(m.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                              : "No due date set"}
                          </p>
                        </div>
                        <div className="flex h-fit flex-col items-end gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${milestoneStatusStyle(m.status)}`}
                          >
                            {label(m.status)}
                          </span>
                          {overdueDays !== null && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              {overdueDays} day{overdueDays === 1 ? "" : "s"} overdue
                            </span>
                          )}
                        </div>
                      </div>
                      {milestoneUploads.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {milestoneUploads.map((upload) => {
                            const uploadFiles = uploadAttachments(upload);
                            return (
                              <div
                                key={upload.id}
                                className="rounded-lg border border-border bg-background p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {upload.roundNumber > 1
                                      ? "Revised work submitted"
                                      : "Work submitted"}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    {date(upload.createdAt)}
                                  </span>
                                </div>
                                {upload.note && (
                                  <p className="mt-1.5 text-sm text-foreground">{upload.note}</p>
                                )}
                                {uploadFiles.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {uploadFiles.map((file) => (
                                      <Button key={file.id} size="sm" variant="outline" asChild>
                                        <a href={file.url} target="_blank" rel="noreferrer">
                                          {file.name}
                                        </a>
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {m.status === "REVISION_REQUESTED" && data.revisions[0] && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide">
                              Client requested changes
                            </p>
                            <span className="text-xs text-red-700/75">
                              {date(data.revisions[0].createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm">
                            {data.revisions[0].note ||
                              "Please review the requested changes and resubmit your work."}
                          </p>
                        </div>
                      )}
                      {!isClient && ["IN_PROGRESS", "REVISION_REQUESTED"].includes(m.status) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <FilePicker
                            inputId={`milestone-${m.id}-files`}
                            files={files}
                            setFiles={setFiles}
                          />
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Completion note"
                            className="min-h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                          />
                          <Button
                            disabled={busy === "submit-milestone"}
                            onClick={() => submit(m.id)}
                          >
                            Request payment
                          </Button>
                        </div>
                      )}
                      {isClient && m.status === "AWAITING_CLIENT_REVIEW" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            disabled={busy === "approve-milestone"}
                            onClick={() => setApprovalMilestone(m)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const feedback = prompt("Revision feedback")?.trim();
                              if (feedback)
                                void action("request-revision", {
                                  milestoneId: m.id,
                                  note: feedback,
                                });
                            }}
                          >
                            Request Revision
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {data.milestones.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    <Flag className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2">No milestones yet.</p>
                    {isClient && data.project.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowMilestoneModal(true)}
                      >
                        Add milestone
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* Work Upload Tab */}
          <TabsContent value="uploads" className="space-y-6">
            {!isClient && ["IN_PROGRESS", "REVISION_REQUESTED"].includes(data.project.status) && (
              <section className="rounded-2xl border bg-card p-5 shadow-soft">
                <div>
                  <h2 className="text-lg font-semibold">Upload Work</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share ongoing work and files with the client. This does not submit a milestone.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 [&_input]:rounded-md [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_select]:rounded-md [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2 [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2">
                  <input
                    value={workTitle}
                    onChange={(e) => setWorkTitle(e.target.value)}
                    placeholder="Work title (for example, Homepage Design)"
                  />
                  <textarea
                    value={workNote}
                    onChange={(e) => setWorkNote(e.target.value)}
                    placeholder="Work update / description"
                  />
                  <label className="grid gap-1 text-sm font-medium">
                    Related milestone{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                    <select
                      value={workMilestoneId}
                      onChange={(e) => setWorkMilestoneId(e.target.value)}
                    >
                      <option value="auto">
                        {current ? `Current milestone: ${current.title}` : "No current milestone"}
                      </option>
                      <option value="none">No related milestone</option>
                      {data.milestones
                        .filter((milestone) =>
                          ["IN_PROGRESS", "REVISION_REQUESTED"].includes(milestone.status),
                        )
                        .map((milestone) => (
                          <option key={milestone.id} value={milestone.id}>
                            {milestone.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  <FilePicker
                    inputId="work-upload-files"
                    files={workFiles}
                    setFiles={setWorkFiles}
                  />
                </div>
                <div className="mt-4">
                  <Button
                    disabled={busy === "upload-work"}
                    onClick={() => {
                      if (!workTitle.trim() || !workFiles.length)
                        return setMessage("Enter a work title and choose at least one file.");
                      void actionWithFiles(
                        "upload-work",
                        {
                          milestoneId:
                            workMilestoneId === "auto"
                              ? (current?.id ?? null)
                              : workMilestoneId === "none"
                                ? null
                                : Number(workMilestoneId),
                          title: workTitle,
                          note: workNote || null,
                        },
                        workFiles,
                      );
                    }}
                  >
                    {busy === "upload-work" ? "Uploading…" : "Upload Work"}
                  </Button>
                </div>
              </section>
            )}
            <section className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Work uploads</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uploaded work files are available for preview and download by both sides.
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {data.uploads.length} upload{data.uploads.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {data.uploads.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2">No work uploads yet.</p>
                  </div>
                ) : (
                  data.uploads.map((upload) => {
                    const files = uploadAttachments(upload);
                    return (
                      <div key={upload.id} className="rounded-xl border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{upload.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {upload.note || "No description."} ·{" "}
                              {upload.roundNumber > 1 ? "Revision" : "Work"}
                            </p>
                          </div>
                          <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {upload.roundNumber > 1 ? "Revision" : "Upload"}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {files.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No files available.</p>
                          ) : (
                            files.map((file) => (
                              <div
                                key={file.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {file.mimeType ?? "File"} · {formatFileSize(file.sizeBytes)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={file.url} target="_blank" rel="noreferrer">
                                      Preview
                                    </a>
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={file.url} download={file.name}>
                                      Download
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <section className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="text-xl font-semibold">Project timeline</h2>
              <ol className="mt-5 space-y-5 border-l border-primary/30 pl-6">
                {data.timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      className={`absolute -left-[1.95rem] top-1 size-3 rounded-full ring-4 ring-card ${
                        event.actorRole === "CLIENT" ? "bg-cta" : "bg-primary"
                      }`}
                    />
                    <p className="font-semibold">
                      {event.title}
                      {event.progress != null ? ` — ${event.progress}%` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                    {event.stage && <p className="mt-1 text-sm">Stage: {event.stage}</p>}
                    {attachments(event).length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {attachments(event).map((file) => (
                          <li key={file.id} className="flex flex-wrap items-center gap-2">
                            <span>{file.name}</span>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              View
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {event.actorRole === "CLIENT" ? client : professional} ·{" "}
                      {event.actorRole === "CLIENT" ? "Client" : "Professional"} ·{" "}
                      {date(event.createdAt)}
                    </p>
                  </li>
                ))}
                {data.timeline.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                )}
              </ol>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request action from client</DialogTitle>
            <DialogDescription>
              Ask the client to review details, share files, or respond with additional information.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Request subject
              <input
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="What do you need from the client?"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Request details
              <textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder="Write a clear request for the client."
                className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <DialogFooter className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy === "request-client" || !requestMessage.trim()}
              onClick={() => {
                void action("request-client", {
                  title: requestTitle || undefined,
                  note: requestMessage,
                });
                setShowRequestModal(false);
              }}
            >
              {busy === "request-client" ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete project?</DialogTitle>
            <DialogDescription>
              Review the current project work and request completion. Any unpaid milestone amount
              will remain visible for the professional to review before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-amber-800/70">Milestone total</p>
                <p className="font-semibold">INR {totalMilestoneValue.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-amber-800/70">Paid by client</p>
                <p className="font-semibold">₹{clientPaidMilestoneTotal.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-amber-800/70">Paid to professional</p>
                <p className="font-semibold">₹{paidToProfessional.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-amber-800/70">Unpaid milestones</p>
                <p className="font-semibold">₹{remainingClientPayment.toLocaleString("en-IN")}</p>
              </div>
            </div>
            {unpaidMilestones.length > 0 ? (
              <div className="mt-3 border-t border-amber-200 pt-3">
                Unpaid milestones:
                <ul className="mt-1 list-disc pl-5">
                  {unpaidMilestones.map((milestone) => (
                    <li key={milestone.id}>
                      {milestone.title} — ₹{milestone.amount.toLocaleString("en-IN")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 border-t border-amber-200 pt-3 text-emerald-700">
                All milestones are funded by the client.
              </p>
            )}
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy === "complete-project"}
              onClick={() => {
                setShowCompleteModal(false);
                void action("complete-project");
              }}
            >
              {busy === "complete-project"
                ? "Completing…"
                : remainingClientPayment > 0
                  ? "Request with remaining amount"
                  : "Request confirmation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={approvalMilestone !== null}
        onOpenChange={(open) => {
          if (!open) setApprovalMilestone(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {data.job?.paymentMethod === "OFFLINE"
                ? "Confirm offline payment"
                : "Approve milestone payment"}
            </DialogTitle>
            <DialogDescription>
              {data.job?.paymentMethod === "OFFLINE"
                ? "Confirm that you paid the professional directly for this milestone."
                : "Review the wallet payment breakdown before approving this milestone."}
            </DialogDescription>
          </DialogHeader>
          {approvalMilestone ? (
            <div className="mt-4 space-y-3">
              {(() => {
                const offlinePayment = data.job?.paymentMethod === "OFFLINE";
                const clientFee = offlinePayment ? 0 : Math.ceil(approvalMilestone.amount * 0.1);
                const clientCharge = offlinePayment
                  ? approvalMilestone.amount
                  : approvalMilestone.amount + clientFee;
                const professionalPayout = offlinePayment
                  ? approvalMilestone.amount
                  : Math.max(0, approvalMilestone.amount - clientFee);
                return (
                  <>
                    {approvalSuccess ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl bg-success/10 p-4">
                          <p className="text-sm font-semibold text-success">Payment completed</p>
                          <p className="mt-1 text-2xl font-bold">
                            ₹{approvalSuccess.charged.toLocaleString("en-IN")} charged
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {offlinePayment
                              ? "Offline payment recorded. The professional was marked as paid."
                              : "Client payment received. Professional payout is waiting for admin approval."}
                          </p>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-border p-4 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Professional payout pending
                            </span>
                            <span className="font-semibold text-success">
                              ₹{approvalSuccess.professionalReceives.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              {offlinePayment ? "Platform earnings" : "Admin wallet receives"}
                            </span>
                            <span className="font-semibold">
                              ₹{approvalSuccess.adminReceives.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              Platform earnings after payout
                            </span>
                            <span className="font-semibold">
                              ₹{approvalSuccess.platformEarnings.toLocaleString("en-IN")}
                            </span>
                          </div>
                          {!offlinePayment && (
                            <div className="flex justify-between gap-4 border-t border-border pt-3">
                              <span className="font-semibold">Wallet balance after payment</span>
                              <span className="font-bold text-primary">
                                ₹{approvalSuccess.remainingBalance.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                        </div>
                        <DialogFooter className="pt-2">
                          <Button onClick={() => setApprovalMilestone(null)}>Done</Button>
                        </DialogFooter>
                      </div>
                    ) : null}
                    {!approvalSuccess ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl bg-primary/5 p-4">
                          <p className="text-sm text-muted-foreground">{approvalMilestone.title}</p>
                          <p className="mt-1 text-2xl font-bold">
                            ₹{approvalMilestone.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">Milestone value</p>
                        </div>
                        <div className="space-y-3 rounded-2xl border border-border p-4 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Milestone amount</span>
                            <span className="font-semibold">
                              ₹{approvalMilestone.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                              {offlinePayment ? "Payment method" : "Client wallet fee (10%)"}
                            </span>
                            <span className="font-semibold">
                              +₹{clientFee.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-border pt-3">
                            <span className="font-semibold">
                              {offlinePayment ? "Amount paid offline" : "Client wallet debit"}
                            </span>
                            <span className="font-bold text-primary">
                              ₹{clientCharge.toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Professional receives</span>
                            <span className="font-semibold text-success">
                              ₹{professionalPayout.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        {offlinePayment ? null : (
                          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                            Approval will debit ₹{clientCharge.toLocaleString("en-IN")} from your
                            wallet. Make sure your wallet has enough balance.
                          </p>
                        )}
                        {!offlinePayment && (
                          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Current wallet balance</span>
                            <span
                              className={`font-bold ${approvalWalletBalance !== null && approvalWalletBalance < clientCharge ? "text-destructive" : "text-success"}`}
                            >
                              {approvalWalletBalance === null
                                ? "Loading…"
                                : `₹${approvalWalletBalance.toLocaleString("en-IN")}`}
                            </span>
                          </div>
                        )}
                        {approvalError ? (
                          <p className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
                            {approvalError}
                          </p>
                        ) : null}
                        <DialogFooter className="pt-2">
                          <Button variant="outline" onClick={() => setApprovalMilestone(null)}>
                            Cancel
                          </Button>
                          <Button
                            disabled={
                              busy === "approve-milestone" ||
                              (!offlinePayment &&
                                approvalWalletBalance !== null &&
                                approvalWalletBalance < clientCharge)
                            }
                            onClick={async () => {
                              await approveMilestoneWithPayment(approvalMilestone.id);
                            }}
                          >
                            {busy === "approve-milestone" ? "Processing…" : "Approve & pay"}
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showMilestoneModal} onOpenChange={setShowMilestoneModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create milestone</DialogTitle>
            <DialogDescription>
              Add a milestone name, amount, note, and date for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Milestone name
              <input
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                placeholder="Milestone name"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Amount
              <input
                type="number"
                min="0"
                max={remainingMilestoneAmount ?? undefined}
                value={milestoneAmount}
                onChange={(event) => setMilestoneAmount(Number(event.target.value) || "")}
                placeholder="Amount"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              {remainingMilestoneAmount != null && (
                <span className="text-xs text-muted-foreground">
                  Remaining project amount: ₹{remainingMilestoneAmount.toLocaleString("en-IN")}
                </span>
              )}
              {remainingMilestoneAmount != null &&
                Number(milestoneAmount) > remainingMilestoneAmount && (
                  <span className="text-xs text-destructive">
                    This milestone exceeds the remaining project amount.
                  </span>
                )}
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Note
              <textarea
                value={milestoneNote}
                onChange={(event) => setMilestoneNote(event.target.value)}
                placeholder="Optional note"
                className="min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Due date
              <input
                type="date"
                value={milestoneDate}
                min={milestoneMinDate}
                max={milestoneMaxDate}
                onChange={(event) => setMilestoneDate(event.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <DialogFooter className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowMilestoneModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                busy === "create-milestone" ||
                !milestoneTitle.trim() ||
                !milestoneAmount ||
                (remainingMilestoneAmount != null &&
                  Number(milestoneAmount) > remainingMilestoneAmount)
              }
              onClick={async () => {
                if (!milestoneTitle.trim() || !milestoneAmount) return;
                await action("create-milestone", {
                  title: milestoneTitle.trim(),
                  amount: Number(milestoneAmount),
                  description: milestoneNote.trim() || null,
                  deadline: milestoneDate ? new Date(milestoneDate).toISOString() : null,
                });
                setShowMilestoneModal(false);
                setMilestoneTitle("");
                setMilestoneAmount("");
                setMilestoneNote("");
                setMilestoneDate("");
              }}
            >
              {busy === "create-milestone" ? "Creating…" : "Create milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-0.5 truncate font-medium ${tone ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}
function FilePicker({
  inputId,
  files,
  setFiles,
}: {
  inputId: string;
  files: File[];
  setFiles: (files: File[]) => void;
}) {
  const addFiles = (selected: File[]) => setFiles([...files, ...selected].slice(0, 10));
  return (
    <div
      className="rounded-xl border border-dashed bg-muted/30 p-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.txt"
        className="sr-only"
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        Choose Files
      </label>
      <span className="ml-2 text-xs text-muted-foreground">or drag and drop files here</span>
      <p className="mt-2 text-xs text-muted-foreground">
        Images, PDFs, Word, or text files (15 MB each).
      </p>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="text-xs font-medium text-destructive hover:underline"
                onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
function Form({
  title,
  children,
  onSubmit,
  onCancel,
  busy,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 [&_input]:rounded-md [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2">
        {children}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={busy} onClick={onSubmit}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
function statusHeading(status: string, milestone?: string) {
  if (status === "READY_TO_START") return "Ready to Start";
  if (status === "AWAITING_CLIENT_REVIEW") return `${milestone ?? "Milestone"} submitted`;
  if (status === "REVISION_REQUESTED") return "Revision Requested";
  if (status === "FINAL_WORK_SUBMITTED") return "Final Work Submitted";
  if (status === "AWAITING_PROFESSIONAL_CONFIRMATION") return "Awaiting Professional Confirmation";
  return label(status);
}
function statusText(
  status: string,
  isClient: boolean,
  client: string,
  professional: string,
  milestone?: string,
  feedback?: string | null,
) {
  if (status === "READY_TO_START")
    return isClient
      ? `${professional} accepted your project. Start work when you are ready.`
      : "The client has hired you. Waiting for the client to start work.";
  if (status === "AWAITING_CLIENT_REVIEW")
    return isClient
      ? `${professional} submitted ${milestone ?? "work"} for your review.`
      : "Your milestone was submitted successfully. Waiting for client review.";
  if (status === "REVISION_REQUESTED")
    return isClient
      ? "Revision has been requested. Waiting for updated work."
      : `Client feedback: ${feedback ?? "Please review the requested changes."}`;
  if (status === "FINAL_WORK_SUBMITTED")
    return isClient
      ? `${professional} submitted final work for approval.`
      : "Final work was submitted. Waiting for client approval.";
  if (status === "AWAITING_PROFESSIONAL_CONFIRMATION")
    return isClient
      ? `${professional} has been notified and must confirm project completion.`
      : "The client requested completion confirmation. Please review and confirm the project.";
  if (status === "COMPLETED") return "This project has been completed.";
  return isClient
    ? `${professional} is working on this project.`
    : `You are working on ${milestone ?? "this project"}.`;
}
