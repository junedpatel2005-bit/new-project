"use client";

import { FormEvent, useEffect, useState } from "react";
import { FolderTree, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Service = {
  id: number;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  sortOrder: number;
};
export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const load = () =>
    void fetch("/api/v1/admin/services", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setServices(data.services ?? []));
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
    setForm({ name: "", description: "" });
    setMessage("Service added to the website.");
  };
  const remove = async (service: Service) => {
    if (!window.confirm(`Delete ${service.name}?`)) return;
    const response = await fetch(`/api/v1/admin/services?id=${service.id}`, { method: "DELETE" });
    if (response.ok) {
      setServices((current) => current.filter((item) => item.id !== service.id));
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
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1020] p-3 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <Button disabled={saving} className="mt-5 w-full bg-indigo-500 hover:bg-indigo-400">
            {saving ? "Adding…" : "Add service"}
          </Button>
          <p className="mt-3 text-sm text-emerald-400">{message}</p>
        </form>
        <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Live services</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
              {services.length} total
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-xl border border-white/10 bg-[#0b1020]/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <FolderTree className="h-5 w-5 text-indigo-400" />
                  <button
                    onClick={() => void remove(service)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label={`Delete ${service.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-4 font-semibold text-white">{service.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-slate-400">
                  {service.description || "No description added."}
                </p>
                <p className="mt-3 text-xs text-slate-500">/{service.slug}</p>
              </article>
            ))}
          </div>
          {services.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">No services yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
