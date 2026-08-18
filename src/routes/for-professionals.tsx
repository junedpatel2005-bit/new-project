import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp, ShieldCheck, MapPin, Wallet, BadgeCheck, Briefcase } from "lucide-react";

export default function ForPros() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cta">
                For professionals
              </p>
              <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
                Find quality jobs. Get paid safely. Grow your business.
              </h1>
              <p className="mt-4 max-w-lg text-white/70">
                No more chasing leads or waiting on payments. Servio brings nearby and remote jobs
                straight to you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90">
                  <Link href="/signup">Join as a Pro — free</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="/discover">See sample jobs</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-6">
                {[
                  { v: "₹3.2k", l: "Avg. monthly earnings" },
                  { v: "<2h", l: "First lead" },
                  { v: "120K+", l: "Active pros" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="font-display text-2xl font-bold text-white">{s.v}</p>
                    <p className="text-xs text-white/60">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: TrendingUp,
                  t: "Grow",
                  d: "Algorithmic match-making puts you in front of the right clients.",
                },
                {
                  icon: ShieldCheck,
                  t: "Trusted",
                  d: "Verified badges and ratings build long-term reputation.",
                },
                {
                  icon: MapPin,
                  t: "Nearby",
                  d: "See jobs by distance, urgency, and budget — at a glance.",
                },
                {
                  icon: Wallet,
                  t: "Paid weekly",
                  d: "Withdraw earnings to your bank or wallet, anytime.",
                },
              ].map((b) => (
                <div key={b.t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-cta/15 text-cta">
                      <b.icon className="h-5 w-5" />
                    </div>
                    <p className="font-display text-lg font-semibold text-white">{b.t}</p>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Built for professionals like you
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Briefcase,
                t: "All trades welcome",
                d: "Plumbers, designers, photographers, tutors — there's a market for you.",
              },
              {
                icon: BadgeCheck,
                t: "Get verified",
                d: "Free identity & license verification builds trust with clients.",
              },
              {
                icon: TrendingUp,
                t: "Insights & analytics",
                d: "Track win-rates, response times, and earnings in one dashboard.",
              },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold">{b.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
