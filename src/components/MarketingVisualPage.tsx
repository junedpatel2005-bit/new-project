"use client";

import Link from "next/link";
import { useState } from "react";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  MarketingPageContent,
  MarketingPageId,
  MarketingItem,
} from "@/lib/marketing-cms-shared";

const iconMap = {
  shield: ShieldCheck,
  briefcase: Briefcase,
  users: Users,
  map: MapPin,
  search: Search,
  arrow: Award,
  clipboard: CheckCircle2,
  message: MessageCircle,
  wallet: Wallet,
  clock: Clock,
  trend: TrendingUp,
  check: Check,
  star: Star,
  mail: Mail,
};

export default function MarketingVisualPage({
  page,
  content,
  cmsMode = false,
  onChange,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  page: MarketingPageId;
  content: MarketingPageContent;
  cmsMode?: boolean;
  onChange?: (content: MarketingPageContent) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}) {
  const editHero = (field: keyof MarketingPageContent["hero"], value: string) =>
    onChange?.({ ...content, hero: { ...content.hero, [field]: value } });
  const sensors = useSensor(PointerSensor, { activationConstraint: { distance: 6 } });
  const updateOrder = (active: string, over: string) => {
    const from = content.items.findIndex((item) => item.id === active);
    const to = content.items.findIndex((item) => item.id === over);
    if (from >= 0 && to >= 0) onChange?.({ ...content, items: arrayMove(content.items, from, to) });
  };
  const text = (value: string, field: keyof MarketingPageContent["hero"], className: string) => (
    <span
      className={className}
      contentEditable={cmsMode}
      suppressContentEditableWarning={cmsMode}
      onInput={(event) => editHero(field, event.currentTarget.textContent ?? "")}
    >
      {value}
    </span>
  );
  return (
    <div className="min-h-screen bg-background">
      <main>
        <section
          className={`gradient-hero ${page === "for-professionals" ? "bg-ink text-ink-foreground" : ""}`}
        >
          <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
            {text(
              content.hero.label,
              "label",
              "text-xs font-semibold uppercase tracking-wider text-primary",
            )}
            <h1
              className={`font-display mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl ${page === "for-professionals" ? "text-black" : ""}`}
            >
              {text(content.hero.title, "title", "")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {text(content.hero.description, "description", "")}
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <DndContext
            sensors={[sensors]}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              if (cmsMode && event.over && event.active.id !== event.over.id)
                updateOrder(String(event.active.id), String(event.over.id));
            }}
          >
            <SortableContext
              items={content.items.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className={`grid gap-6 ${content.items.length === 1 ? "mx-auto max-w-md" : content.items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}
              >
                {content.items.map((item) => (
                  <MarketingItemCard
                    key={item.id}
                    item={item}
                    cmsMode={cmsMode}
                    selected={selectedId === item.id}
                    onSelect={() => onSelect?.(item.id)}
                    onChange={(changes) =>
                      onChange?.({
                        ...content,
                        items: content.items.map((current) =>
                          current.id === item.id ? { ...current, ...changes } : current,
                        ),
                      })
                    }
                    onDelete={() => onDelete?.(item.id)}
                    onDuplicate={() => onDuplicate?.(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
        {page === "contact" ? (
          <ContactForm />
        ) : page === "pricing" ? (
          <p className="mx-auto max-w-7xl px-4 pb-20 text-center text-sm text-muted-foreground">
            Need something custom?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
            .
          </p>
        ) : (
          <CTA />
        )}
      </main>
    </div>
  );
}

function MarketingItemCard({
  item,
  cmsMode,
  selected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}: {
  item: MarketingItem;
  cmsMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<MarketingItem>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? ShieldCheck;
  const editable = (field: "title" | "description") =>
    cmsMode
      ? {
          contentEditable: true,
          suppressContentEditableWarning: true,
          onPointerDown: (event: React.PointerEvent<HTMLElement>) => event.stopPropagation(),
          onInput: (event: React.FormEvent<HTMLElement>) =>
            onChange({ [field]: event.currentTarget.textContent ?? "" }),
        }
      : {};
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(cmsMode ? attributes : {})}
      {...(cmsMode ? listeners : {})}
      onClick={cmsMode ? onSelect : undefined}
      className={`relative rounded-2xl border border-border bg-card p-7 shadow-soft ${cmsMode ? "cursor-grab active:cursor-grabbing" : ""} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${isDragging ? "z-10 scale-[1.02] opacity-70 shadow-2xl" : ""}`}
    >
      <Icon className="h-7 w-7 text-primary" />
      <h2 className="mt-5 font-display text-xl font-semibold" {...editable("title")}>
        {item.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground" {...editable("description")}>
        {item.description}
      </p>
      {cmsMode && selected && (
        <div
          className="absolute -top-3 right-3 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <label>
            Icon{" "}
            <select
              value={item.icon}
              onChange={(e) => onChange({ icon: e.target.value })}
              className="bg-background"
            >
              <option value="shield">Shield</option>
              <option value="briefcase">Briefcase</option>
              <option value="users">Users</option>
              <option value="map">Map</option>
              <option value="search">Search</option>
              <option value="wallet">Wallet</option>
              <option value="check">Check</option>
            </select>
          </label>
          <button type="button" onClick={onDelete} className="text-destructive">
            Delete
          </button>
          <button type="button" onClick={onDuplicate} className="text-primary">
            Duplicate
          </button>
        </div>
      )}
    </article>
  );
}
function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-primary p-10 text-white md:p-14">
        <h3 className="font-display text-3xl font-bold">Get started today</h3>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-cta text-cta-foreground">
            <Link href="/post-job">Post a Job</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-white"
          >
            <Link href="/signup">Become a Pro</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    const response = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string };
    setSending(false);
    setSent(
      response.ok
        ? "Thanks — our team will get back to you shortly."
        : (data.error ?? "Unable to send your message."),
    );
    if (response.ok) setForm({ name: "", email: "", subject: "", message: "" });
  };
  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-16 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <Mail className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-display text-xl font-semibold">Email support</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          For account, project, or payment questions, send us a message any time.
        </p>
      </div>
      <form
        className="rounded-3xl border border-border bg-card p-6 shadow-elevated sm:p-8"
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-semibold">Send a message</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Your name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium">
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Subject
          <input
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Message
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm"
          />
        </label>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{sent}</p>
          <Button disabled={sending} className="bg-cta text-cta-foreground">
            {sending ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
    </section>
  );
}
