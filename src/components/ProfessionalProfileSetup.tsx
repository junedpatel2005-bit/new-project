"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profile = {
  professionalCategory: string | null;
  professionalCity: string | null;
  experienceYears: number | null;
  hourlyRate: number | null;
  serviceArea: string | null;
  workMode: string;
  companyDescription: string | null;
  professionalSkillsJson: string | null;
};

export function ProfessionalProfileSetup() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skills, setSkills] = useState("");

  useEffect(() => {
    void fetch("/api/professional/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { profile?: Profile | null } | null) => {
        if (!data?.profile) return;
        setProfile(data.profile);
        try {
          setSkills(
            (JSON.parse(data.profile.professionalSkillsJson ?? "[]") as string[]).join(", "),
          );
        } catch {
          setSkills("");
        }
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/professional/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: form.get("category"),
        city: form.get("city"),
        experienceYears: form.get("experienceYears") ? Number(form.get("experienceYears")) : null,
        hourlyRate: form.get("hourlyRate") ? Number(form.get("hourlyRate")) : null,
        serviceArea: form.get("serviceArea"),
        workMode: form.get("workMode"),
        bio: form.get("bio"),
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(result?.error ?? "Unable to save your professional profile.");
      return;
    }
    router.push("/professional/dashboard");
  }

  return (
    <AuthLayout
      title="Set up your professional profile"
      subtitle="Add the essentials clients need before they can hire you."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="category"
            label="Service category"
            required
            defaultValue={profile?.professionalCategory}
            placeholder="Designer, electrician…"
          />
          <Field
            name="city"
            label="Your city"
            required
            defaultValue={profile?.professionalCity}
            placeholder="Surat"
          />
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
        <Field
          name="serviceArea"
          label="Service area"
          defaultValue={profile?.serviceArea}
          placeholder="Surat and nearby areas"
        />
        <div className="space-y-1.5">
          <Label htmlFor="workMode">Work mode</Label>
          <select
            id="workMode"
            name="workMode"
            defaultValue={profile?.workMode ?? "both"}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="both">Hybrid / both</option>
            <option value="remote">Remote</option>
            <option value="on_site">On-site</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skills">Skills</Label>
          <Input
            id="skills"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Figma, UI design, React"
          />
          <p className="text-xs text-muted-foreground">Separate skills with commas.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">About your services</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile?.companyDescription ?? ""}
            rows={4}
            placeholder="Tell clients what you do and how you can help."
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save profile and open dashboard"}
        </Button>
      </form>
    </AuthLayout>
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
      />
    </div>
  );
}
