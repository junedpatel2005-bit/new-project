"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddressMapPicker } from "@/components/AddressMapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MarketplaceCategory } from "@/lib/types/marketplace";

type Form = {
  title: string;
  category: string;
  description: string;
  timingType: "FIXED" | "HOURLY";
  paymentMethod: "WALLET" | "OFFLINE";
  budgetMin: string;
  budgetMax: string;
  hourlyRate: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  jobDate: string;
  deadline: string;
  workMode: "ON_SITE" | "REMOTE" | "BOTH";
  locationLabel: string;
  locationAddress: string;
  locationLat: number | null;
  locationLng: number | null;
};
const empty: Form = {
  title: "",
  category: "",
  description: "",
  timingType: "FIXED",
  paymentMethod: "WALLET",
  budgetMin: "",
  budgetMax: "",
  hourlyRate: "",
  urgency: "MEDIUM",
  jobDate: "",
  deadline: "",
  workMode: "ON_SITE",
  locationLabel: "",
  locationAddress: "",
  locationLat: null,
  locationLng: null,
};
const steps = ["Details", "Budget & schedule", "Job type", "Location", "Review"];
const segmentOptions: [string, string][] = [
  ["RESIDENTIAL", "Residential"],
  ["COMMERCIAL", "Commercial"],
  ["INDUSTRIAL", "Industrial"],
];
const asDate = (value: string | Date | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const money = (value: number | null | undefined) =>
  value == null ? "Not set" : `₹${value.toLocaleString("en-US")}`;

export default function PostJob() {
  const router = useRouter();
  const [step, setStep] = useState(0),
    [maxStep, setMaxStep] = useState(0),
    [form, setForm] = useState<Form>(empty),
    [id, setId] = useState<number | null>(null),
    [categories, setCategories] = useState<MarketplaceCategory[]>([]),
    [saved, setSaved] = useState<
      Array<{
        id: number;
        label: string;
        address: string;
        latitude?: number | null;
        longitude?: number | null;
      }>
    >([]),
    [primary, setPrimary] = useState<string>(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [segment, setSegment] = useState("");
  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((old) => ({ ...old, [key]: value }));
    setErrors((old) => {
      const next = { ...old };
      delete next[key];
      return next;
    });
  };
  useEffect(() => {
    void fetch("/api/v1/marketplace/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setMessage("Categories could not be loaded."));
    void fetch("/api/v1/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            profile?: {
              address?: string | null;
              savedLocations?: Array<{
                id: number;
                label: string;
                address: string;
                latitude?: number | null;
                longitude?: number | null;
              }>;
            } | null;
          } | null,
        ) => {
          if (!data) return;
          setPrimary(data.profile?.address ?? "");
          setSaved(data.profile?.savedLocations ?? []);
        },
      )
      .catch(() => {});
    const edit = new URLSearchParams(window.location.search).get("edit");
    if (edit && /^\d+$/.test(edit)) {
      void fetch(`/api/v1/client/jobs/${edit}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(({ job }) => {
          setId(job.id);
          setMaxStep(4);
          setForm({
            title: job.title ?? "",
            category: job.category ?? "",
            description: job.description ?? "",
            timingType: job.timingType === "HOURLY" ? "HOURLY" : "FIXED",
            paymentMethod: job.paymentMethod === "OFFLINE" ? "OFFLINE" : "WALLET",
            budgetMin: job.budgetMin?.toString() ?? "",
            budgetMax: job.budgetMax?.toString() ?? "",
            hourlyRate: job.hourlyRate?.toString() ?? "",
            urgency: job.urgency,
            jobDate: asDate(job.jobDate),
            deadline: asDate(job.deadline),
            workMode: job.workMode,
            locationLabel: job.locationLabel ?? "",
            locationAddress: job.locationAddress ?? "",
            locationLat: job.locationLat,
            locationLng: job.locationLng,
          });
        })
        .catch(() => setMessage("This draft could not be opened."));
    }
  }, []);
  const payload = (mode: "draft" | "publish") => ({
    ...form,
    budgetMin: form.budgetMin === "" ? null : Number(form.budgetMin),
    budgetMax: form.budgetMax === "" ? null : Number(form.budgetMax),
    hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
    jobDate: form.jobDate || null,
    deadline: form.deadline || null,
    locationLabel: form.locationLabel || null,
    locationAddress: form.locationAddress || null,
    mode,
  });
  const clientCheck = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) e.title = "Enter a job title.";
      if (!form.category) e.category = "Choose a category.";
      if (!form.description.trim()) e.description = "Describe the work needed.";
    }
    if (step === 1) {
      if (form.timingType === "HOURLY" && !form.hourlyRate) e.hourlyRate = "Enter an hourly rate.";
      if (form.timingType === "FIXED" && (!form.budgetMin || !form.budgetMax))
        e.budgetMin = "Enter a budget range.";
      if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax))
        e.budgetMax = "Maximum budget must be at least the minimum.";
      if (!form.deadline) e.deadline = "Choose a deadline.";
      if (form.jobDate && form.deadline && form.deadline < form.jobDate)
        e.deadline = "Deadline cannot be before the preferred job date.";
    }
    if (step === 3 && form.workMode !== "REMOTE") {
      if (!form.locationAddress.trim()) e.locationAddress = "Choose a job location.";
      else if (form.locationLat === null || form.locationLng === null)
        e.locationAddress =
          "Select the address from the search results or drop a pin on the map so professionals can find you nearby.";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  async function save(mode: "draft" | "publish") {
    setSaving(true);
    setMessage("");
    try {
      const url = id ? `/api/v1/client/jobs/${id}` : "/api/v1/client/jobs";
      const r = await fetch(url, {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload(mode)),
      });
      const data = await r.json();
      if (!r.ok) {
        setErrors(data.fields ?? {});
        setMessage(data.error ?? "Could not save the job.");
        const focus = Object.keys(data.fields ?? {})[0];
        const focusStep =
          focus && ["title", "category", "description"].includes(focus)
            ? 0
            : focus && ["budgetMin", "budgetMax", "hourlyRate", "deadline"].includes(focus)
              ? 1
              : focus === "locationAddress"
                ? 3
                : null;
        if (focusStep !== null) {
          setStep(focusStep);
          setMaxStep((prev) => Math.max(prev, focusStep));
        }
        return;
      }
      setId(data.job.id);
      if (mode === "publish") router.push("/my-jobs?posted=1");
      else setMessage("Draft saved.");
    } catch {
      setMessage("A network error occurred. Your form values are still here.");
    } finally {
      setSaving(false);
    }
  }
  const topCategories = useMemo(
    () => categories.filter((c) => c.parentId === null && (!segment || c.segment === segment)),
    [categories, segment],
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === form.category) ?? null,
    [categories, form.category],
  );
  const activeTopCategory = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory.parentId === null) return selectedCategory;
    return categories.find((c) => c.id === selectedCategory.parentId) ?? null;
  }, [categories, selectedCategory]);
  const subCategories = useMemo(
    () => (activeTopCategory ? categories.filter((c) => c.parentId === activeTopCategory.id) : []),
    [categories, activeTopCategory],
  );
  useEffect(() => {
    if (!segment && activeTopCategory) setSegment(activeTopCategory.segment);
  }, [segment, activeTopCategory]);
  const locationOptions = useMemo<
    Array<{ label: string; address: string; lat: number | null; lng: number | null }>
  >(
    () =>
      [
        { label: "Primary address", address: primary, lat: null, lng: null },
        ...saved.map((x) => ({
          label: x.label,
          address: x.address,
          lat: x.latitude ?? null,
          lng: x.longitude ?? null,
        })),
      ].filter((x) => x.address),
    [primary, saved],
  );
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Create a job</h1>
      <p className="mt-1 text-muted-foreground">Tell qualified professionals what you need.</p>
      <ol className="mt-7 grid grid-cols-5 gap-1" aria-label="Job posting steps">
        {steps.map((label, index) => {
          const reachable = index <= maxStep;
          const stepLabel = (
            <>
              {index + 1}. <span className="hidden sm:inline">{label}</span>
            </>
          );
          return (
            <li key={label} className="min-w-0">
              <div className={`h-1 rounded ${index <= step ? "bg-primary" : "bg-muted"}`} />
              {reachable ? (
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={`mt-2 block w-full text-center text-xs sm:text-sm ${index === step ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {stepLabel}
                </button>
              ) : (
                <span className="mt-2 block text-center text-xs text-muted-foreground sm:text-sm">
                  {stepLabel}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <section className="mt-7 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Tell us about the job</h2>
            <Field label="Job title" error={errors.title}>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={160}
                placeholder="What do you need done?"
              />
            </Field>
            <Field label="Category" error={errors.category}>
              <div className="flex flex-wrap gap-2">
                {segmentOptions.map(([value, label]) => (
                  <Choice
                    key={value}
                    checked={segment === value}
                    onClick={() => {
                      setSegment(value);
                      update("category", "");
                    }}
                    label={label}
                  />
                ))}
              </div>
            </Field>
            {segment && (
              <Field label="Which category?" error={errors.category}>
                <select
                  value={activeTopCategory?.id ?? ""}
                  onChange={(e) => {
                    const top = topCategories.find((c) => c.id === Number(e.target.value));
                    update("category", top?.name ?? "");
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  <option value="">Select a category</option>
                  {topCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {subCategories.length > 0 && (
              <Field label="Sub-category">
                <select
                  value={selectedCategory?.parentId != null ? selectedCategory.name : ""}
                  onChange={(e) =>
                    update("category", e.target.value || (activeTopCategory?.name ?? ""))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  <option value="">General {activeTopCategory?.name}</option>
                  {subCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Description" error={errors.description}>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                maxLength={5000}
                className="min-h-36 w-full rounded-md border border-input bg-background p-3"
                placeholder="Tell professionals what needs to be done..."
              />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Budget & schedule</h2>
            <div className="flex gap-4">
              <Choice
                checked={form.timingType === "FIXED"}
                onClick={() => update("timingType", "FIXED")}
                label="Budget range"
              />
              <Choice
                checked={form.timingType === "HOURLY"}
                onClick={() => update("timingType", "HOURLY")}
                label="Hourly rate"
              />
            </div>
            {form.timingType === "FIXED" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Minimum budget (INR)" error={errors.budgetMin}>
                  <Input
                    type="number"
                    min="0"
                    value={form.budgetMin}
                    onChange={(e) => update("budgetMin", e.target.value)}
                    placeholder="₹ 0"
                  />
                </Field>
                <Field label="Maximum budget (INR)" error={errors.budgetMax}>
                  <Input
                    type="number"
                    min="0"
                    value={form.budgetMax}
                    onChange={(e) => update("budgetMax", e.target.value)}
                    placeholder="₹ 0"
                  />
                </Field>
              </div>
            ) : (
              <Field label="Hourly rate (INR)" error={errors.hourlyRate}>
                <Input
                  type="number"
                  min="0"
                  value={form.hourlyRate}
                  onChange={(e) => update("hourlyRate", e.target.value)}
                  placeholder="₹ 0 / hour"
                />
              </Field>
            )}
            <Field label="How urgent is this job?">
              <select
                value={form.urgency}
                onChange={(e) => update("urgency", e.target.value as Form["urgency"])}
                className="h-10 w-full rounded-md border border-input bg-background px-3"
              >
                <option value="HIGH">Urgent — as soon as possible</option>
                <option value="MEDIUM">Soon — within a few days</option>
                <option value="LOW">Flexible — timing is flexible</option>
              </select>
            </Field>
            <Field label="Payment method">
              <div className="grid gap-3 sm:grid-cols-2">
                <Mode
                  checked={form.paymentMethod === "WALLET"}
                  onClick={() => update("paymentMethod", "WALLET")}
                  title="Wallet payment"
                  text="Pay milestone amounts through the platform wallet."
                />
                <Mode
                  checked={form.paymentMethod === "OFFLINE"}
                  onClick={() => update("paymentMethod", "OFFLINE")}
                  title="Offline payment"
                  text="Pay the professional directly outside the platform."
                />
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred job date">
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.jobDate}
                  onChange={(e) => update("jobDate", e.target.value)}
                />
              </Field>
              <Field label="Deadline" error={errors.deadline}>
                <Input
                  type="date"
                  min={form.jobDate || new Date().toISOString().slice(0, 10)}
                  value={form.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">What type of job is this?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Mode
                checked={form.workMode === "ON_SITE"}
                onClick={() => update("workMode", "ON_SITE")}
                title="On-site"
                text="A professional comes to the job location."
              />
              <Mode
                checked={form.workMode === "REMOTE"}
                onClick={() => update("workMode", "REMOTE")}
                title="Remote"
                text="The work can be completed remotely."
              />
              <Mode
                checked={form.workMode === "BOTH"}
                onClick={() => update("workMode", "BOTH")}
                title="Hybrid"
                text="A mix of remote and on-site work."
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Where will the job take place?</h2>
            {form.workMode === "REMOTE" ? (
              <p className="rounded-lg bg-muted p-4 text-sm">
                Remote jobs do not need a physical location. You may still add one if it helps
                professionals.
              </p>
            ) : null}
            {locationOptions.length > 0 && (
              <div className="space-y-2">
                {locationOptions.map((option) => (
                  <button
                    key={`${option.label}-${option.address}`}
                    type="button"
                    className="w-full rounded-lg border p-3 text-left hover:border-primary"
                    onClick={() => {
                      update("locationLabel", option.label);
                      update("locationAddress", option.address);
                      update("locationLat", option.lat ?? null);
                      update("locationLng", option.lng ?? null);
                    }}
                  >
                    <span className="block font-medium">Use {option.label}</span>
                    <span className="text-sm text-muted-foreground">{option.address}</span>
                  </button>
                ))}
              </div>
            )}
            <Field label="Location label">
              <Input
                value={form.locationLabel}
                onChange={(e) => update("locationLabel", e.target.value)}
                placeholder="e.g. Home or job site"
              />
            </Field>
            <div
              className={errors.locationAddress ? "rounded-lg border border-destructive p-2" : ""}
            >
              <AddressMapPicker
                id="job-location"
                value={form.locationAddress}
                onChange={(value) => update("locationAddress", value)}
                onCoordinatesChange={(lat, lng) => {
                  update("locationLat", lat);
                  update("locationLng", lng);
                }}
              />
              {errors.locationAddress && (
                <p className="mt-2 text-sm text-destructive">{errors.locationAddress}</p>
              )}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Review your job</h2>
            <Review label="Title" value={form.title || "Not set"} onEdit={() => setStep(0)} />
            <Review label="Category" value={form.category || "Not set"} onEdit={() => setStep(0)} />
            <Review
              label="Description"
              value={form.description || "Not set"}
              onEdit={() => setStep(0)}
            />
            <Review
              label="Budget"
              value={
                form.timingType === "HOURLY"
                  ? `${money(form.hourlyRate === "" ? null : Number(form.hourlyRate))} / hour`
                  : `${money(form.budgetMin === "" ? null : Number(form.budgetMin))} – ${money(form.budgetMax === "" ? null : Number(form.budgetMax))}`
              }
              onEdit={() => setStep(1)}
            />
            <Review
              label="Payment method"
              value={form.paymentMethod === "OFFLINE" ? "Offline payment" : "Wallet payment"}
              onEdit={() => setStep(1)}
            />
            <Review
              label="Urgency"
              value={{ HIGH: "Urgent", MEDIUM: "Soon", LOW: "Flexible" }[form.urgency]}
              onEdit={() => setStep(1)}
            />
            <Review label="Deadline" value={form.deadline || "Not set"} onEdit={() => setStep(1)} />
            <Review
              label="Job type"
              value={{ ON_SITE: "On-site", REMOTE: "Remote", BOTH: "Hybrid" }[form.workMode]}
              onEdit={() => setStep(2)}
            />
            {form.workMode !== "REMOTE" && (
              <Review
                label="Location"
                value={form.locationAddress || "Not set"}
                onEdit={() => setStep(3)}
              />
            )}
          </div>
        )}
        {message && (
          <p
            role="status"
            className={`mt-5 text-sm ${message.includes("saved") ? "text-green-700" : "text-destructive"}`}
          >
            {message}
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-between gap-3 border-t pt-5">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              {saving ? "Saving..." : "Save draft"}
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  if (clientCheck()) {
                    setStep(step + 1);
                    setMaxStep((prev) => Math.max(prev, step + 1));
                  }
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" disabled={saving} onClick={() => void save("publish")}>
                {saving ? "Posting..." : "Post job"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-2">{children}</div>
      {error && <span className="mt-1 block text-sm text-destructive">{error}</span>}
    </label>
  );
}
function Choice({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm ${checked ? "border-primary bg-primary/5 text-primary" : "border-input"}`}
    >
      {checked ? "●" : "○"} {label}
    </button>
  );
}
function Mode({
  checked,
  onClick,
  title,
  text,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left ${checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:border-primary"}`}
    >
      <span className="block font-semibold">
        {checked ? "●" : "○"} {title}
      </span>
      <span className="mt-2 block text-sm text-muted-foreground">{text}</span>
    </button>
  );
}
function Review({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3">
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap font-medium">{value}</dd>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
