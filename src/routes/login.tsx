"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Login() {
  const router = useRouter();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [buttonScale, setButtonScale] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  useEffect(() => {
    setOauthError(new URLSearchParams(window.location.search).get("oauthError"));
  }, []);
  async function submit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const nextFieldErrors = { email: "", password: "" };
    if (!email) nextFieldErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextFieldErrors.email = "Enter a valid email.";
    if (!password) nextFieldErrors.password = "Password is required.";

    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      setError("Please fix the highlighted fields before signing in.");
      return;
    }

    // Button press animation
    setButtonScale(0.96);
    setTimeout(() => setButtonScale(1), 150);

    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json()) as { error?: string; redirect?: string };
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Unable to sign in.");
      // Shake animation on error
      setButtonScale(1.02);
      setTimeout(() => setButtonScale(0.98), 50);
      setTimeout(() => setButtonScale(1.02), 100);
      setTimeout(() => setButtonScale(1), 150);
    } else {
      // Success animation
      setLoginSuccess(true);
      setShowOverlay(true);
      setTimeout(() => {
        router.push(result.redirect ?? "/dashboard");
      }, 1200);
    }
  }
  return (
    <>
      <AuthLayout
        title="Welcome back"
        subtitle="Log in to continue to your dashboard."
        footer={
          <>
            Don't have an account?{" "}
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
              window.location.href = "/api/auth/google";
            }}
          >
            Continue with Google
          </Button>
          {oauthError === "google-not-configured" && (
            <p className="text-sm text-destructive">Google sign-in has not been configured yet.</p>
          )}
          {oauthError === "google-failed" && (
            <p className="text-sm text-destructive">
              Google sign-in could not be completed. Please try again.
            </p>
          )}
          <div className="relative py-2 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-background px-3">or</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              className={fieldErrors.email ? "border-destructive" : ""}
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
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
              placeholder="••••••••"
              aria-invalid={Boolean(fieldErrors.password)}
              className={fieldErrors.password ? "border-destructive" : ""}
            />
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className={cn(
              "w-full transition-transform duration-150",
              loginSuccess && "bg-green-600 hover:bg-green-600",
            )}
            disabled={pending}
            style={{ transform: `scale(${buttonScale})` }}
          >
            {loginSuccess ? (
              <span className="inline-flex items-center gap-2 text-green-50">
                <CheckCircle2 className="h-4 w-4 animate-bounce" /> Signed in!
              </span>
            ) : pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Log in <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </AuthLayout>
      {showOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
          <div className="text-center animate-slide-up">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-scale-in">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Welcome back!</h2>
            <p className="mt-2 text-muted-foreground">Redirecting to your dashboard…</p>
            <div className="mt-6 flex justify-center gap-1">
              <div
                className="h-2 w-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2 w-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2 w-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
