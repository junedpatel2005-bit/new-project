"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  job: { title: string | null; deadline: string | null; budgetMax: number | null } | null;
  professional: Person;
  client: Person;
  viewerRole: "CLIENT" | "PROFESSIONAL";
  milestones: Milestone[];
  uploads: Upload[];
  revisions: { note: string | null; createdAt: string }[];
  timeline: Event[];
  agreedAmount: number | null;
};

const name = (p: Person, fallback: string) => (p ? `${p.firstName} ${p.lastName}` : fallback);
const label = (status: string) =>
  ({
    READY_TO_START: "Ready to Start",
    IN_PROGRESS: "In Progress",
    AWAITING_CLIENT_REVIEW: "Awaiting Client Review",
    REVISION_REQUESTED: "Revision Requested",
    FINAL_WORK_SUBMITTED: "Final Work Submitted",
    COMPLETED: "Completed",
  })[status] ?? status.replaceAll("_", " ");
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "Not started yet";
function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState<number | "">("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const actionInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/portal/project?id=${encodeURIComponent(projectId)}`, {
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
      const response = await fetch("/api/portal/project-actions", {
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
      const response = await fetch("/api/portal/project-files", { method: "POST", body: form });
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

  // This effect must run on every render. Keeping it below the loading return
  // changes the hook order as soon as project data arrives, which crashes the
  // production build with React error #310.
  const defaultMilestoneAmount = data
    ? (data.agreedAmount ?? data.job?.budgetMax ?? 0)
      ? Math.floor((data.agreedAmount ?? data.job?.budgetMax ?? 0) / 5)
      : 0
    : 0;
  useEffect(() => {
    if (showMilestoneModal && milestoneAmount === "") {
      setMilestoneAmount(defaultMilestoneAmount || "");
    }
  }, [showMilestoneModal, milestoneAmount, defaultMilestoneAmount]);

  if (!data)
    return (
      <AppShell>
        <div className="rounded-2xl border bg-card p-6">
          {message ?? "Loading project tracking…"}
        </div>
      </AppShell>
    );

  const client = name(data.client, "Client"),
    professional = name(data.professional, "Professional");
  const isClient = data.viewerRole === "CLIENT";
  const current = data.milestones.find((m) =>
    ["IN_PROGRESS", "REVISION_REQUESTED", "AWAITING_CLIENT_REVIEW"].includes(m.status),
  );
  const totalBudget = data.agreedAmount ?? data.job?.budgetMax ?? 0;
  const completed = data.milestones.filter((m) => m.status === "APPROVED").length;
  const remaining = data.job?.deadline
    ? Math.ceil((new Date(data.job.deadline).getTime() - Date.now()) / 86400000)
    : null;
  const canFinal =
    data.milestones.length === 5 && data.milestones.every((m) => m.status === "APPROVED");
  const lastActivity = data.timeline[0]?.createdAt ?? data.project.acceptedAt;
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
        <Link
          href={isClient ? "/my-jobs" : "/professional/my-jobs?tab=active"}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to projects
        </Link>
        {message && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {message}
          </div>
        )}
        <section className="rounded-3xl border bg-card p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Project tracking</p>
              <h1 className="mt-1 text-3xl font-semibold">
                {data.job?.title ?? `Project #${data.project.id}`}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isClient ? `Professional: ${professional}` : `Client: ${client}`}
              </p>
            </div>
            <Badge className="h-fit px-3 py-1.5">{label(data.project.status)}</Badge>
          </div>
          <div className="mt-6 rounded-2xl bg-muted p-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Overall progress</span>
              <span>{data.project.progress}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
              <div className="h-full bg-primary" style={{ width: `${data.project.progress}%` }} />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Started" value={date(data.project.startedAt)} />
            <Info label="Deadline" value={date(data.job?.deadline)} />
            <Info
              label="Time remaining"
              value={
                remaining == null
                  ? "Not set"
                  : remaining < 0
                    ? `${Math.abs(remaining)} days overdue`
                    : `${remaining} days`
              }
            />
            <Info
              label="Current stage"
              value={data.project.currentStage ?? current?.title ?? "Not specified"}
            />
            <Info label="Current milestone" value={current?.title ?? "No active milestone"} />
            <Info label="Last activity" value={date(lastActivity)} />
          </div>
        </section>
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {data.project.status === "REVISION_REQUESTED" ||
            data.project.status === "AWAITING_CLIENT_REVIEW" ||
            data.project.status === "FINAL_WORK_SUBMITTED"
              ? "Action required"
              : "Current status"}
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
          <div className="mt-4 flex flex-wrap gap-2">
            {!isClient && data.project.status === "READY_TO_START" && (
              <Button disabled={busy === "start-work"} onClick={() => void action("start-work")}>
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
            {isClient && data.project.status === "FINAL_WORK_SUBMITTED" && (
              <Button
                disabled={busy === "complete-project"}
                onClick={() => {
                  if (confirm("Approve final work and complete this project?"))
                    void action("complete-project");
                }}
              >
                Approve & Complete
              </Button>
            )}
          </div>
        </section>
        {isClient && data.project.status !== "COMPLETED" && data.milestones.length < 5 && (
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Add milestone</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the remaining milestones for this project. The project budget will be
                  divided into 5 equal milestone amounts.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {5 - data.milestones.length} milestone{5 - data.milestones.length === 1 ? "" : "s"} remaining.
                </p>
              </div>
              <Button onClick={() => setShowMilestoneModal(true)}>
                Create milestone ({5 - data.milestones.length} remaining)
              </Button>
            </div>
          </section>
        )}
        <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request action from client</DialogTitle>
              <DialogDescription>
                Ask the client to review details, share files, or respond with additional
                information.
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
                  value={milestoneAmount}
                  onChange={(event) => setMilestoneAmount(Number(event.target.value) || "")}
                  placeholder={totalBudget > 0 ? `${defaultMilestoneAmount}` : "Amount"}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
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
                disabled={busy === "create-milestone" || !milestoneTitle.trim() || !milestoneAmount}
                onClick={async () => {
                  if (!milestoneTitle.trim() || !milestoneAmount) return;
                  await action("create-milestone", {
                    title: milestoneTitle.trim(),
                    amount: Number(milestoneAmount) || defaultMilestoneAmount,
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
        {!isClient && ["IN_PROGRESS", "REVISION_REQUESTED"].includes(data.project.status) && (
          <section className="rounded-2xl border bg-card p-5">
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
              <FilePicker inputId="work-upload-files" files={workFiles} setFiles={setWorkFiles} />
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
        <section className="rounded-2xl border bg-card p-5">
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
              <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                No work uploads yet.
              </p>
            ) : (
              data.uploads.map((upload) => {
                const files = uploadAttachments(upload);
                return (
                  <div key={upload.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{upload.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {upload.note || "No description."} · {upload.roundNumber > 1 ? "Revision" : "Work"}
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
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Milestones</h2>
            <span className="text-sm text-muted-foreground">
              {completed} of {data.milestones.length} completed
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {data.milestones.map((m) => (
              <div key={m.id} className="rounded-xl bg-muted p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.description || "No description"} · ${m.amount.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{label(m.status)}</Badge>
                </div>
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
                    <Button disabled={busy === "submit-milestone"} onClick={() => submit(m.id)}>
                      Request payment
                    </Button>
                  </div>
                )}
                {isClient && m.status === "AWAITING_CLIENT_REVIEW" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      disabled={busy === "approve-milestone"}
                      onClick={() => {
                        if (confirm(`Approve ${m.title}?`))
                          void action("approve-milestone", { milestoneId: m.id });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const feedback = prompt("Revision feedback")?.trim();
                        if (feedback)
                          void action("request-revision", { milestoneId: m.id, note: feedback });
                      }}
                    >
                      Request Revision
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        {!isClient && canFinal && data.project.status === "IN_PROGRESS" && (
          <section className="rounded-2xl border bg-card p-5">
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
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Project timeline</h2>
          <ol className="mt-5 space-y-5 border-l border-primary/30 pl-6">
            {data.timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[1.95rem] top-1 size-3 rounded-full bg-primary" />
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
          </ol>
        </section>
      </main>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
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
    <section className="rounded-2xl border bg-card p-5">
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
      ? `${professional} accepted your project. Waiting for the professional to begin work.`
      : "The client has hired you and the project is ready to begin.";
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
  if (status === "COMPLETED") return "This project has been completed.";
  return isClient
    ? `${professional} is working on this project.`
    : `You are working on ${milestone ?? "this project"}.`;
}
