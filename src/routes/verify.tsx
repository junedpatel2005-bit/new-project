"use client";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Verify() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setCode(next);
    if (next[index] && index < 5) refs.current[index + 1]?.focus();
  };

  useEffect(() => {
    void fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        setUserEmail(result.user?.email ?? null);
      })
      .catch(() => null);
  }, []);

  async function verify() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: code.join("") }),
    });
    const result = (await response.json()) as { error?: string; redirect?: string };
    setPending(false);
    if (!response.ok) setError(result.error ?? "Unable to verify your email.");
    else router.push(result.redirect ?? "/dashboard");
  }

  async function resend() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Unable to resend the code.");
    else setMessage("A new code has been sent to your email.");
  }

  async function updateEmail() {
    setEmailError(null);
    setEmailMessage(null);
    const response = await fetch("/api/auth/update-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    const result = (await response.json()) as {
      error?: string;
      fields?: Record<string, string>;
      message?: string;
      email?: string;
    };
    if (!response.ok) {
      setEmailError(result.fields?.email ?? result.error ?? "Unable to update email.");
      return;
    }
    setUserEmail(result.email ?? newEmail.trim());
    setEditingEmail(false);
    setEmailMessage(result.message ?? "Email updated. A new code has been sent.");
    setCode(["", "", "", "", "", ""]);
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a 6-digit verification code to your email. It expires in 15 minutes."
      footer={
        <button
          type="button"
          onClick={() => void resend()}
          className="text-primary hover:underline"
        >
          Resend code
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit verification code to {userEmail ? userEmail : "your email"}. It expires
          in 15 minutes.
        </p>
        {editingEmail ? (
          <div className="space-y-3 rounded-2xl border border-border bg-muted p-4">
            <Label htmlFor="new-email">Edit email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(event) => {
                setNewEmail(event.target.value);
                setEmailError(null);
              }}
              placeholder="you@company.com"
              className="w-full"
            />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            {emailMessage && <p className="text-sm text-success">{emailMessage}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void updateEmail()} className="grow">
                Update email
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingEmail(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingEmail((current) => !current);
                setNewEmail(userEmail ?? "");
                setEmailError(null);
                setEmailMessage(null);
              }}
            >
              Change email
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/")}>
              Later
            </Button>
          </div>
          {emailMessage && <p className="text-sm text-success">{emailMessage}</p>}
        </div>
      </div>
      <div className="flex justify-between gap-2">
        {code.map((value, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            value={value}
            onChange={(event) => set(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !value && index > 0)
                refs.current[index - 1]?.focus();
            }}
            className="h-14 w-12 rounded-xl border border-input bg-card text-center text-xl font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
          />
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-4 text-sm text-success">{message}</p>}
      <Button
        type="button"
        onClick={() => void verify()}
        className="mt-6 w-full"
        disabled={pending || code.some((digit) => !digit)}
      >
        {pending ? "Verifying…" : "Verify and continue"}
      </Button>
    </AuthLayout>
  );
}
