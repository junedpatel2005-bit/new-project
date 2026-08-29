"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { ProCard } from "@/components/ProCard";
import { Button } from "@/components/ui/button";
import type { MarketplaceProfessional } from "@/lib/types/marketplace";
import { sanitizeInlineHtml } from "@/lib/sanitizeInlineHtml";

const featureDefs = [
  {
    id: "feature-1",
    icon: ShieldCheck,
    title: "Verified Professionals",
    text: "All professionals are verified and vetted to ensure quality work and your peace of mind.",
  },
  {
    id: "feature-2",
    icon: Briefcase,
    title: "Project Management",
    text: "Track progress, communicate in real-time, and manage all projects in one centralized dashboard.",
  },
  {
    id: "feature-3",
    icon: Users,
    title: "Expert Matching",
    text: "Get matched with professionals that best fit your project needs and budget requirements.",
  },
  {
    id: "feature-4",
    icon: MapPin,
    title: "Local & Remote",
    text: "Work with professionals near you or globally - choose what works best for your project.",
  },
  {
    id: "feature-5",
    icon: Search,
    title: "Easy Discovery",
    text: "Browse portfolios, reviews, and rates to find the right fit. Make data-driven decisions.",
  },
  {
    id: "feature-6",
    icon: ArrowRight,
    title: "Seamless Growth",
    text: "Build long-term relationships with reliable partners and scale your business together.",
  },
];
const featureIds = featureDefs.map((feature) => feature.id);

function orderFeatures(rawOrder: string | undefined) {
  if (rawOrder) {
    try {
      const parsed = JSON.parse(rawOrder) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.length === featureIds.length &&
        featureIds.every((id) => parsed.includes(id))
      ) {
        return parsed.map((id) => featureDefs.find((feature) => feature.id === id)!);
      }
    } catch {
      // Fall through to the default order below.
    }
  }
  return featureDefs;
}

export default function Landing({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [professionals, setProfessionals] = useState<MarketplaceProfessional[]>([]);
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
    async function loadHome() {
      try {
        const response = await fetch("/api/v1/marketplace/professionals");
        if (!response.ok) throw new Error("Marketplace request failed");
        setProfessionals((await response.json()) as MarketplaceProfessional[]);
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
          JSON.parse(window.sessionStorage.getItem("servio-home-preview:/") ?? "{}") as Record<
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
              {editableText(
                "description",
                "Post work, compare qualified professionals, and manage every project in one place.",
              )}
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
            {orderFeatures(pageText.__feature_order__).map((feature) => (
              <div key={feature.id} className="rounded-2xl border border-border bg-card p-8 shadow-soft">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display font-semibold">
                  {editableText(`${feature.id}-title`, feature.title)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {editableText(`${feature.id}-text`, feature.text)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {editableText("featured-eyebrow", "Featured")}
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">
                  {editableText("featured-heading", "Professionals ready to help")}
                </h2>
              </div>
              <Link
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                href="/discover"
              >
                {editableText("featured-browse", "Browse all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {!professionals.length && !failed && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            )}
            {professionals.length > 0 && (
              <div
                data-db-section="professionals"
                className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
              >
                {professionals.slice(0, 4).map((professional) => (
                  <ProCard
                    key={professional.id}
                    pro={professional}
                    requireLogin={!isAuthenticated}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
