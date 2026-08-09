"use client";

import { useParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { milestones, activityFeed, requiredProfessional } from "@/lib/mock-data";
import { Check, Clock, Circle, FileText, MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Project() {
  const pro = requiredProfessional(0);
  const completed = milestones.filter((m) => m.status === "completed").length;
  const progress = Math.round((completed / milestones.length) * 100);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Project · #{useParams<{ projectId: string }>().projectId.toUpperCase()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Shopify storefront with custom theme
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <img src={pro.avatar} className="h-7 w-7 rounded-full" alt="" />
            <span>
              With <span className="font-medium text-foreground">{pro.name}</span>
            </span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              In progress
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Message
          </Button>
          <Button>Release milestone</Button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Project progress</h2>
            <p className="text-sm text-muted-foreground">
              {completed} of {milestones.length} milestones completed
            </p>
          </div>
          <span className="text-2xl font-semibold text-primary">{progress}%</span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full gradient-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg font-semibold">Milestones</h2>
          <ol className="mt-5 space-y-4">
            {milestones.map((m, i) => {
              const Icon =
                m.status === "completed" ? Check : m.status === "in_progress" ? Clock : Circle;
              const tint =
                m.status === "completed"
                  ? "bg-success text-white"
                  : m.status === "in_progress"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground";
              return (
                <li key={m.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-8 w-8 place-items-center rounded-full ${tint}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {i < milestones.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{m.title}</p>
                      <span className="text-sm font-semibold">${m.amount}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Due {m.due}</p>
                    {m.status === "in_progress" && (
                      <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                        <p className="text-sm font-medium text-foreground">In progress</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Latest update: theme scaffolding complete, working on product filtering.
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">Uploaded proof</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { f: "design-v3.fig", size: "12 MB" },
                { f: "homepage-preview.png", size: "1.4 MB" },
                { f: "qa-checklist.pdf", size: "240 KB" },
              ].map((f) => (
                <li
                  key={f.f}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{f.f}</p>
                    <p className="text-xs text-muted-foreground">{f.size}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-4 w-full gap-2">
              <Upload className="h-4 w-4" /> Upload file
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">Activity</h3>
            <ul className="mt-4 space-y-4">
              {activityFeed.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>
                      <span className="font-medium">{a.actor}</span> {a.action}{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
