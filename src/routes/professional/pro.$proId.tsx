"use client";

import { useParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { professionals, portfolio, reviews } from "@/lib/mock-data";
import {
  Star,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Award,
  Clock,
  MessageSquare,
  Heart,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProProfile() {
  const { proId } = useParams<{ proId: string }>();
  const pro = professionals.find((p) => p.id === proId) ?? professionals[0];

  if (!pro) return null;

  return (
    <AppShell>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="h-32 gradient-primary" />
        <div className="px-6 pb-6 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-5">
              <img
                src={pro.avatar}
                alt={pro.name}
                className="-mt-12 h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-elevated"
              />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{pro.name}</h1>
                  {pro.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{pro.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {pro.rating} (
                    {pro.reviews})
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {pro.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Available {pro.available}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Heart className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" /> Message
              </Button>
              <Button size="sm" variant="default">
                Hire — ${pro.hourly}/hr
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="About">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {pro.bio} Working with clients across SaaS, fintech, and consumer products, I focus on
              shipping high-quality work that moves real metrics. I take a small number of clients
              at any time to ensure the highest quality.
            </p>
          </Section>

          <Section title="Portfolio">
            <div className="grid gap-3 sm:grid-cols-2">
              {portfolio.map((p, i) => (
                <div
                  key={p.title}
                  className="group overflow-hidden rounded-xl border border-border"
                >
                  <div
                    className={`h-40 bg-gradient-to-br ${["from-primary/20 to-accent/20", "from-accent/20 to-warning/20", "from-warning/20 to-primary/20", "from-success/20 to-primary/20"][i]} flex items-end p-4`}
                  >
                    <span className="rounded-full bg-card/80 px-2 py-0.5 text-xs backdrop-blur">
                      {p.tag}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">Case study · 2024–2026</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {[...pro.skills, "GraphQL", "Postgres", "Stripe", "Tailwind", "CI/CD", "Testing"].map(
                (s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                  >
                    {s}
                  </span>
                ),
              )}
            </div>
          </Section>

          <Section title="Experience">
            <ol className="relative ml-3 space-y-6 border-l border-border pl-5">
              {[
                { role: "Senior Engineer", co: "Stripe", years: "2021 — 2024" },
                { role: "Engineer II", co: "Airbnb", years: "2018 — 2021" },
                { role: "Engineer", co: "Square", years: "2015 — 2018" },
              ].map((e) => (
                <li key={e.co} className="relative">
                  <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                  <p className="font-medium">
                    {e.role} · <span className="text-muted-foreground">{e.co}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{e.years}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title={`Reviews (${reviews.length})`}>
            <div className="space-y-5">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <img src={r.avatar} className="h-9 w-9 rounded-full" alt="" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.author}</p>
                      <p className="text-xs text-muted-foreground">{r.date}</p>
                    </div>
                    <div className="flex gap-0.5 text-warning">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-warning" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">Pricing</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                { name: "Hourly consulting", price: `$${pro.hourly}/hr` },
                { name: "Weekly retainer", price: `$${pro.hourly * 30}/wk` },
                { name: "Fixed scope project", price: "From $5,000" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-xl border border-border p-3"
                >
                  <span>{p.name}</span>
                  <span className="font-medium">{p.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">Verifications</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                { icon: BadgeCheck, label: "Identity verified" },
                { icon: ShieldCheck, label: "Background checked" },
                { icon: Award, label: "Top rated · 2 years" },
              ].map((v) => (
                <div key={v.label} className="flex items-center gap-2">
                  <v.icon className="h-4 w-4 text-success" /> {v.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-semibold">Availability</h3>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 21 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-md ${[2, 5, 9, 12, 15, 18].includes(i) ? "bg-muted" : "bg-success/30"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Next 3 weeks · Most weekdays open</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
