"use client";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categories } from "@/lib/mock-data";
import { useState } from "react";
import { Upload, MapPin, X } from "lucide-react";

export default function PostJob() {
  const [remote, setRemote] = useState(true);
  const [urgency, setUrgency] = useState<"Low" | "Medium" | "High">("Medium");
  const [files, setFiles] = useState<string[]>(["brief.pdf", "moodboard.png"]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm text-primary">Step 1 of 1</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tell us about your project</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The more detail you share, the better proposals you'll receive.
          </p>
        </div>

        <form className="space-y-8 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <Field label="Category" hint="Pick the category that best matches your project.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categories.slice(0, 9).map((c, i) => (
                <button
                  type="button"
                  key={c.name}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    i === 1
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <c.icon className="h-4 w-4" />
                  {c.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Title" hint="Keep it short and specific.">
            <Input placeholder="e.g. Build a Shopify storefront with custom theme" />
          </Field>

          <Field label="Description">
            <Textarea
              rows={6}
              placeholder="Describe scope, goals, deliverables, and what success looks like."
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Budget">
              <div className="flex gap-2">
                <Input placeholder="$ Min" />
                <Input placeholder="$ Max" />
              </div>
            </Field>
            <Field label="Deadline">
              <Input type="date" />
            </Field>
          </div>

          <Field label="Urgency">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
              {(["Low", "Medium", "High"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                    urgency === u ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Location">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="City or address" disabled={remote} />
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={remote}
                  onChange={(e) => setRemote(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Remote OK</span>
              </label>
            </div>
          </Field>

          <Field label="Attachments" hint="Add briefs, references, screenshots — up to 25MB.">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background py-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Drop files here or click to upload</p>
              <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOCX</p>
              <input type="file" className="hidden" multiple />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f) => (
                  <li
                    key={f}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((fs) => fs.filter((x) => x !== f))}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-6">
            <Button type="button" variant="ghost">
              Save as draft
            </Button>
            <Button type="submit">Post job</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
