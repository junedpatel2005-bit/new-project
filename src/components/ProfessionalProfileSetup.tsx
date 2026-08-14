"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LeafletMap = dynamic(() => import("@/components/LeafletAddressMap"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
});

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
};

export function ProfessionalProfileSetup() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState<[number, number]>([20.5937, 78.9629]);
  const [serviceRadiusKm, setServiceRadiusKm] = useState<string>("25");

  useEffect(() => {
    void fetch("/api/v1/professional/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { profile?: Profile | null } | null) => {
        if (!data?.profile) return;
        setProfile(data.profile);
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
    const response = await fetch("/api/v1/professional/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: form.get("category"),
        experienceYears: form.get("experienceYears") ? Number(form.get("experienceYears")) : null,
        hourlyRate: form.get("hourlyRate") ? Number(form.get("hourlyRate")) : null,
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : null,
        latitude: location[0],
        longitude: location[1],
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
        <Field
          name="category"
          label="Service category"
          required
          defaultValue={profile?.professionalCategory}
          placeholder="Designer, electrician..."
        />
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
          <LeafletMap
            point={location}
            onPointChange={(latitude, longitude) => setLocation([latitude, longitude])}
          />
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
          <Label htmlFor="serviceRadiusKm">Service radius (km)</Label>
          <Input
            id="serviceRadiusKm"
            type="number"
            min="1"
            max="500"
            value={serviceRadiusKm}
            onChange={(e) => setServiceRadiusKm(e.target.value)}
            placeholder="25"
          />
          <p className="text-xs text-muted-foreground">
            How far you're willing to travel or work. Defaults to 25 km.
          </p>
        </div>
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
          {pending ? "Saving..." : "Save profile and open dashboard"}
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
