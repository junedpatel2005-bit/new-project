"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
type Project = { id: number; status: string; createdAt: string; acceptedAt: string };
type Milestone = {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  dueDate: string | null;
  status: string;
};
export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<{ project: Project; milestones: Milestone[] } | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "missing">("loading");
  useEffect(() => {
    void fetch(`/api/portal/project?id=${encodeURIComponent(projectId)}`)
      .then(async (response) => {
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) throw new Error("Unable to load project");
        setData((await response.json()) as { project: Project; milestones: Milestone[] });
        setStatus("loading");
      })
      .catch(() => setStatus("error"));
  }, [projectId]);
  if (!data && status === "loading")
    return (
      <AppShell>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  if (status === "missing")
    return (
      <AppShell>
        <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
          This project was not found or you do not have access.
        </p>
      </AppShell>
    );
  if (status === "error" || !data)
    return (
      <AppShell>
        <p className="rounded-2xl border border-destructive/30 p-6 text-destructive">
          The project could not be loaded.
        </p>
      </AppShell>
    );
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Project #{data.project.id}</h1>
      <p className="mt-1 text-muted-foreground">Status: {data.project.status}</p>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Milestones</h2>
        {data.milestones.length ? (
          <ul className="mt-4 divide-y">
            {data.milestones.map((milestone) => (
              <li key={milestone.id} className="py-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{milestone.title}</p>
                    {milestone.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
                    )}
                  </div>
                  <p className="font-semibold">${milestone.amount.toLocaleString()}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {milestone.status}
                  {milestone.dueDate
                    ? ` · due ${new Date(milestone.dueDate).toLocaleDateString()}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No milestones have been created yet.</p>
        )}
      </section>
    </AppShell>
  );
}
