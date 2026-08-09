"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileSetup({ role }: { role: "client" | "professional" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isClient = role === "client";

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) setError(result.error ?? "Unable to save your profile.");
    else router.push(isClient ? "/dashboard" : "/discover");
  }

  return (
    <AuthLayout
      title={isClient ? "Set up your client profile" : "Set up your professional profile"}
      subtitle={isClient ? "Tell professionals a little about your business." : "Help clients find the work you do."}
    >
      <form action={submit} className="space-y-4">
        {isClient ? <ClientFields /> : <ProfessionalFields />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save and continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function Field({ name, label, type = "text", required = false, placeholder }: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} required={required} placeholder={placeholder} /></div>;
}

function ClientFields() {
  return <>
    <Field name="fullName" label="Full name" required placeholder="Jane Doe" />
    <Field name="phone" label="Phone number" type="tel" required placeholder="+1 555 123 4567" />
    <Field name="companyName" label="Company name" required placeholder="Acme Inc." />
    <Field name="address" label="Business address" required placeholder="123 Main Street" />
    <Field name="companyWebsite" label="Website (optional)" type="url" placeholder="https://example.com" />
    <Field name="industry" label="Industry (optional)" placeholder="Construction, retail…" />
  </>;
}

function ProfessionalFields() {
  return <>
    <Field name="category" label="Service category" required placeholder="Electrician, designer…" />
    <Field name="city" label="Your city" required placeholder="New York" />
    <Field name="experienceYears" label="Years of experience" type="number" placeholder="5" />
    <Field name="hourlyRate" label="Hourly rate" type="number" placeholder="50" />
    <Field name="serviceArea" label="Service area (optional)" placeholder="Brooklyn and Manhattan" />
  </>;
}
