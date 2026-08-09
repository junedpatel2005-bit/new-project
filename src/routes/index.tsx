"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { ProCard } from "@/components/ProCard";
import { categories, professionals, testimonials } from "@/lib/mock-data";
import {
  Search,
  MapPin,
  ArrowRight,
  Star,
  ShieldCheck,
  BadgeCheck,
  ClipboardList,
  MessageSquare,
  Wallet,
  Users,
  Briefcase,
  Building2,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const stats = [
  { icon: Users, label: "Active Professionals", value: "120,400+" },
  { icon: Briefcase, label: "Jobs Completed", value: "846K" },
  { icon: Building2, label: "Cities Covered", value: "200+" },
  { icon: Award, label: "Average Rating", value: "4.9 / 5" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Trusted by 50,000+ businesses
              & homeowners
            </span>
            <h1 className="font-display mt-5 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find <span className="text-primary">Trusted Professionals</span> Near You
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Post jobs, hire experts, track work, and manage projects — all in one platform.
            </p>

            {/* Search */}
            <div className="mt-8 grid items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-card sm:grid-cols-[1fr_1fr_auto]">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="What service do you need?"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 sm:border-l sm:border-border">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Your location"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <Button asChild size="lg" className="rounded-xl bg-primary hover:bg-primary/90">
                <Link href="/discover">Search</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-cta text-cta-foreground hover:bg-cta/90 shadow-soft"
              >
                <Link href="/post-job">Post a Job</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signup">Become a Professional</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Verified pros
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Money-back guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" /> 4.9 average rating
              </span>
            </div>
          </div>

          {/* Visual */}
          <div className="relative hidden lg:block">
            <div className="relative h-full min-h-[460px]">
              <div className="absolute right-0 top-2 w-[300px] rounded-2xl border border-border bg-card p-5 shadow-elevated">
                <div className="flex items-center gap-3">
                  <img
                    src="https://i.pravatar.cc/100?u=amelia"
                    className="h-11 w-11 rounded-full"
                    alt=""
                  />
                  <div>
                    <p className="font-display text-sm font-semibold">Amelia Chen</p>
                    <p className="text-xs text-muted-foreground">Web Developer · $95/hr</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  "I'd love to take this on. I can ship your MVP in 3 weeks."
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-semibold">4.9</span>
                    <span className="text-muted-foreground">(312)</span>
                  </div>
                  <Button size="sm" className="h-7 bg-cta text-cta-foreground hover:bg-cta/90">
                    Hire
                  </Button>
                </div>
              </div>

              <div className="absolute left-0 top-44 w-[280px] rounded-2xl border border-border bg-card p-5 shadow-elevated">
                <p className="text-[10px] uppercase tracking-widest text-primary">Map preview</p>
                <div className="mt-2 grid h-32 place-items-center rounded-lg bg-gradient-to-br from-primary/10 via-accent to-success/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">3 pros within 2km · Surat</p>
              </div>

              <div className="absolute bottom-0 right-4 w-[260px] rounded-2xl gradient-cta p-5 text-white shadow-elevated">
                <p className="text-xs opacity-90">Job posted</p>
                <p className="mt-1 font-display text-lg font-semibold">Kitchen plumbing fix</p>
                <p className="mt-1 text-xs opacity-90">5 proposals received in 12 minutes</p>
                <div className="mt-3 flex -space-x-2">
                  {professionals.slice(0, 4).map((p) => (
                    <img
                      key={p.id}
                      src={p.avatar}
                      className="h-7 w-7 rounded-full ring-2 ring-cta"
                      alt=""
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            From post to hire in 3 simple steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            Designed to feel as easy as ordering food online.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ClipboardList,
              title: "Post Your Job",
              desc: "Tell us what you need — it's free and takes 2 minutes.",
            },
            {
              icon: MessageSquare,
              title: "Receive Proposals",
              desc: "Vetted pros send quotes. Compare prices, ratings & timelines.",
            },
            {
              icon: Wallet,
              title: "Hire & Track Progress",
              desc: "Pay safely via escrow. Track milestones until completion.",
            },
          ].map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <span className="absolute -top-3 left-6 rounded-full bg-cta px-3 py-0.5 text-xs font-bold text-cta-foreground">
                Step {i + 1}
              </span>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Categories
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Featured services
              </h2>
            </div>
            <Link
              href="/services"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.name}
                href="/services"
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-card"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <c.icon className="h-6 w-6" />
                </div>
                <p className="mt-4 font-display text-base font-semibold">{c.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.count.toLocaleString()} professionals
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Featured</p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Top professionals this week
            </h2>
          </div>
          <Link
            href="/discover"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {professionals.slice(0, 4).map((p) => (
            <ProCard key={p.id} pro={p} />
          ))}
        </div>
      </section>

      {/* MAP SECTION */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Nearby</p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              See pros near you, instantly
            </h2>
            <p className="mt-3 text-muted-foreground">
              Distance, ratings and availability — all on one map.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border shadow-soft">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent to-success/10" />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(30,58,138,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,58,138,.08) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
              {professionals.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className="absolute"
                  style={{ top: `${15 + i * 14}%`, left: `${10 + i * 16}%` }}
                >
                  <div className="relative">
                    <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-primary/30" />
                    <span className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated ring-4 ring-surface">
                      <MapPin className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              ))}
              <div className="absolute bottom-4 left-4 rounded-xl bg-surface px-4 py-3 text-xs shadow-card">
                <p className="font-semibold text-foreground">Showing 12 pros</p>
                <p className="text-muted-foreground">within 5 km • Surat</p>
              </div>
            </div>
            <div className="space-y-3">
              {professionals.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/pro/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-all hover:border-primary/30"
                >
                  <img src={p.avatar} className="h-12 w-12 rounded-lg object-cover" alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Based in {p.location} • {p.distance || 1.2}km away
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary">${p.hourly}/hr</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS CAROUSEL */}
      <ReviewsCarousel />

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-white shadow-elevated md:p-16">
          <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cta/30 blur-3xl" />
          <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Ready to Hire Trusted Professionals?
              </h2>
              <p className="mt-3 max-w-md text-white/85">
                Join thousands of clients getting work done — safely, quickly, and at fair prices.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button
                asChild
                size="lg"
                className="bg-cta text-cta-foreground hover:bg-cta/90 shadow-soft"
              >
                <Link href="/post-job">Post a Job</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ReviewsCarousel() {
  const [i, setI] = useState(0);
  const total = testimonials.length;
  const t = testimonials[i];
  if (!t) return null;
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Reviews</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Loved by clients & pros
          </h2>
        </div>
        <div className="mt-10 rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
          <div className="flex gap-1 text-warning">
            {Array.from({ length: 5 }).map((_, k) => (
              <Star key={k} className="h-5 w-5 fill-warning" />
            ))}
          </div>
          <blockquote className="font-display mt-4 text-2xl font-semibold leading-snug text-foreground md:text-3xl">
            "{t.text}"
          </blockquote>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={t.avatar} className="h-12 w-12 rounded-full" alt="" />
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setI((i - 1 + total) % total)}
                className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setI((i + 1) % total)}
                className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
