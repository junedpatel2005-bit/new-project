"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
type Job = {
  id: number;
  title: string | null;
  status: "DRAFT" | "OPEN" | "RUNNING" | "CLOSED";
  projectId: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: string;
  locationAddress: string | null;
  updatedAt: string;
  createdAt: string;
};
const usd = (v: number | null) => (v == null ? "Not set" : `$${v.toLocaleString("en-US")}`);
function jobStatus(job: Job) {
  return job.projectId ? "RUNNING" : job.status;
}
export default function MyJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]),
    [status, setStatus] = useState<"ALL" | Job["status"]>("ALL"),
    [message, setMessage] = useState("");
  const load = () =>
    void fetch("/api/client/jobs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setJobs(d.jobs))
      .catch(() => setMessage("Your jobs could not be loaded."));
  useEffect(load, []);
  const visible = status === "ALL" ? jobs : jobs.filter((j) => jobStatus(j) === status);
  async function remove(id: number) {
    if (!confirm("Delete this draft permanently?")) return;
    const r = await fetch(`/api/client/jobs/${id}`, { method: "DELETE" });
    if (r.ok) load();
    else setMessage("The draft could not be deleted.");
  }
  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Create, continue, and manage your job postings.
          </p>
        </div>
        <Link href="/post-job">
          <Button>Post a job</Button>
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(["ALL", "DRAFT", "OPEN", "RUNNING", "CLOSED"] as const).map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s[0] + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>
      {message && <p className="mt-4 text-destructive">{message}</p>}
      <div className="mt-6 grid gap-4">
        {visible.length ? (
          visible.map((job) => {
            const statusTag = jobStatus(job);
            return (
              <article
                key={job.id}
                className={`rounded-xl border bg-card p-5 ${statusTag !== "DRAFT" ? "cursor-pointer hover:border-primary/70" : ""}`}
                onClick={() =>
                  statusTag !== "DRAFT" &&
                  router.push(job.projectId ? `/project/${job.projectId}/tracking` : `/job/${job.id}`)
                }
                role={statusTag !== "DRAFT" ? "button" : undefined}
                tabIndex={statusTag !== "DRAFT" ? 0 : undefined}
                onKeyDown={(event) => {
                  if (statusTag !== "DRAFT" && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    router.push(
                      job.projectId ? `/project/${job.projectId}/tracking` : `/job/${job.id}`,
                    );
                  }
                }}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTag === "OPEN" ? "bg-green-100 text-green-800" : statusTag === "DRAFT" ? "bg-amber-100 text-amber-800" : "bg-muted"}`}
                    >
                      {statusTag === "RUNNING"
                        ? "Running"
                        : statusTag[0] + statusTag.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{job.title || "Untitled draft"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.timingType === "HOURLY"
                      ? `${usd(job.hourlyRate)} / hour`
                      : `${usd(job.budgetMin)} – ${usd(job.budgetMax)}`} {job.locationAddress ? ` · ${job.locationAddress}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {statusTag === "DRAFT" && (
                    <>
                      <Link
                        href={`/post-job?edit=${job.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button variant="outline">Continue editing</Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void remove(job.id);
                        }}
                      >
                        Delete draft
                      </Button>
                    </>
                  )}
                  {statusTag !== "DRAFT" && (
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                      <a
                        href={
                          job.projectId ? `/project/${job.projectId}/tracking` : `/job/${job.id}`
                        }
                        onClick={(event) => event.stopPropagation()}
                      >
                        {job.projectId ? "Track Project" : "View job"}
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <h2 className="text-lg font-semibold">No jobs yet</h2>
            <p className="mt-2 text-muted-foreground">
              Post your first job and connect with professionals.
            </p>
            <Link className="mt-5 inline-block" href="/post-job">
              <Button>Post a job</Button>
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
