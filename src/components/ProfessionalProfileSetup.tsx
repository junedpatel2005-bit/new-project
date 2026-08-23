"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneVerification } from "@/components/PhoneVerification";
import { Textarea } from "@/components/ui/textarea";
import type { MarketplaceCategory } from "@/lib/types/marketplace";

const LeafletMap = dynamic(() => import("@/components/LeafletAddressMap"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
});

const serviceOptions = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
] as const;

function getRecommendedSkills(category: string) {
  const value = category.toLowerCase();
  if (value.includes("development") || value.includes("software") || value.includes("coding")) {
    return ["JavaScript", "TypeScript", "React", "Node.js", "API integration"];
  }
  if (value.includes("design"))
    return ["Figma", "UI design", "UX research", "Prototyping", "Design systems"];
  if (value.includes("marketing"))
    return ["SEO", "Content strategy", "Social media", "Analytics", "Copywriting"];
  if (value.includes("clean"))
    return ["Deep cleaning", "Office cleaning", "Maintenance", "Sanitization"];
  if (value.includes("plumb"))
    return ["Pipe repair", "Drain cleaning", "Installation", "Maintenance"];
  return ["Communication", "Project management", "Problem solving", "Quality assurance"];
}

type Profile = {
  professionalCategory: string | null;
  experienceYears: number | null;
  hourlyRate: number | null;
  serviceRadiusKm: number | null;
  professionalLatitude: number | null;
  professionalLongitude: number | null;
  workMode: string;
  companyDescription: string | null;
  professionalSkillsJson: string | null;
  phone: string | null;
};

