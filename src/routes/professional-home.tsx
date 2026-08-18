"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, MapPin, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeInlineHtml } from "@/lib/sanitizeInlineHtml";

type HomeJob = {
  id: number;
  title: string | null;
  category: string | null;
  description: string | null;
  locationAddress: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  hourlyRate: number | null;
  timingType: "HOURLY" | string;
  clientName: string;
};

const PAGE_PATH = "/professional-home";

export default function ProfessionalHome() {
  const [jobs, setJobs] = useState<HomeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pageText, setPageText] = useState<Record<string, string>>({});
  const [cmsEdit, setCmsEdit] = useState(false);
  const text = (key: string, fallback: string) => pageText[key] || fallback;
  const editableText = (key: string, fallback: string) =>
    cmsEdit ? (
      <span
        contentEditable
        suppressContentEditableWarning
        onClick={(event) => event.preventDefault()}
        onBlur={(event) => {
          const value = sanitizeInlineHtml(event.currentTarget.innerHTML);
          if (!event.currentTarget.textContent?.trim()) return;
          setPageText((current) => ({ ...current, [key]: value }));
          window.parent.postMessage(
            { type: "servio-cms-text", key, value },
            window.location.origin,
          );
        }}
        className="rounded outline-none ring-2 ring-indigo-400/50 focus:ring-indigo-500"
        title="Click and type to edit"
        dangerouslySetInnerHTML={{ __html: text(key, fallback) }}
      />
    ) : (
      <span dangerouslySetInnerHTML={{ __html: text(key, fallback) }} />
    );
  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/v1/portal/professional-jobs");
        if (!response.ok) throw new Error("Professional jobs request failed");
        const data = (await response.json()) as { openJobs: HomeJob[] };
        setJobs(Array.isArray(data.openJobs) ? data.openJobs : []);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }
    void loadJobs();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("cmsPreview") === "1";
    setCmsEdit(params.get("cmsEdit") === "1");
    if (preview) {
      try {
        setPageText(
          JSON.parse(
            window.sessionStorage.getItem(`servio-home-preview:${PAGE_PATH}`) ?? "{}",
          ) as Record<string, string>,
        );
      } catch {
        setPageText({});
      }
      return;
    }
    void fetch(`/api/v1/website/page-text?path=${PAGE_PATH}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { text?: Record<string, string> } | null) => setPageText(result?.text ?? {}));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              {editableText("prof-badge", "Grow your professional business")}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {editableText("prof-heading", "Find projects that match your skills")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {editableText(
                "prof-description",
                "Browse available projects, bid on work, and build your reputation with satisfied clients worldwide.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/professional/my-jobs?tab=find">
                  <Search className="mr-2 h-4 w-4" />
                  {editableText("prof-browse", "Find Projects")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/professional/dashboard">
                  <Briefcase className="mr-2 h-4 w-4" />
                  {editableText("prof-dashboard", "My Dashboard")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {editableText("prof-why-eyebrow", "Why Professionals Choose Us")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              {editableText("prof-why-heading", "Everything you need to grow")}
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg text-muted-foreground">
              {editableText(
                "prof-why-description",
                "Find quality projects, get paid safely, and build a reputation clients trust.",
              )}
            </p>
          </div>
        </section>
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {editableText("prof-featured-eyebrow", "Featured")}
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  {editableText("prof-featured-heading", "Jobs ready for you")}
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                href="/professional/my-jobs?tab=find"
              >
                {editableText("prof-browse-all", "Browse all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {loading && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}
            {!loading && !failed && (
              <div data-db-section="jobs" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {jobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    href={`/job/${job.id}`}
                    className="flex min-h-64 flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {job.category ?? "General"}
                    </p>
                    <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold">
                      {job.title ?? `Job #${job.id}`}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {job.description}
                    </p>
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {job.locationAddress ?? "Remote"}
                    </p>
                    <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Budget
                        </p>
                        <p className="font-display text-xl font-bold">
                          {job.timingType === "HOURLY"
                            ? `₹${job.hourlyRate ?? 0}/hr`
                            : `₹${job.budgetMin ?? 0} – ₹${job.budgetMax ?? 0}`}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-primary">View job</span>
                    </div>
                  </Link>
                ))}
                {!jobs.length && (
                  <p className="col-span-full rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    No open jobs are available right now.
                  </p>
                )}
              </div>
            )}
            {failed && (
              <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Could not load jobs right now.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
