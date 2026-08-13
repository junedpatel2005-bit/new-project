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
  const editableText = (key: string, fallback: string) => cmsEdit ? <span contentEditable suppressContentEditableWarning onClick={(event) => event.preventDefault()} onBlur={(event) => { const value = event.currentTarget.textContent?.trim() || fallback; setPageText((current) => ({ ...current, [key]: value })); window.parent.postMessage({ type: "servio-cms-text", key, value }, window.location.origin); }} className="rounded outline-none ring-2 ring-indigo-400/50 focus:ring-indigo-500" title="Click and type to edit">{text(key, fallback)}</span> : text(key, fallback);
  useEffect(() => {
    async function loadHome() {
      try {
        const userResponse = await fetch("/api/auth/me");
        const userData = userResponse.ok
          ? ((await userResponse.json()) as { user?: { role?: string } | null })
          : null;
        const role = userData?.user?.role ?? null;
        const [categories, professionals, jobsResponse] = await Promise.all([
          fetch("/api/marketplace/categories"),
          fetch("/api/marketplace/professionals"),
          role === "PROFESSIONAL" ? fetch("/api/portal/professional-jobs") : Promise.resolve(null),
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
      try { setPageText(JSON.parse(window.sessionStorage.getItem("servio-home-preview") ?? "{}") as Record<string, string>); } catch { setPageText({}); }
      return;
    }
    void fetch("/api/website/page-text?path=/")
      .then((response) => response.ok ? response.json() : null)
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
              {editableText("badge", "Verified marketplace professionals")}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {editableText("heading", "Find trusted professionals for work that matters.")}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              {editableText("description", "Post work, compare qualified professionals, and manage every project in one place.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {editableText("eyebrow", "Live marketplace")}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold">{editableText("services", "Featured services")}</h2>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              href="/services"
            >
              All services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!data && !failed && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}
          {failed && (
            <p className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Marketplace data is unavailable. Please refresh to try again.
            </p>
          )}
          {data && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/discover?category=${encodeURIComponent(category.slug)}`}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:border-primary/30"
                >
                  <Users className="h-6 w-6 text-primary" />
                  <p className="mt-4 font-semibold">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {category.professionalCount} professionals
                  </p>
                </Link>
              ))}
            </div>
          )}
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
                    href={`/professional/my-jobs/${job.id}`}
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
