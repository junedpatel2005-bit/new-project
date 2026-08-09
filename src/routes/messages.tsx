"use client";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { professionals } from "@/lib/mock-data";
import { Search, Paperclip, Send, Phone, Video, MoreHorizontal, Smile } from "lucide-react";
import { useState } from "react";

const conversations = professionals.slice(0, 6).map((p, i) => ({
  id: p.id,
  pro: p,
  preview: [
    "Sounds good — I can start Monday.",
    "Sent you the revised quote.",
    "Photos uploaded ✅",
    "On my way!",
    "Thanks for the review!",
    "Are we still on for tomorrow?",
  ][i],
  time: ["2m", "1h", "3h", "Yesterday", "2d", "1w"][i],
  unread: i < 2 ? 2 - i : 0,
  job: [
    "Shopify storefront",
    "Brand identity",
    "Plumbing repair",
    "Wedding photo",
    "SEO audit",
    "Tutoring",
  ][i],
}));

const sample = [
  {
    mine: false,
    text: "Hi! Thanks for sending the brief — I had a few clarifying questions.",
    time: "10:24 AM",
  },
  { mine: true, text: "Of course, fire away.", time: "10:25 AM" },
  {
    mine: false,
    text: "Are you open to using Hydrogen for the storefront, or do you prefer Liquid?",
    time: "10:26 AM",
  },
  { mine: true, text: "Hydrogen sounds great — better performance long term.", time: "10:28 AM" },
  {
    mine: false,
    text: "Perfect. I'll send a revised proposal with the timeline by EOD.",
    time: "10:29 AM",
  },
];

export default function Messages() {
  const [active, setActive] = useState(conversations[0]);
  if (!active) return null;
  return (
    <AppShell title="Messages">
      <div className="grid h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <aside className="border-r border-border">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search conversations" className="pl-9" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors ${active.id === c.id ? "bg-primary/5" : "hover:bg-muted"}`}
              >
                <img src={c.pro.avatar} className="h-10 w-10 rounded-full" alt="" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-display text-sm font-semibold">{c.pro.name}</p>
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                  <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-primary">
                    re: {c.job}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-cta text-[10px] font-bold text-cta-foreground">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-h-0 flex-col">
          <header className="flex items-center gap-3 border-b border-border p-4">
            <img src={active.pro.avatar} className="h-10 w-10 rounded-full" alt="" />
            <div className="flex-1">
              <p className="font-display text-sm font-semibold">{active.pro.name}</p>
              <p className="text-xs text-muted-foreground">re: {active.job}</p>
            </div>
            <div className="flex gap-1 text-muted-foreground">
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                <Phone className="h-4 w-4" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                <Video className="h-4 w-4" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-6">
            {sample.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-soft ${m.mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
                >
                  <p>{m.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${m.mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <footer className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <Paperclip className="h-4 w-4" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <Smile className="h-4 w-4" />
              </button>
              <Input placeholder="Type a message…" className="flex-1" />
              <Button className="bg-cta text-cta-foreground hover:bg-cta/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </AppShell>
  );
}
