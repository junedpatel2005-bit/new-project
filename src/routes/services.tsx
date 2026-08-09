import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/mock-data";
import { Search, MapPin, Filter, ChevronDown } from "lucide-react";

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Search bar */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Browse all services
          </h1>
          <p className="mt-2 text-muted-foreground">Find exactly the type of pro you need.</p>
          <div className="mt-6 grid gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft sm:grid-cols-[1fr_1fr_auto_auto]">
            <div className="flex items-center gap-2 rounded-xl px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 sm:border-l sm:border-border">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Location" className="border-0 shadow-none focus-visible:ring-0" />
            </div>
            <Button variant="outline" className="rounded-xl">
              All categories <ChevronDown className="h-4 w-4" />
            </Button>
            <Button className="rounded-xl bg-primary">Search</Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Filters</h3>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            <FilterGroup title="Rating" options={["4.5 & up", "4.0 & up", "3.5 & up"]} />
            <FilterGroup
              title="Distance"
              options={["Within 2 km", "Within 5 km", "Within 10 km", "Any"]}
            />
            <FilterGroup title="Availability" options={["Now", "This week", "Next week"]} />
            <FilterGroup title="Other" options={["Verified only", "Remote", "On-site"]} />
            <Button className="mt-4 w-full bg-primary">Apply filters</Button>
          </div>
        </aside>

        {/* Categories grid */}
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">12 categories</span> · 14,720 pros
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.name}
                href="/discover"
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <c.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.count.toLocaleString()} professionals
                  </p>
                  <p className="mt-2 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Browse pros →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function FilterGroup({ title, options }: { title: string; options: string[] }) {
  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
