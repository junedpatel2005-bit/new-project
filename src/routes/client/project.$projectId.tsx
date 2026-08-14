"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

type Person = { firstName: string; lastName: string } | null;
type ProjectData = {
  project: { id: number; status: string; createdAt: string; acceptedAt: string };
  job: { title: string | null; deadline: string | null } | null;
  professional: Person;
  client: Person;
  viewerRole: "CLIENT" | "PROFESSIONAL";
  milestones: {
    id: number;
    title: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  uploads: {
    id: number;
    title: string;
    fileUrl: string | null;
    roundNumber: number;
    createdAt: string;
  }[];
  revisions: { id: number; note: string | null; createdAt: string }[];
};
type TimelineEvent = {
  title: string;
  description: string;
  actor: string;
  role: "Client" | "Professional";
  date: string;
  progress?: number;
  stage?: string;
  fileUrl?: string | null;
  needsReview?: boolean;
  milestoneId?: number;
};

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<ProjectData | null>(null);
  const [state, setState] = useState<"loading" | "error" | "missing">("loading");
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/v1/portal/project?id=${encodeURIComponent(projectId)}`);
    if (!response.ok) throw new Error("Unable to refresh the project.");
    setData((await response.json()) as ProjectData);
  }

  async function clientAction(payload: Record<string, unknown>) {
    const response = await fetch("/api/v1/portal/project-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, projectId: Number(projectId) }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || "Unable to update the project.");
    await refresh();
  }

  useEffect(() => {
    void fetch(`/api/v1/portal/project?id=${encodeURIComponent(projectId)}`)
      .then(async (response) => {
        if (response.status === 404) return setState("missing");
        if (!response.ok) throw new Error();
        setData((await response.json()) as ProjectData);
      })
      .catch(() => setState("error"));
  }, [projectId]);

  if (!data) {
    return (
      <AppShell>
        <div className="rounded-2xl border bg-card p-6 text-muted-foreground">
          {state === "loading"
            ? "Loading project tracking…"
            : state === "missing"
              ? "This project was not found or you do not have access."
              : "The project could not be loaded."}
        </div>
      </AppShell>
    );
  }

  const professionalName = personName(data.professional, "Professional");
  const clientName = personName(data.client, "Client");
  const isClient = data.viewerRole === "CLIENT";
  const progress = calculateProgress(data);
  const currentStage = data.revisions.length
    ? "Revision requested"
    : data.uploads.length
      ? "Work review"
      : "Work in progress";
  const nextAction = isClient
    ? data.revisions.length
      ? "Review the revised work when it is submitted."
      : data.uploads.length
        ? "Review the uploaded work and approve it or request a revision."
        : "Wait for the professional’s progress update."
    : data.revisions.length
      ? "Make the requested changes and submit the revised work."
      : "Update progress, upload your work, or submit the current milestone.";
  const timeline = makeTimeline(data, professionalName, clientName, progress);

  return (
    <AppShell>
      <section className="rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Project tracking</p>
            <h1 className="mt-1 text-3xl font-semibold">
              {data.job?.title ?? `Project #${data.project.id}`}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isClient ? `Professional: ${professionalName}` : `Client: ${clientName}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {data.project.status.replaceAll("_", " ")}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/project/${projectId}/tracking`}
                className="inline-flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Track Project
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Project status" value={data.project.status.replaceAll("_", " ")} />
          <Info label="Started date" value={dateOnly(data.project.acceptedAt)} />
          <Info label="Deadline" value={dateOnly(data.job?.deadline)} />
          <Info label="Current stage" value={currentStage} />
        </div>
        <div className="mt-5 rounded-2xl bg-muted p-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-medium">Overall progress</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {isClient && (
        <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Current status / next action
          </p>
          <h2 className="mt-1 text-lg font-semibold">{currentStage}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{nextAction}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Project timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every milestone, work update, review, and project decision is recorded here.
        </p>
        <div className="mt-6 space-y-6 border-l border-primary/30 pl-6">
          {timeline.map((event, index) => (
            <TimelineItem
              key={`${event.title}-${event.date}-${index}`}
              event={event}
              clientCanReview={isClient}
              onApprove={async () => {
                if (!event.milestoneId) return;
                try {
                  await clientAction({
                    action: "complete-milestone",
                    milestoneId: event.milestoneId,
                  });
                } catch (error) {
                  window.alert(
                    error instanceof Error ? error.message : "Unable to approve the milestone.",
                  );
                }
              }}
              onRequestRevision={async () => {
                const note = window.prompt("Describe the revision needed");
                if (!note) return;
                try {
                  await clientAction({ action: "request-revision", note });
                } catch (error) {
                  window.alert(
                    error instanceof Error ? error.message : "Unable to request revision.",
                  );
                }
              }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function makeTimeline(
  data: ProjectData,
  professional: string,
  client: string,
  progress: number,
): TimelineEvent[] {
  return [
    {
      title: "Project created",
      description: `${client} created this project.`,
      actor: client,
      role: "Client" as const,
      date: data.project.createdAt,
      progress: 0,
      stage: "Project setup",
    },
    {
      title: "Offer accepted",
      description: `${professional} accepted the hire request.`,
      actor: professional,
      role: "Professional" as const,
      date: data.project.acceptedAt,
      progress: 0,
      stage: "Project setup",
    },
    {
      title: "Work started",
      description: `${professional} can now begin work on this project.`,
      actor: professional,
      role: "Professional" as const,
      date: data.project.acceptedAt,
      progress: 0,
      stage: "Work in progress",
    },
    ...data.milestones.flatMap((item) => {
      const events: TimelineEvent[] = [
        {
          title: "Milestone created",
          description: `Milestone “${item.title}” was created.`,
          actor: client,
          role: "Client",
          date: item.createdAt,
          stage: item.title,
        },
      ];
      if (item.status === "APPROVED") {
        events.push({
          title: "Milestone approved",
          description: `${client} approved the milestone “${item.title}”.`,
          actor: client,
          role: "Client",
          date: item.updatedAt,
          stage: item.title,
        });
      }
      return events;
    }),
    ...data.uploads.map((item) => ({
      title: item.roundNumber > 1 ? "Revised work submitted" : "Work uploaded",
      description: `${professional} uploaded “${item.title}”.`,
      actor: professional,
      role: "Professional" as const,
      date: item.createdAt,
      progress,
      stage: "Work review",
      fileUrl: item.fileUrl,
      needsReview: true,
      milestoneId: data.milestones.find((milestone) => milestone.status !== "APPROVED")?.id,
    })),
    ...data.revisions.map((item) => ({
      title: "Revision requested",
      description: item.note || `${client} requested changes to the submitted work.`,
      actor: client,
      role: "Client" as const,
      date: item.createdAt,
      stage: "Revision requested",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function TimelineItem({
  event,
  clientCanReview,
  onApprove,
  onRequestRevision,
}: {
  event: TimelineEvent;
  clientCanReview: boolean;
  onApprove: () => void;
  onRequestRevision: () => void;
}) {
  return (
    <div className="relative">
      <span className="absolute -left-[1.95rem] top-1.5 size-3 rounded-full border-2 border-card bg-primary" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{event.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
        </div>
        {event.progress != null && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
            {event.progress}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {event.actor} · {event.role} · {new Date(event.date).toLocaleString()}
        {event.stage ? ` · ${event.stage}` : ""}
      </p>
      {event.fileUrl && (
        <Button className="mt-3" size="sm" variant="outline" asChild>
          <a href={event.fileUrl} target="_blank">
            View file
          </a>
        </Button>
      )}
      {clientCanReview && event.needsReview && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} disabled={!event.milestoneId}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onRequestRevision}>
            Request revision
          </Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}
function personName(person: Person, fallback: string) {
  return person ? `${person.firstName} ${person.lastName}` : fallback;
}
function dateOnly(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}
function calculateProgress(data: ProjectData) {
  return data.project.status === "COMPLETED"
    ? 100
    : data.uploads.length
      ? 60
      : data.milestones.length
        ? 25
        : 10;
}
