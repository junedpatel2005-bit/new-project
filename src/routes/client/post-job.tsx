"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplaceCategory } from "@/lib/types/marketplace";
export default function PostJob() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/api/marketplace/categories")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load categories");
        setCategories((await response.json()) as MarketplaceCategory[]);
      })
      .catch(() => setError(true));
  }, []);
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Post a job</h1>
      <p className="mt-1 text-muted-foreground">Tell qualified professionals what you need.</p>
      {error ? (
        <p className="mt-6 rounded-xl border border-destructive/30 p-4 text-destructive">
          Categories could not be loaded.
        </p>
      ) : (
        <form className="mt-6 max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
          <label className="block text-sm font-medium">
            Title
            <Input className="mt-2" placeholder="What do you need done?" />
          </label>
          <label className="block text-sm font-medium">
            Category
            <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3">
              {categories.length ? (
                categories.map((category) => <option key={category.id}>{category.name}</option>)
              ) : (
                <option>Loading categories…</option>
              )}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              className="mt-2 min-h-32 w-full rounded-md border border-input bg-background p-3"
              placeholder="Describe the scope and desired outcome."
            />
          </label>
          <Button type="button" disabled>
            Job publishing API is being connected
          </Button>
        </form>
      )}
    </AppShell>
  );
}
