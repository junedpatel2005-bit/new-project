"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, Check, FolderTree, Layers3, Plus, Search, Trash2 } from "lucide-react";

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

const segments: { value: Segment | ""; label: string }[] = [
  { value: "", label: "All services" },
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
];
const emptyForm = {
  name: "",
  description: "",
  segment: "RESIDENTIAL" as Segment,
  parentId: null as number | null,
};
const segmentLabel = (segment: Segment | undefined) => {
  const value = segment || "RESIDENTIAL";
  return value[0] + value.slice(1).toLowerCase();
};
const segmentStyles: Record<Segment, string> = {
  RESIDENTIAL: "border-indigo-400/20 bg-indigo-400/10 text-indigo-300",
  COMMERCIAL: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  INDUSTRIAL: "border-amber-400/20 bg-amber-400/10 text-amber-300",
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [viewSegment, setViewSegment] = useState<Segment | "">("");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/admin/services", { cache: "no-store" });
      const data = (await response.json()) as { services?: Service[]; error?: string };
      if (!response.ok || !data.services) throw new Error(data.error ?? "Could not load services.");
      setServices(data.services);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not load services.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const topLevel = useMemo(() => services.filter((item) => item.parentId === null), [services]);
  const parentOptions = useMemo(
    () => topLevel.filter((item) => (item.segment || "RESIDENTIAL") === form.segment),
    [form.segment, topLevel],
  );
  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return topLevel
      .filter((category) => !viewSegment || category.segment === viewSegment)
      .map((category) => ({
        category,
        children: services.filter((item) => item.parentId === category.id),
      }))
      .filter(({ category, children }) => {
        if (!normalizedQuery) return true;
        return (
          category.name.toLowerCase().includes(normalizedQuery) ||
          children.some((child) => child.name.toLowerCase().includes(normalizedQuery))
        );
      });
  }, [query, services, topLevel, viewSegment]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/admin/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { service?: Service; error?: string };
      if (!response.ok || !data.service) throw new Error(data.error ?? "Could not add service.");
      setServices((current) => [...current, data.service!]);
      setForm(emptyForm);
      setMessage({ text: "Service category added successfully.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not add service.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (service: Service) => {
    if (!window.confirm(`Delete ${service.name}? This also removes its subcategories.`)) return;
    const response = await fetch(`/api/v1/admin/services?id=${service.id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage({ text: "Could not delete this service.", tone: "error" });
      return;
    }
    setServices((current) =>
      current.filter((item) => item.id !== service.id && item.parentId !== service.id),
    );
    setMessage({ text: "Service category deleted.", tone: "success" });
  };
  const counts = {
    total: services.length,
    parents: topLevel.length,
    children: services.length - topLevel.length,
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            Marketplace management
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Service categories
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Organize the services shown across the marketplace using a clear parent and subcategory
            structure.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Live marketplace taxonomy
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Boxes} label="Total services" value={counts.total} />
        <Metric icon={FolderTree} label="Parent categories" value={counts.parents} />
        <Metric icon={Layers3} label="Subcategories" value={counts.children} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form
          onSubmit={(event) => void add(event)}
          className="rounded-2xl border border-white/10 bg-white/[.035] p-5 shadow-xl shadow-black/10"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Add a category</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Add a top-level service or place it under an existing parent.
              </p>
            </div>
          </div>
          <label className="mt-6 block text-sm text-slate-300">
            Service name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Home Cleaning"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080d1b] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Description <span className="text-slate-600">(optional)</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Describe this service for admins and clients"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#080d1b] p-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <fieldset className="mt-5">
            <legend className="text-sm text-slate-300">Service segment</legend>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#080d1b] p-1">
              {segments.slice(1).map((segment) => (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, segment: segment.value as Segment, parentId: null })
                  }
                  className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold transition ${form.segment === segment.value ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-slate-200"}`}
                >
                  {segment.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm text-slate-300">
            Parent category <span className="text-slate-600">(optional)</span>
            <select
              value={form.parentId ?? ""}
              onChange={(event) =>
                setForm({
                  ...form,
                  parentId: event.target.value ? Number(event.target.value) : null,
                })
              }
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#080d1b] px-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">None — top-level category</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Adding category…" : "Add category"}
            {!saving && <Plus className="h-4 w-4" />}
          </button>
          {message && (
            <p
              className={`mt-3 text-sm ${message.tone === "success" ? "text-emerald-400" : "text-rose-400"}`}
            >
              {message.text}
            </p>
          )}
        </form>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Live service taxonomy</h2>
              <p className="mt-1 text-xs text-slate-500">
                Changes appear on the public Services page immediately.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories"
                className="h-10 w-full rounded-xl border border-white/10 bg-[#080d1b] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {segments.map((segment) => (
              <button
                key={segment.value || "all"}
                type="button"
                onClick={() => setViewSegment(segment.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${viewSegment === segment.value ? "border-indigo-400 bg-indigo-500 text-white" : "border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-200"}`}
              >
                {segment.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-44 animate-pulse rounded-2xl bg-white/[.04]" />
              ))}
            </div>
          ) : visibleCategories.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {visibleCategories.map(({ category, children }) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  children={children}
                  onRemove={remove}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <FolderTree className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">No categories match this view.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
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
  const segment = category.segment || "RESIDENTIAL";
  return (
    <article className="rounded-2xl border border-white/10 bg-[#080d1b]/65 p-4 transition hover:border-indigo-400/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <FolderTree className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-white">{category.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">/{category.slug}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(category)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
          aria-label={`Delete ${category.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-slate-400">
        {category.description || "No description added."}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${segmentStyles[segment]}`}
        >
          {segmentLabel(segment)}
        </span>
        <span className="text-xs text-slate-500">
          {children.length} subcategor{children.length === 1 ? "y" : "ies"}
        </span>
      </div>
      {children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {children.map((child) => (
            <span
              key={child.id}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-xs text-slate-300"
            >
              <Check className="h-3 w-3 text-emerald-400" />
              {child.name}
              <button
                type="button"
                onClick={() => onRemove(child)}
                className="ml-1 text-slate-600 hover:text-rose-400"
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
