"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressMapPicker } from "@/components/AddressMapPicker";
import { PhoneVerification } from "@/components/PhoneVerification";

type Location = { id: number; label: string; address: string };
type Data = {
  account: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    phoneVerifiedAt: string | null;
    avatarUrl: string | null;
    address: string | null;
  };
  profile: {
    companyName: string | null;
    address: string;
    profilePhotoUrl: string | null;
    savedLocations: Location[];
  } | null;
};
const emptyLocation = { label: "", address: "" };

export function ClientProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    address: "",
    profilePhotoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location | typeof emptyLocation | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);
  const [saveCurrentLocation, setSaveCurrentLocation] = useState(false);
  const [showSetupReminder, setShowSetupReminder] = useState(false);

  useEffect(() => {
    if (searchParams.get("profileSetup") !== "1") return;
    setShowSetupReminder(true);
    const timeout = window.setTimeout(() => setShowSetupReminder(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  const initials = useMemo(
    () => `${form.firstName[0] ?? ""}${form.lastName[0] ?? ""}`.toUpperCase() || "C",
    [form.firstName, form.lastName],
  );
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/profile");
      const result = (await response.json()) as Data & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to load your profile.");
      setData(result);
      setForm({
        firstName: result.account.firstName,
        lastName: result.account.lastName,
        companyName: result.profile?.companyName ?? "",
        address: result.profile?.address ?? result.account.address ?? "",
        profilePhotoUrl: result.profile?.profilePhotoUrl ?? result.account.avatarUrl ?? "",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save profile.");
      setMessage("Profile updated successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }
  async function saveDetectedAddress(address: string) {
    setForm((current) => ({ ...current, address }));
    if (!saveCurrentLocation) return;
    setSaveCurrentLocation(false);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, address }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save your location.");
      setMessage("Your current location was saved automatically.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your location.");
    }
  }
  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location) return;
    setLocationSaving(true);
    setMessage(null);
    const isEditing = "id" in location;
    try {
      const response = await fetch(
        isEditing ? `/api/v1/profile/locations/${location.id}` : "/api/v1/profile/locations",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: location.label, address: location.address }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save location.");
      setLocation(null);
      setMessage(isEditing ? "Location updated successfully." : "Location added successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save location.");
    } finally {
      setLocationSaving(false);
    }
  }
  async function deleteLocation() {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setMessage(null);
    const response = await fetch(`/api/v1/profile/locations/${id}`, { method: "DELETE" });
    if (response.ok) {
      setMessage("Location deleted successfully.");
      await load();
    } else {
      const result = (await response.json()) as { error?: string };
      setMessage(result.error ?? "Unable to delete location.");
    }
  }
  if (loading)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Loading your profile…</p>
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-destructive">{message ?? "Profile unavailable."}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Try again
        </Button>
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {showSetupReminder ? (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg"
        >
          <p className="font-semibold">Your profile setup is remaining.</p>
          <p className="mt-1 text-amber-800">Complete your profile to continue.</p>
        </div>
      ) : null}
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your personal information, addresses and account details.
            </p>
          </div>
          <Button type="button" variant="ghost" asChild>
            <Link href="/login?next=/client-profile&profileSetup=1">Back to login</Link>
          </Button>
        </div>
      </header>
      {message && (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          {message}
        </p>
      )}
      <form onSubmit={saveProfile} className="space-y-6">
        <Section
          title="Personal Information"
          description="Details displayed with your client account."
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={form.profilePhotoUrl || undefined}
                alt={`${form.firstName} ${form.lastName}`}
              />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMessage("Photo upload will be available soon.")}
              >
                Choose photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              value={form.firstName}
              onChange={(value) => setForm({ ...form, firstName: value })}
              required
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(value) => setForm({ ...form, lastName: value })}
              required
            />
            <Field
              label="Company name (optional)"
              value={form.companyName}
              onChange={(value) => setForm({ ...form, companyName: value })}
            />
          </div>
        </Section>
        <Section
          title="Contact Information"
          description="Contact details come from your authenticated account."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label="Email" value={data.account.email} />
            <PhoneVerification
              role="CLIENT"
              initialPhone={data.account.phone}
              onVerified={() => void load()}
            />
          </div>
        </Section>
        <Section
          title="Primary Address"
          description="Enter your complete service address. You can always type it manually."
        >
          <AddressMapPicker
            id="primary-address"
            value={form.address}
            onChange={(address) => void saveDetectedAddress(address)}
            onCurrentLocation={() => setSaveCurrentLocation(true)}
          />
        </Section>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            Skip for now
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/">Go to Home</Link>
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </form>
      <Section
        title="Saved Locations"
        description="Save addresses you frequently use when requesting services."
      >
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={() => setLocation(emptyLocation)}>
            Add new location
          </Button>
        </div>
        {data.profile?.savedLocations.length ? (
          <div className="space-y-3">
            {data.profile.savedLocations.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(item)}
                  >
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium">No saved locations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save an address to make future service requests faster.
            </p>
            <Button type="button" className="mt-4" onClick={() => setLocation(emptyLocation)}>
              Add location
            </Button>
          </div>
        )}
      </Section>
      <Dialog open={location !== null} onOpenChange={(open) => !open && setLocation(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {location && "id" in location ? "Edit saved location" : "Add saved location"}
            </DialogTitle>
            <DialogDescription>
              Give this address a label to find it quickly later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveLocation} className="space-y-4">
            {location && (
              <>
                <Field
                  label="Label"
                  value={location.label}
                  onChange={(value) => setLocation({ ...location, label: value })}
                  required
                />
                <AddressMapPicker
                  id="saved-location-address"
                  value={location.address}
                  onChange={(address) => setLocation({ ...location, address })}
                  onCurrentLocation={() =>
                    setLocation((current) =>
                      current && !current.label.trim()
                        ? { ...current, label: "Current location" }
                        : current,
                    )
                  }
                />
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLocation(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={locationSaving}>
                {locationSaving ? "Saving…" : "Save location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteLocation()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        maxLength={type === "url" ? 2048 : 300}
      />
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="rounded-md bg-muted px-3 py-2 text-sm">{value}</p>
    </div>
  );
}
