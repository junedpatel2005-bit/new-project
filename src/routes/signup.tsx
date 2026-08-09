"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "pro">("client");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        password: formData.get("password"),
        role: role === "pro" ? "PROFESSIONAL" : "CLIENT",
        terms: formData.get("terms") === "on",
      }),
    });
    const result = (await response.json()) as { error?: string; redirect?: string };
    setPending(false);
    if (!response.ok) setError(result.error ?? "Unable to create your account.");
    else router.push(result.redirect ?? "/client-profile");
  }
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join 50,000+ clients and pros on Servio."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {(["client", "pro"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              role === r ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
            }`}
          >
            I'm a {r === "client" ? "client" : "professional"}
          </button>
        ))}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        {role === "client"
          ? "Create an account to post jobs and hire trusted professionals."
          : "Create a professional account to showcase your services and find work."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mb-4 w-full"
        onClick={() => {
          window.location.href = `/api/auth/google?role=${role === "pro" ? "PROFESSIONAL" : "CLIENT"}`;
        }}
      >
        Continue with Google
      </Button>
      <form action={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input id="first" name="firstName" required placeholder="Jane" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" name="lastName" required placeholder="Doe" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="At least 8 characters"
          />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input name="terms" type="checkbox" required className="mt-0.5 h-4 w-4 accent-primary" />I
          agree to the Terms and Privacy Policy.
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <a className="underline" href="#">
            Terms
          </a>{" "}
          and{" "}
          <a className="underline" href="#">
            Privacy
          </a>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
