"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = {
  client: { email: "seed.client@servio.example", password: "ServioSeed#2026" },
  professional: { email: "surat.pro@servio.example", password: "ServioSeed#2026" },
} as const;

export default function Login() {
  const router = useRouter();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [buttonScale, setButtonScale] = useState(1);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function quickFill(role: "" | keyof typeof DEMO_ACCOUNTS) {
    if (!role) return;
    const account = DEMO_ACCOUNTS[role];
    if (emailRef.current) emailRef.current.value = account.email;
    if (passwordRef.current) passwordRef.current.value = account.password;
    setFieldErrors({ email: "", password: "" });
    setError(null);
    passwordRef.current?.focus();
  }

  useEffect(() => {
    setOauthError(new URLSearchParams(window.location.search).get("oauthError"));
  }, []);

  async function submit(formData: FormData) {
    if (pending) return;
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextFieldErrors = {
      email: !email
        ? "Email is required."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? "Enter a valid email."
          : "",
      password: !password ? "Password is required." : "",
    };

    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      setError("Please fix the highlighted fields before signing in.");
      return;
    }

    setButtonScale(0.97);
    setTimeout(() => setButtonScale(1), 150);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string; redirect?: string };
      if (!response.ok) {
        setError(result.error ?? "Unable to sign in.");
        return;
      }
      router.push(result.redirect ?? "/dashboard");
    } catch {
      setError("Unable to sign in. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your dashboard."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup?role=client" className="text-primary hover:underline">
            Sign up as a client
          </Link>{" "}
          or{" "}
          <Link href="/signup?role=pro" className="text-primary hover:underline">
            Sign up as a professional
          </Link>
        </>
      }
    >
      <form action={submit} className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            window.location.href = "/api/v1/auth/google";
          }}
        >
          Continue with Google
        </Button>
        {oauthError === "google-not-configured" ? (
          <p className="text-sm text-destructive">Google sign-in has not been configured yet.</p>
        ) : null}
        {oauthError === "google-failed" ? (
          <p className="text-sm text-destructive">
            Google sign-in could not be completed. Please try again.
          </p>
        ) : null}
        <div className="relative py-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-3">or</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>
        <div className="space-y-1.5 rounded-lg border border-dashed border-amber-400/60 bg-amber-400/10 p-3">
          <Label htmlFor="quickFill" className="text-amber-700">
            Quick fill — temporary, for testing only
          </Label>
          <select
            id="quickFill"
            defaultValue=""
            onChange={(event) => {
              quickFill(event.target.value as "" | keyof typeof DEMO_ACCOUNTS);
              event.target.value = "";
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a demo account…</option>
            <option value="client">Client</option>
            <option value="professional">Professional</option>
          </select>
          <p className="text-xs text-amber-700">
            Fills the email and password below — just press Enter to log in.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            ref={emailRef}
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            className={fieldErrors.email ? "border-destructive" : ""}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            ref={passwordRef}
            placeholder="••••••••"
            aria-invalid={Boolean(fieldErrors.password)}
            className={fieldErrors.password ? "border-destructive" : ""}
          />
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={cn(
            "relative w-full overflow-hidden transition-transform duration-150",
            pending && "cursor-wait",
          )}
          style={{ transform: `scale(${buttonScale})` }}
        >
          {pending ? (
            <>
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25 animate-login-button-shimmer"
              />
              <span className="relative inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in
                <span className="inline-flex gap-0.5">
                  <i className="h-1 w-1 animate-login-dot rounded-full bg-current" />
                  <i className="h-1 w-1 animate-login-dot rounded-full bg-current [animation-delay:140ms]" />
                  <i className="h-1 w-1 animate-login-dot rounded-full bg-current [animation-delay:280ms]" />
                </span>
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-2">
              Log in <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
