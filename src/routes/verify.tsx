"use client";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Verify() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/auth/me")
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        setUserEmail(result.user?.email ?? null);
      })
      .catch(() => null);
  }, []);

  async function resend() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/v1/auth/resend-verification", { method: "POST" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Unable to resend the confirmation link.");
    else setMessage("A new confirmation link has been sent to your email.");
  }

  async function updateEmail() {
    setEmailError(null);
    setEmailMessage(null);
    const response = await fetch("/api/v1/auth/update-email", {
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
    setEmailMessage(result.message ?? "Email updated. A new confirmation link has been sent.");
  }

  return (
    <AuthLayout
      title="Confirm your email"
      subtitle="We sent a confirmation link to your email. Click it to activate your account."
      footer={
        <button
          type="button"
          onClick={() => void resend()}
          className="text-primary hover:underline"
        >
          Resend confirmation link
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to {userEmail ? userEmail : "your email"}. Open it on this
          device or any other to activate your account. The link expires in 24 hours.
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
          {!editingEmail && emailMessage && <p className="text-sm text-success">{emailMessage}</p>}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
    </AuthLayout>
  );
}
