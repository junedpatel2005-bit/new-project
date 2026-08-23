"use client";

import { useState } from "react";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    const response = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSending(false);
    setMessage(
      response.ok
        ? "Thanks — our team will get back to you shortly."
        : (data.error ?? "Unable to send your message."),
    );
    if (response.ok) setForm({ name: "", email: "", subject: "", message: "" });
  };
  return (
    <div className="min-h-screen bg-background">
      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Contact Klick-Pro
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              How can we help?
            </h1>
            <p className="mt-4 text-muted-foreground">
              Tell us what you need and our marketplace team will be in touch.
            </p>
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl gap-8 px-4 py-16 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-display text-xl font-semibold">Email support</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                For account, project, or payment questions, send us a message any time.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <ShieldCheck className="h-6 w-6 text-success" />
              <h2 className="mt-4 font-display text-xl font-semibold">Safe & private</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your request is only visible to the Klick-Pro support team.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => void submit(event)}
            className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Send a message</h2>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Your name", "text"],
                  ["email", "Email address", "email"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key} className="text-sm font-medium">
                  {label}
                  <input
                    required
                    type={type}
                    value={form[key]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium">
              Subject
              <input
                required
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Message
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button disabled={sending} className="bg-cta text-cta-foreground hover:bg-cta/90">
                {sending ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
