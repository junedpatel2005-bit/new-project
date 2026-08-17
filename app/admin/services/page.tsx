"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Segment = "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL";
type Service = {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  segment?: Segment;
  parentId: number | null;
  sortOrder: number;
};
const segments: Segment[] = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"];
const segmentLabel = (segment: Segment | undefined) => {
  const value = segment || "RESIDENTIAL";
  return value[0] + value.slice(1).toLowerCase();
};
const segmentColor: Record<Segment, string> = {
  RESIDENTIAL: "bg-indigo-400/10 text-indigo-300",
  COMMERCIAL: "bg-cyan-400/10 text-cyan-300",
  INDUSTRIAL: "bg-amber-400/10 text-amber-300",
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    segment: Segment;
    parentId: number | null;
  }>({
    name: "",
    description: "",
    segment: "RESIDENTIAL",
    parentId: null,
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewSegment, setViewSegment] = useState<Segment | "">("");
  const topLevel = useMemo(() => services.filter((item) => item.parentId === null), [services]);
  const visibleTopLevel = useMemo(
    () => topLevel.filter((item) => !viewSegment || item.segment === viewSegment),
    [topLevel, viewSegment],
  );
  const load = () =>
    void fetch("/api/v1/admin/services", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.services) return setServices(data.services);
        setMessage(data.error ?? "Could not load services.");
      })
      .catch(() => setMessage("Could not load services."));
  useEffect(load, []);
  const add = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/v1/admin/services", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(data.error ?? "Could not add service.");
    setServices((current) => [...current, data.service]);
    setForm({ name: "", description: "", segment: "RESIDENTIAL", parentId: null });
    setMessage("Service added to the website.");
  };
  const remove = async (service: Service) => {
    if (!window.confirm(`Delete ${service.name}?`)) return;
    const response = await fetch(`/api/v1/admin/services?id=${service.id}`, { method: "DELETE" });
    if (response.ok) {
      setServices((current) =>
        current.filter((item) => item.id !== service.id && item.parentId !== service.id),
      );
      setMessage("Service deleted.");
    }
  };
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
        Marketplace management
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">Services</h1>
      <p className="mt-2 text-slate-400">
        Add or delete the service categories shown on the public Services page.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={(event) => void add(event)}
          className="h-fit rounded-2xl border border-white/10 bg-white/[.035] p-5"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-400" />
            <h2 className="font-semibold">Add service</h2>
          </div>
          <label className="mt-5 block text-sm text-slate-300">
            Service name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Home Cleaning"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Short description
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Describe this service"
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <div className="mt-4">
            <p className="text-sm text-slate-300">Category</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-[#0b1020] p-1">
              {segments.map((segment) => (
                <button
                  key={segment}
                  type="button"
                  onClick={() => setForm({ ...form, segment })}
                  className={`truncate rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    form.segment === segment
                      ? "bg-indigo-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {segmentLabel(segment)}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-4 block text-sm text-slate-300">
            Parent category (optional)
            <select
              value={form.parentId ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  parentId: event.target.value ? Number(event.target.value) : null,
                })
              }
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— None (top-level category) —</option>
              {topLevel.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={saving} className="mt-5 w-full bg-indigo-500 hover:bg-indigo-400">
            {saving ? "Adding…" : "Add service"}
          </Button>
          {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
        </form>
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Live services</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
              {services.length} total
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1 rounded-full border border-white/10 bg-[#0b1020] p-1 sm:inline-flex">
            {(["", ...segments] as const).map((value) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => setViewSegment(value)}
                className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:flex-none ${
                  viewSegment === value
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {value ? segmentLabel(value) : "All"}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {visibleTopLevel.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                children={services.filter((item) => item.parentId === category.id)}
                onRemove={remove}
              />
            ))}
          </div>
          {visibleTopLevel.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              {services.length === 0 ? "No services yet." : "No categories in this segment yet."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  children,
  onRemove,
}: {
  category: Service;
  children: Service[];
  onRemove: (service: Service) => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#0b1020]/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <FolderTree className="h-4 w-4" />
        </span>
        <button
          onClick={() => onRemove(category)}
          className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
          aria-label={`Delete ${category.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-3 font-semibold text-white">{category.name}</h3>
      <p className="mt-1 text-sm text-slate-400">
        {category.description || "No description added."}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">/{category.slug}</p>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${segmentColor[category.segment || "RESIDENTIAL"]}`}
        >
          {segmentLabel(category.segment)}
        </span>
      </div>
      {children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
          {children.map((child) => (
            <span
              key={child.id}
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-2.5 pr-1 text-xs text-slate-300"
            >
              {child.name}
              <button
                onClick={() => onRemove(child)}
                className="rounded-full p-0.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                aria-label={`Delete ${child.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
