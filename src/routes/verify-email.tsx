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
        const result = (await response.json()) as { error?: string; redirect?: string };
        if (!response.ok) {
          setStatus("error");
          setError(result.error ?? "This verification link is invalid or has expired.");
          return;
        }
        setStatus("success");
        setTimeout(() => router.push(result.redirect ?? "/dashboard"), 1200);
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
        <p className="text-sm text-success">Email confirmed. Redirecting you now…</p>
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
