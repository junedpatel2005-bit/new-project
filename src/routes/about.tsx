import type { LucideIcon } from "lucide-react";
import { Award, HeartHandshake, ShieldCheck } from "lucide-react";

const values: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: "Trust first",
    description:
      "Verified profiles and clear project milestones help everyone work with confidence.",
  },
  {
    icon: HeartHandshake,
    title: "Built for both sides",
    description: "Clients hire with clarity while professionals grow their business.",
  },
  {
    icon: Award,
    title: "Work worth doing",
    description: "From local services to digital projects, good work deserves a better home.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              About Servio
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Better work starts with trust.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Servio brings clients and skilled professionals together in one safe, simple
              marketplace.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <article
                  key={value.title}
                  className="rounded-2xl border border-border bg-card p-7 shadow-soft"
                >
                  <Icon className="h-7 w-7 text-primary" />
                  <h2 className="mt-5 font-display text-xl font-semibold">{value.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
