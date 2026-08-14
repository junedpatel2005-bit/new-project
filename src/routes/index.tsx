"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { ProCard } from "@/components/ProCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import type { MarketplaceCategory, MarketplaceProfessional } from "@/lib/types/marketplace";

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

export default function Landing() {
  const [data, setData] = useState<{
    categories: MarketplaceCategory[];
    professionals: MarketplaceProfessional[];
    jobs: HomeJob[];
    role: string | null;
  } | null>(null);
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
          const value = event.currentTarget.textContent?.trim() || fallback;
          setPageText((current) => ({ ...current, [key]: value }));
          window.parent.postMessage(
            { type: "servio-cms-text", key, value },
            window.location.origin,
          );
        }}
        className="rounded outline-none ring-2 ring-indigo-400/50 focus:ring-indigo-500"
        title="Click and type to edit"
      >
        {text(key, fallback)}
      </span>
    ) : (
      text(key, fallback)
    );
  useEffect(() => {
    async function loadHome() {
      try {
        const userResponse = await fetch("/api/v1/auth/me");
        const userData = userResponse.ok
          ? ((await userResponse.json()) as { user?: { role?: string } | null })
          : null;
        const role = userData?.user?.role ?? null;
        const [categories, professionals, jobsResponse] = await Promise.all([
          fetch("/api/v1/marketplace/categories"),
          fetch("/api/v1/marketplace/professionals"),
          role === "PROFESSIONAL"
            ? fetch("/api/v1/portal/professional-jobs")
            : Promise.resolve(null),
        ]);
        if (!categories.ok || !professionals.ok) throw new Error("Marketplace request failed");
        setData({
          categories: (await categories.json()) as MarketplaceCategory[],
          professionals: (await professionals.json()) as MarketplaceProfessional[],
          jobs:
            jobsResponse && jobsResponse.ok
              ? ((await jobsResponse.json()) as { openJobs: HomeJob[] }).openJobs
              : [],
          role,
        });
      } catch {
        setFailed(true);
      }
    }
    void loadHome();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("cmsPreview") === "1";
    setCmsEdit(params.get("cmsEdit") === "1");
    if (preview) {
      try {
        setPageText(
          JSON.parse(window.sessionStorage.getItem("servio-home-preview") ?? "{}") as Record<
            string,
            string
          >,
        );
      } catch {
        setPageText({});
      }
      return;
    }
    void fetch("/api/v1/website/page-text?path=/")
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { text?: Record<string, string> } | null) => setPageText(result?.text ?? {}));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              {data?.role === "PROFESSIONAL"
                ? editableText("prof-badge", "Grow your professional business")
                : editableText("badge", "Verified marketplace professionals")}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {data?.role === "PROFESSIONAL"
                ? editableText("prof-heading", "Find projects that match your skills")
                : editableText("heading", "Find trusted professionals for work that matters.")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {data?.role === "PROFESSIONAL"
                ? editableText(
                    "prof-description",
                    "Browse available projects, bid on work, and build your reputation with satisfied clients worldwide.",
                  )
                : editableText(
                    "description",
                    "Post work, compare qualified professionals, and manage every project in one place.",
                  )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {data?.role === "PROFESSIONAL" ? (
                <>
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
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/discover">
                      <Search className="mr-2 h-4 w-4" />
                      {editableText("browse", "Browse professionals")}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/post-job">
                      <Briefcase className="mr-2 h-4 w-4" />
                      {editableText("post", "Post a job")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {editableText("why-eyebrow", "Why Choose Us")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              {editableText("why-heading", "Everything you need to succeed")}
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              {editableText(
                "why-description",
                "A complete platform built for seamless collaboration between professionals and clients",
              )}
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Verified Professionals</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                All professionals are verified and vetted to ensure quality work and your peace of
                mind.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Project Management</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Track progress, communicate in real-time, and manage all projects in one centralized
                dashboard.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Expert Matching</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get matched with professionals that best fit your project needs and budget
                requirements.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Local & Remote</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Work with professionals near you or globally - choose what works best for your
                project.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Easy Discovery</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse portfolios, reviews, and rates to find the right fit. Make data-driven
                decisions.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ArrowRight className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display font-semibold">Seamless Growth</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Build long-term relationships with reliable partners and scale your business
                together.
              </p>
            </div>
          </div>
        </section>
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Featured
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  {data?.role === "PROFESSIONAL"
                    ? "Jobs ready for you"
                    : "Professionals ready to help"}
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                href={
                  data?.role === "PROFESSIONAL" ? "/professional/my-jobs?tab=find" : "/discover"
                }
              >
                {data?.role === "PROFESSIONAL" ? "Browse jobs" : "Browse all"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {!data && !failed && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}
            {data?.role === "PROFESSIONAL" ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {data.jobs.slice(0, 4).map((job) => (
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
                            ? `$${job.hourlyRate ?? 0}/hr`
                            : `$${job.budgetMin ?? 0} – $${job.budgetMax ?? 0}`}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-primary">View job</span>
                    </div>
                  </Link>
                ))}
                {!data.jobs.length && (
                  <p className="col-span-full rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    No open jobs are available right now.
                  </p>
                )}
              </div>
            ) : (
              data && (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {data.professionals.slice(0, 4).map((professional) => (
                    <ProCard key={professional.id} pro={professional} />
                  ))}
                </div>
              )
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
