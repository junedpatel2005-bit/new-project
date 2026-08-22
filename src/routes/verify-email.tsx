"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/dashboard");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setError("This verification link is invalid or has expired.");
      return;
    }
    void fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.text();
        let result: { error?: string; redirect?: string } = {};
        try {
          result = JSON.parse(body) as { error?: string; redirect?: string };
        } catch {
          result.error = `Verification request failed (${response.status}).`;
        }
        if (!response.ok) {
          setStatus("error");
          setError(result.error ?? "This verification link is invalid or has expired.");
          return;
        }
        setStatus("success");
        setNextPath(result.redirect ?? "/dashboard");
      })
      .catch(() => {
        setStatus("error");
        setError("Unable to verify your email. Please try again.");
      });
  }, [params, router]);

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle={
        status === "verifying"
          ? "Confirming your email address…"
          : status === "success"
            ? "Your email is confirmed."
            : "We couldn't confirm your email."
      }
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      {status === "verifying" && (
        <p className="text-sm text-muted-foreground">Please wait a moment…</p>
      )}
      {status === "success" && (
        <div className="space-y-4">
          <p className="text-sm text-success">Your account is verified successfully.</p>
          <Button className="w-full" onClick={() => router.push(nextPath)}>
            Continue to your account
          </Button>
        </div>
      )}
      {status === "error" && (
        <div className="space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button asChild className="w-full">
            <Link href="/verify">Resend confirmation link</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