export function ProfessionalProfileSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skillList, setSkillList] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [location, setLocation] = useState<[number, number]>([20.5937, 78.9629]);
  const [serviceRadiusKm, setServiceRadiusKm] = useState<string>("25");
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [segment, setSegment] = useState("RESIDENTIAL");
  const [workMode, setWorkMode] = useState("both");
  const [category, setCategory] = useState("");
  const [showSetupReminder, setShowSetupReminder] = useState(false);
  const isEdit = Boolean(profile?.professionalCategory);
  const availableCategories = categories.filter(
    (item) =>
      item.segment === segment &&
      (item.parentId !== null || !categories.some((child) => child.parentId === item.id)),
  );

  useEffect(() => {
    if (searchParams.get("profileSetup") !== "1") return;
    setShowSetupReminder(true);
    const timeout = window.setTimeout(() => setShowSetupReminder(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    void fetch("/api/v1/marketplace/categories")
      .then((response) => (response.ok ? response.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/professional/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { profile?: Profile | null } | null) => {
        if (!data?.profile) return;
        setProfile(data.profile);
        setCategory(data.profile.professionalCategory ?? "");
        const savedWorkMode = data.profile.workMode?.toLowerCase();
        setWorkMode(
          savedWorkMode === "remote" || savedWorkMode === "on_site" ? savedWorkMode : "both",
        );
        if (
          data.profile.professionalLatitude !== null &&
          data.profile.professionalLongitude !== null
        ) {
          setLocation([data.profile.professionalLatitude, data.profile.professionalLongitude]);
        }
        if (data.profile.serviceRadiusKm !== null) {
          setServiceRadiusKm(data.profile.serviceRadiusKm.toString());
        }
        try {
          const savedSkills = JSON.parse(data.profile.professionalSkillsJson ?? "[]") as unknown;
          setSkillList(
            Array.isArray(savedSkills)
              ? savedSkills.filter((skill): skill is string => typeof skill === "string")
              : [],
          );
        } catch {
          setSkillList([]);
        }
      });
  }, []);

  useEffect(() => {
    if (!profile?.professionalCategory || !categories.length) return;
    const savedCategory = categories.find((item) => item.name === profile.professionalCategory);
    if (savedCategory) setSegment(savedCategory.segment);
  }, [categories, profile]);

  function addSkill(value: string) {
    const skill = value.trim().replace(/,$/, "");
    if (!skill || skillList.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    setSkillList((current) => [...current, skill]);
    setSkillDraft("");
  }

  function removeSkill(skill: string) {
    setSkillList((current) => current.filter((item) => item !== skill));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) {
      setError("Choose a service category.");
      return;
    }
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/professional/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category,
        experienceYears: form.get("experienceYears") ? Number(form.get("experienceYears")) : null,
        hourlyRate: form.get("hourlyRate") ? Number(form.get("hourlyRate")) : null,
        serviceRadiusKm:
          workMode === "remote" ? null : serviceRadiusKm ? Number(serviceRadiusKm) : null,
        latitude: location[0],
        longitude: location[1],
        workMode: form.get("workMode"),
        bio: form.get("bio"),
        skills: skillList,
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to save your professional profile.");
      return;
    }
    router.push(isEdit ? "/professional-profile" : "/professional/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/35">
      {showSetupReminder ? (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg"
        >
          <p className="font-semibold">Your profile setup is remaining.</p>
          <p className="mt-1 text-amber-800">Complete your profile to continue.</p>
        </div>
      ) : null}
      <header className="border-b border-border/70 bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <Link
            href={
              isEdit ? "/professional-profile" : "/login?next=/professional/setup&profileSetup=1"
            }
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Professional workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {isEdit ? "Edit your professional profile" : "Set up your professional profile"}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {isEdit
              ? "Update your service details, location, and service radius."
              : "Add the essentials clients need before they can hire you."}
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-soft sm:p-8"
          >
            <PhoneVerification role="PROFESSIONAL" initialPhone={profile?.phone} />
            <div className="space-y-1.5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="service-segment">Service</Label>
                  <select
                    id="service-segment"
                    value={segment}
                    onChange={(event) => {
                      setSegment(event.target.value);
                      setCategory("");
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {serviceOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a category</option>
                    {category && !availableCategories.some((item) => item.name === category) && (
                      <option value={category}>{category} (please reselect)</option>
                    )}
                    {availableCategories.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="experienceYears"
                label="Years of experience"
                type="number"
                defaultValue={profile?.experienceYears?.toString()}
              />
              <Field
                name="hourlyRate"
                label="Hourly rate"
                type="number"
                defaultValue={profile?.hourlyRate?.toString()}
              />
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Service location</Label>
                <p className="text-sm text-muted-foreground">
                  Click the map or drag the pin to choose where you provide services.
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-border shadow-sm">
                <LeafletMap
                  point={location}
                  onPointChange={(latitude, longitude) => setLocation([latitude, longitude])}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition((position) =>
                    setLocation([position.coords.latitude, position.coords.longitude]),
                  )
                }
              >
                Use my current location
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workMode">Work mode</Label>
              <select
                id="workMode"
                name="workMode"
                value={workMode}
                onChange={(event) => setWorkMode(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="both">Hybrid / both</option>
                <option value="remote">Remote</option>
                <option value="on_site">On-site</option>
              </select>
            </div>
            {workMode !== "remote" && (
              <div className="space-y-1.5">
                <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
                <Input
                  id="serviceRadiusKm"
                  type="number"
                  min="1"
                  max="500"
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(e.target.value)}
                  placeholder="25"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  How far you're willing to travel or work. Defaults to 25 km.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="skill-entry">Skills</Label>
              <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 shadow-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
                {skillList.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary/15 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="rounded-full text-primary/60 transition hover:text-destructive"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  id="skill-entry"
                  value={skillDraft}
                  onChange={(event) => setSkillDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addSkill(skillDraft);
                    }
                  }}
                  placeholder={skillList.length ? "Add another skill" : "e.g. Kubernetes, SQL..."}
                  className="h-7 min-w-[160px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillDraft)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Add skill"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Recommended:</span>
                {getRecommendedSkills(category)
                  .filter(
                    (skill) =>
                      !skillList.some((item) => item.toLowerCase() === skill.toLowerCase()),
                  )
                  .map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSkill(skill)}
                      className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      + {skill}
                    </button>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or use + to add a custom skill.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">About your services</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile?.companyDescription ?? ""}
                rows={4}
                placeholder="Tell clients what you do and how you can help."
                className="resize-none"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-11 w-full" disabled={pending}>
              {pending ? "Saving..." : isEdit ? "Save changes" : "Save profile and open dashboard"}
            </Button>
          </form>
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Build trust</p>
                  <p className="text-xs text-muted-foreground">Complete profiles get noticed.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <p className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  Verify your phone number.
                </p>
                <p className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  Add your service location.
                </p>
                <p className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  Show clients what you do best.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm leading-6 text-muted-foreground">
              Your profile details help clients find the right professional for their project.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-11"
      />
    </div>
  );
}
