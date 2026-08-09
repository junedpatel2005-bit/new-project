"use client";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Verify() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const set = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setCode(next);
    if (next[index] && index < 5) refs.current[index + 1]?.focus();
  };

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

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a 6-digit verification code to your email. It expires in 15 minutes."
      footer={<button type="button" onClick={() => void resend()} className="text-primary hover:underline">Resend code</button>}
    >
      <div className="flex justify-between gap-2">
        {code.map((value, index) => (
          <input
            key={index}
            ref={(element) => { refs.current[index] = element; }}
            value={value}
            onChange={(event) => set(index, event.target.value)}
            onKeyDown={(event) => { if (event.key === "Backspace" && !value && index > 0) refs.current[index - 1]?.focus(); }}
            className="h-14 w-12 rounded-xl border border-input bg-card text-center text-xl font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
          />
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-4 text-sm text-success">{message}</p>}
      <Button type="button" onClick={() => void verify()} className="mt-6 w-full" disabled={pending || code.some((digit) => !digit)}>
        {pending ? "Verifying…" : "Verify and continue"}
      </Button>
    </AuthLayout>
  );
}
