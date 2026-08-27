"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, Check, FolderTree, Layers3, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
  jobCount?: number;
};
type Job = {
  id: number;
  title: string | null;
  description: string | null;
  category: string | null;
  status: string;
  budgetMin: number | null;
  budgetMax: number | null;
  locationLabel: string | null;
  createdAt: string;
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
  RESIDENTIAL: "bg-indigo-400/10 text-indigo-300",
  COMMERCIAL: "bg-cyan-400/10 text-cyan-300",
  INDUSTRIAL: "bg-amber-400/10 text-amber-300",
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Service | null>(null);
  const [categoryJobs, setCategoryJobs] = useState<Job[]>([]);
  const [categoryDescendants, setCategoryDescendants] = useState<Service[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

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
  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return topLevel
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
  }, [query, services, topLevel]);

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
  const openCategory = async (category: Service) => {
    setSelectedSegment(null);
    setSelectedCategory(category);
    setEditing(false);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/services?categoryId=${category.id}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { descendants?: Service[]; jobs?: Job[] };
      setCategoryDescendants(data.descendants ?? []);
      setCategoryJobs(data.jobs ?? []);
      setEditForm({ name: category.name, description: category.description });
    } finally {
      setDetailLoading(false);
    }
  };
  const saveEdit = async () => {
    if (!selectedCategory) return;
    const response = await fetch(`/api/v1/admin/services?id=${selectedCategory.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { service: Service };
    setServices((current) =>
      current.map((item) => (item.id === data.service.id ? data.service : item)),
    );
    setSelectedCategory(data.service);
    setEditing(false);
    setMessage({ text: "Category updated successfully.", tone: "success" });
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-400">
            Admin module
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">Service catalog</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Shape the service catalog your marketplace runs on. Keep categories focused, searchable,
            and easy for customers to understand.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live on marketplace
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Metric icon={Boxes} label="Total services" value={counts.total} />
        <Metric icon={FolderTree} label="Parent categories" value={counts.parents} />
        <Metric icon={Layers3} label="Subcategories" value={counts.children} />
      </div>

      {message && (
        <p
          className={`mt-5 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <form
          onSubmit={(event) => void add(event)}
          className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
        >
          <h2 className="font-semibold text-white">Create a category</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add a new top-level service to your marketplace.
          </p>
          <label className="mt-5 block text-xs font-semibold text-slate-300">
            Name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Home Cleaning"
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[.035] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold text-slate-300">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Describe this service for admins and clients"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[.035] p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
            />
          </label>
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold text-slate-300">Segment</legend>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[.035] p-1">
              {segments.slice(1).map((segment) => (
                <button
                  key={segment.value}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, segment: segment.value as Segment, parentId: null })
                  }
                  className={`rounded-lg px-1.5 py-2 text-[11px] font-semibold transition ${form.segment === segment.value ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  {segment.label}
                </button>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={saving} className="mt-5 w-full">
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Adding category…" : "Add category"}
          </Button>
        </form>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">Service taxonomy</h2>
                <span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  {counts.parents} roots
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Changes publish to the public Services page immediately.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search categories"
                className="h-10 w-full rounded-xl border border-white/10 bg-white/[.035] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
              />
            </div>
          </div>
          {loading ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-white/[.04]" />
              ))}
            </div>
          ) : visibleCategories.length ? (
            <div className="divide-y divide-white/10">
              {visibleCategories.map(({ category, children }) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  children={children}
                  onRemove={remove}
                  onOpen={() => setSelectedSegment(category)}
                  onOpenCategory={openCategory}
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
      {selectedSegment && (
        <Modal
          title={`${selectedSegment.name} categories`}
          onClose={() => setSelectedSegment(null)}
        >
          <p className="text-sm text-slate-400">
            All categories and subcategories in this section.
          </p>
          <div className="mt-5 space-y-3">
            {services
              .filter((item) => item.parentId === selectedSegment.id)
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => void openCategory(category)}
                  className="w-full rounded-xl bg-white/[.035] p-4 text-left transition hover:bg-white/[.07]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{category.name}</span>
                    <Pencil className="h-4 w-4 text-indigo-300" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {services
                      .filter((item) => item.parentId === category.id)
                      .map((subCategory) => (
                        <span
                          key={subCategory.id}
                          className="rounded-lg bg-white/[.06] px-2.5 py-1 text-xs text-slate-300"
                        >
                          {subCategory.name}
                        </span>
                      ))}
                  </div>
                </button>
              ))}
          </div>
        </Modal>
      )}
      {selectedCategory && (
        <Modal title={selectedCategory.name} onClose={() => setSelectedCategory(null)}>
          {editing ? (
            <div className="space-y-4">
              <label className="block text-sm text-slate-300">
                Category name
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[.035] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Description
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm({ ...editForm, description: event.target.value })
                  }
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[.035] p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400/50"
                  rows={3}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => void saveEdit()}>Save changes</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">
                    {selectedCategory.description || "No description added."}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {categoryDescendants.length - 1} subcategories
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="border-white/10 bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-white">Subcategories</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryDescendants
                    .filter((item) => item.id !== selectedCategory.id)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void openCategory(item)}
                        className="rounded-lg bg-white/[.04] px-3 py-2 text-xs text-slate-300 hover:bg-white/[.08]"
                      >
                        {item.name}
                      </button>
                    ))}
                </div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <h3 className="font-semibold text-white">
                  Jobs in this category{" "}
                  <span className="text-sm font-normal text-slate-500">
                    ({detailLoading ? "…" : categoryJobs.length})
                  </span>
                </h3>
                {!detailLoading && !categoryJobs.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No jobs are currently assigned to this category.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {categoryJobs.map((job) => (
                      <a
                        key={job.id}
                        href={`/job/${job.id}`}
                        className="block rounded-xl bg-white/[.035] p-3 hover:bg-white/[.07]"
                      >
                        <p className="font-medium text-white">{job.title || `Job #${job.id}`}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {job.category} · {job.status}
                          {job.locationLabel ? ` · ${job.locationLabel}` : ""}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
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
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:bg-white/[.07]">
      <Icon className="h-5 w-5 text-indigo-400" />
      <p className="mt-5 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

function CategoryRow({
  category,
  children,
  onRemove,
  onOpen,
  onOpenCategory,
}: {
  category: Service;
  children: Service[];
  onRemove: (service: Service) => void;
  onOpen: () => void;
  onOpenCategory: (service: Service) => void;
}) {
  const segment = category.segment || "RESIDENTIAL";
  return (
    <article
      onClick={onOpen}
      className="flex cursor-pointer flex-wrap items-start gap-4 px-5 py-4 transition hover:bg-white/[.045]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
        <FolderTree className="h-5 w-5" />
      </span>
      <div className="min-w-48 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-white">{category.name}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${segmentStyles[segment]}`}
          >
            {segmentLabel(segment)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-slate-400">
          {category.description || "No description added."}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          /{category.slug} · {category.jobCount ?? 0} live{" "}
          {category.jobCount === 1 ? "job" : "jobs"} · {children.length} subcategor
          {children.length === 1 ? "y" : "ies"}
        </p>
        {children.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {children.map((child) => (
              <span
                key={child.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] py-1 pl-2.5 pr-1.5 text-xs text-slate-300"
              >
                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                {child.name}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenCategory(child);
                  }}
                  className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-indigo-300"
                  aria-label={`Edit ${child.name}`}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <Button
        onClick={(event) => {
          event.stopPropagation();
          onRemove(category);
        }}
        variant="outline"
        size="sm"
        className="border-white/10 bg-transparent text-slate-400 hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#11182b] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06] hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
