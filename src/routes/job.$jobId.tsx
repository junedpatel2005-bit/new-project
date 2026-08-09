"use client";

import { useParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { jobs, proposals } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { MapPin, Clock, Briefcase, Star, X, FileText, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];

  if (!job) return null;

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                {job.category}
              </span>
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-medium text-success">
                {job.status}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-medium ${
                  job.urgency === "High"
                    ? "bg-destructive/10 text-destructive"
                    : job.urgency === "Medium"
                      ? "bg-warning/15 text-warning-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {job.urgency} urgency
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Posted {job.postedAt}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" /> {job.proposals} proposals
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { l: "Budget", v: job.budget },
                { l: "Type", v: job.remote ? "Remote" : "On-site" },
                { l: "Timeline", v: "3–4 weeks" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="mt-1 font-semibold">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {job.description} We're looking for someone who can communicate clearly, deliver
                against milestones, and bring strong opinions to the work. Bonus points for previous
                marketplace experience.
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold">Attachments</h2>
              <ul className="mt-3 space-y-2">
                {["project-brief.pdf", "moodboard.png"].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{f}</span>
                    <span className="ml-auto text-xs text-muted-foreground">2.4 MB</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Proposals */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Proposals ({proposals.length})</h2>
              <select className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                <option>Sort: Most relevant</option>
                <option>Lowest bid</option>
                <option>Highest rated</option>
              </select>
            </div>
            <div className="mt-4 space-y-4">
              {proposals.map((p) => (
                <div key={p.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={p.pro.avatar} className="h-12 w-12 rounded-full" alt="" />
                      <div>
                        <p className="font-medium">{p.pro.name}</p>
                        <p className="text-xs text-muted-foreground">{p.pro.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-warning text-warning" /> {p.pro.rating} ·{" "}
                          {p.pro.completed} jobs
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">${p.bid.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.duration} · {p.submittedAt}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{p.cover}</p>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Message
                    </Button>
                    <Button size="sm">Hire {p.pro.name.split(" ")[0]}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side: client + actions */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">About the client</h3>
            <div className="mt-4 flex items-center gap-3">
              <img src={job.client.avatar} className="h-12 w-12 rounded-full" alt="" />
              <div>
                <p className="font-medium">{job.client.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {job.client.rating} ·{" "}
                  {job.client.jobsPosted} jobs posted
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
              {[
                ["Member since", "2023"],
                ["Hire rate", "82%"],
                ["Avg. spend", "$3.2k"],
                ["Response", "< 1 hour"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Dialog>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-semibold">Want this job?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Send a tailored proposal to stand out.
              </p>
              <DialogTrigger asChild>
                <Button className="mt-4 w-full">Submit a proposal</Button>
              </DialogTrigger>
              <Button variant="outline" className="mt-2 w-full">
                Save job
              </Button>
            </div>
            <ProposalDialog />
          </Dialog>
        </div>
      </div>
    </AppShell>
  );
}

function ProposalDialog() {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Submit your proposal</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Your bid</Label>
            <Input type="number" placeholder="$ Total" defaultValue={4200} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Input placeholder="e.g. 3 weeks" defaultValue="3 weeks" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Cover letter</Label>
          <Textarea rows={6} placeholder="Why are you the best fit for this job?" />
        </div>
        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          <Paperclip className="mr-1 inline h-3 w-3" /> Attach work samples (optional)
        </div>
        <div className="flex justify-between rounded-lg bg-muted p-3 text-sm">
          <span className="text-muted-foreground">Service fee (10%)</span>
          <span>−$420</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>You'll receive</span>
          <span>$3,780</span>
        </div>
        <Button className="w-full">Submit proposal</Button>
      </div>
    </DialogContent>
  );
}
