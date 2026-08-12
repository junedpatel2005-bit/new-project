"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DetailedProfessional } from "@/lib/types/marketplace";

type ClientJob = {
  id: number;
  title: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: string;
};

const formatCurrency = (value: number | null) =>
  value == null ? "Not set" : `$${value.toLocaleString("en-US")}`;

const jobLabel = (job: ClientJob) =>
  `${job.title ?? `Job #${job.id}`} · ${job.timingType === "HOURLY" ? `${formatCurrency(job.hourlyRate)}/hr` : `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}`} ${job.status !== "OPEN" ? `(${job.status.toLowerCase()})` : ""}`;

function ProProfileContent() {
  const { proId } = useParams<{ proId: string }>();
  const searchParams = useSearchParams();
  const requestedJobId = Number(searchParams.get("jobId"));
  const [professional, setProfessional] = useState<DetailedProfessional | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<ClientJob[]>([]);
  const [jobsStatus, setJobsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [duration, setDuration] = useState("1 week");
  const [coverLetter, setCoverLetter] = useState("");
  const [hireStep, setHireStep] = useState<1 | 2 | 3>(1);
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/marketplace/professional-detail?id=${encodeURIComponent(proId)}`)
      .then(async (response) => {
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) throw new Error("Unable to load professional");
        setProfessional((await response.json()) as DetailedProfessional);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [proId]);

  useEffect(() => {
    async function loadJobs() {
      setJobsStatus("loading");
      try {
        const response = await fetch("/api/client/jobs");
        if (!response.ok) throw new Error("Unable to load jobs");
        const data = (await response.json()) as { jobs: ClientJob[] };
        setJobs(data.jobs);
        if (Number.isSafeInteger(requestedJobId) && requestedJobId > 0) {
          const requestedJob = data.jobs.find((job) => job.id === requestedJobId);
          if (requestedJob?.status === "OPEN") setSelectedJobId(requestedJob.id);
        }
        setJobsStatus("ready");
      } catch {
        setJobsStatus("error");
      }
    }
    void loadJobs();
  }, [requestedJobId]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;
  const canSubmitRequest =
    selectedJob !== null &&
    selectedJob.status === "OPEN" &&
    bidAmount.trim().length > 0 &&
    requestStatus !== "loading";

  async function submitRequest() {
    if (!selectedJob) {
      setRequestMessage("Choose a job to request this professional.");
      setRequestStatus("error");
      return;
    }
    const parsedBid = Number(bidAmount);
    if (!Number.isFinite(parsedBid) || parsedBid <= 0) {
      setRequestMessage("Enter a valid bid amount.");
      setRequestStatus("error");
      return;
    }
    setRequestStatus("loading");
    setRequestMessage(null);
    try {
      const response = await fetch("/api/client/project-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: selectedJob.id,
          professionalId: Number(proId),
          bidAmount: Math.round(parsedBid),
          duration,
          coverLetter,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRequestStatus("error");
        setRequestMessage(data.error || "Unable to send the hire request.");
        return;
      }
      setRequestStatus("success");
      setRequestMessage("Your hire request was sent successfully.");
    } catch {
      setRequestStatus("error");
      setRequestMessage("Unable to send the hire request right now.");
    }
  }

  if (status === "loading")
    return (
      <AppShell>
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  if (status === "missing")
    return (
      <AppShell>
        <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
          This professional is unavailable.
        </p>
      </AppShell>
    );
  if (status === "error" || !professional)
    return (
      <AppShell>
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          The profile could not be loaded. Please try again.
        </p>
      </AppShell>
    );
  return (
    <AppShell>
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="h-28 gradient-primary" />
        <div className="px-6 pb-8 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {professional.avatar ? (
                <img
                  src={professional.avatar}
                  alt={professional.name}
                  className="h-24 w-24 rounded-2xl border-4 border-card object-cover"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-muted text-3xl font-semibold">
                  {professional.name.slice(0, 1)}
                </div>
              )}
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                  {professional.name}
                  {professional.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                </h1>
                <p className="text-muted-foreground">{professional.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {professional.companyName || professional.industry || "Independent professional"}
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">Hire</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Hire {professional.name}</DialogTitle>
                  <DialogDescription>
                    Confirm the job, agree on budget and timeline, then review your request.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                  {["Job details", "Budget & timeline", "Review"].map((label, index) => (
                    <div
                      key={label}
                      className={`rounded-lg px-3 py-2 text-center ${hireStep === index + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {index + 1}. {label}
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-2">
                  {jobsStatus === "loading" && (
                    <p className="text-sm text-muted-foreground">Loading your jobs...</p>
                  )}
                  {jobsStatus === "error" && (
                    <p className="text-sm text-destructive">
                      Your jobs could not be loaded. Sign in and reload the page.
                    </p>
                  )}
                  {jobsStatus === "ready" && (
                    <div className="space-y-4">
                      {hireStep === 1 && (
                        <div>
                          <Label htmlFor="selectedJob">Select your job</Label>
                          <Select
                            value={selectedJobId?.toString() ?? ""}
                            onValueChange={(value) => setSelectedJobId(Number(value))}
                          >
                            <SelectTrigger id="selectedJob" className="mt-2">
                              <SelectValue placeholder="Choose a job" />
                            </SelectTrigger>
                            <SelectContent>
                              {jobs.map((job) => (
                                <SelectItem
                                  key={job.id}
                                  value={job.id.toString()}
                                  disabled={job.status !== "OPEN"}
                                >
                                  {jobLabel(job)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {hireStep === 1 && selectedJob && (
                        <div className="rounded-2xl border border-border bg-muted p-4">
                          <p className="text-sm font-medium text-foreground">Selected job</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedJob.title ?? `Job #${selectedJob.id}`}
                          </p>
                          <p className="mt-2 text-sm">
                            {selectedJob.timingType === "HOURLY"
                              ? `${formatCurrency(selectedJob.hourlyRate)}/hr`
                              : `${formatCurrency(selectedJob.budgetMin)} – ${formatCurrency(selectedJob.budgetMax)}`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Status: {selectedJob.status}
                          </p>
                        </div>
                      )}
                      {hireStep === 2 && (
                        <div>
                          <Label htmlFor="bidAmount">Your budget</Label>
                          <Input
                            id="bidAmount"
                            type="number"
                            value={bidAmount}
                            onChange={(event) => setBidAmount(event.target.value)}
                            placeholder="Enter your proposed bid"
                            className="mt-2"
                          />
                        </div>
                      )}
                      {hireStep === 2 && (
                        <div>
                          <Label htmlFor="duration">Estimated duration</Label>
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger id="duration" className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["1 week", "2 weeks", "1 month", "2 months", "3+ months"].map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {hireStep === 2 && (
                        <div>
                          <Label htmlFor="coverLetter">Message to professional</Label>
                          <Textarea
                            id="coverLetter"
                            value={coverLetter}
                            onChange={(event) => setCoverLetter(event.target.value)}
                            placeholder="Briefly describe the work or requirements"
                            className="mt-2"
                            rows={4}
                          />
                        </div>
                      )}
                      {hireStep === 3 && selectedJob && (
                        <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
                          <p className="font-semibold">Confirm hire request</p>
                          <p>
                            <span className="text-muted-foreground">Job:</span>{" "}
                            {selectedJob.title ?? `Job #${selectedJob.id}`}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Professional:</span>{" "}
                            {professional.name}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Budget:</span> $
                            {Number(bidAmount || 0).toLocaleString()}
                          </p>
                          <p>
                            <span className="text-muted-foreground">Timeline:</span> {duration}
                          </p>
                          {coverLetter && <p className="text-muted-foreground">{coverLetter}</p>}
                        </div>
                      )}
                      {requestMessage && (
                        <p
                          className={`text-sm ${
                            requestStatus === "success" ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {requestMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  {hireStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setHireStep((step) => (step - 1) as 1 | 2)}
                    >
                      Back
                    </Button>
                  )}
                  {hireStep < 3 ? (
                    <Button
                      onClick={() => setHireStep((step) => (step + 1) as 2 | 3)}
                      disabled={
                        hireStep === 1
                          ? !selectedJob || selectedJob.status !== "OPEN"
                          : !bidAmount.trim()
                      }
                      className="w-full sm:w-auto"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={submitRequest}
                      disabled={!canSubmitRequest}
                      className="w-full sm:w-auto"
                    >
                      {requestStatus === "loading" ? "Sending..." : "Send hire request"}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              {professional.rating.toFixed(1)} ({professional.reviews} reviews)
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {professional.location ?? "Remote"}
            </span>
            <span>Availability: {professional.availability.replace("_", " ")}</span>
          </div>
          <section className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-3 text-muted-foreground">
                {professional.bio ?? "This professional has not added an introduction yet."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <h2 className="text-lg font-semibold">Profile details</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Industry</p>
                  <p>{professional.industry ?? "Not specified"}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Work mode</p>
                  <p>{professional.workMode.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Experience</p>
                  <p>
                    {professional.experienceYears != null
                      ? `${professional.experienceYears} years`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Service area</p>
                  <p>{professional.serviceArea ?? "Not specified"}</p>
                </div>
              </div>
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {professional.skills.length ? (
                professional.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-border px-3 py-1 text-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills published yet.</p>
              )}
            </div>
          </section>
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Hourly rate</p>
              <p className="mt-1 text-2xl font-semibold">
                {professional.hourlyRate === null
                  ? "Contact for pricing"
                  : `$${professional.hourlyRate}/hr`}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Fixed rate</p>
              <p className="mt-1 text-2xl font-semibold">
                {professional.fixedRate === null ? "Not set" : `$${professional.fixedRate}`}
              </p>
            </div>
          </section>
        </div>
      </article>
    </AppShell>
  );
}

export default function ProProfile() {
  return (
    <Suspense fallback={null}>
      <ProProfileContent />
    </Suspense>
  );
}
