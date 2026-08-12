import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Clock,
  MapPin,
  Star,
  Mail,
  Phone,
  Globe,
  Building2,
  ShieldCheck,
  Users,
  Calendar,
  Image,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { sessionCookie, verifySession } from "@/lib/auth";
import { getDetailedProfessional } from "@/lib/queries/marketplace";
import type { DetailedProfessional } from "@/lib/types/marketplace";

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "Not specified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Not available";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getVerificationBadge(status: string | null) {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3 animate-spin" />
          Pending review
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Not verified
        </Badge>
      );
  }
}

function getAvailabilityBadge(status: string) {
  switch (status) {
    case "available":
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Available
        </Badge>
      );
    case "busy":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Busy
        </Badge>
      );
    case "unavailable":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Unavailable
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          {status.replace("_", " ")}
        </Badge>
      );
  }
}

function getWorkModeBadge(mode: string) {
  switch (mode) {
    case "on_site":
      return (
        <Badge variant="outline" className="gap-1">
          <Building2 className="h-3 w-3" />
          On-site
        </Badge>
      );
    case "remote":
      return (
        <Badge variant="outline" className="gap-1">
          <Globe className="h-3 w-3" />
          Remote
        </Badge>
      );
    case "both":
      return (
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          Hybrid
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          {mode}
        </Badge>
      );
  }
}

import { cookies } from "next/headers";

async function getSessionTokenFromCookies() {
  return (await cookies()).get(sessionCookie)?.value;
}

async function getProfessionalProfile(): Promise<DetailedProfessional> {
  const token = await getSessionTokenFromCookies();
  if (!token) redirect("/login");
  let session;
  try {
    session = await verifySession(token);
  } catch {
    redirect("/login");
  }
  if (session.role !== "PROFESSIONAL") {
    if (session.role === "CLIENT") redirect("/dashboard");
    redirect("/login");
  }

  const professional = await getDetailedProfessional(session.userId);
  if (!professional) redirect("/login");
  return professional;
}

export default async function ProfessionalProfilePage() {
  const professional = await getProfessionalProfile();

  return (
    <AppShell title="Professional Profile">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="h-28 gradient-primary" />
          <div className="px-6 pb-8 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                {professional.avatar ? (
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="h-24 w-24 rounded-2xl border-4 border-card object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-muted text-3xl font-semibold">
                    {professional.name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    {professional.name}
                    {professional.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                  </h1>
                  <p className="text-muted-foreground">{professional.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {professional.companyName ??
                      professional.industry ??
                      "Independent professional"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/profile-setup">Edit profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {professional.rating.toFixed(1)} ({professional.reviews} reviews)
              </span>
              {professional.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {professional.location}
                </span>
              )}
              <span>{getAvailabilityBadge(professional.availability)}</span>
              <span>{getWorkModeBadge(professional.workMode)}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {professional.verificationStatus ?? "Verification pending"}
              </span>
              {professional.email ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Email on file
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Email not verified
                </Badge>
              )}
            </div>
          </div>
        </article>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">About</h2>
              <p className="mt-4 text-muted-foreground whitespace-pre-wrap">
                {professional.bio ?? "No bio has been provided yet."}
              </p>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Services</h2>
              {professional.services.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {professional.services.map((service) => (
                    <div key={service.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <div className="text-right text-sm font-semibold">
                          {service.price === null
                            ? "Contact for pricing"
                            : formatCurrency(service.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No active services added yet.</p>
              )}
            </article>

            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Credentials</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="mt-2 text-lg font-semibold">
                    {professional.experienceYears !== null
                      ? `${professional.experienceYears}+ years`
                      : "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Team size</p>
                  <p className="mt-2 text-lg font-semibold">
                    {professional.teamSize ?? "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Service area</p>
                  <p className="mt-2 text-lg font-semibold">
                    {professional.serviceArea ?? "Not specified"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Service radius</p>
                  <p className="mt-2 text-lg font-semibold">
                    {professional.serviceRadiusKm !== null
                      ? `${professional.serviceRadiusKm} km`
                      : "Not specified"}
                  </p>
                </div>
              </div>
            </article>

            {professional.workPhotos.length > 0 && (
              <article className="rounded-3xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">Work Photos</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {professional.workPhotos.map((photo, index) => (
                    <div key={index} className="overflow-hidden rounded-2xl border border-border">
                      <img
                        src={photo}
                        alt={`Work photo ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <aside className="space-y-6">
            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{professional.email}</span>
                </div>
                {professional.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{professional.phone}</span>
                  </div>
                )}
                {professional.companyWebsite && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a
                      href={professional.companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {professional.companyWebsite}
                    </a>
                  </div>
                )}
                {professional.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1" />
                    <span>{professional.address}</span>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Company</h2>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Company
                  </p>
                  <p className="mt-2 font-medium">{professional.companyName ?? "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Industry
                  </p>
                  <p className="mt-2 font-medium">{professional.industry ?? "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Verified status
                  </p>
                  <div className="mt-2">
                    {getVerificationBadge(professional.verificationStatus)}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Profile stats</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-2xl bg-muted p-4">
                  <p className="text-muted-foreground">Joined</p>
                  <p className="mt-2 font-medium">{formatDate(professional.createdAt)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <p className="text-muted-foreground">Last updated</p>
                  <p className="mt-2 font-medium">{formatDate(professional.updatedAt)}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <p className="text-muted-foreground">Last login</p>
                  <p className="mt-2 font-medium">
                    {professional.lastLoginAt
                      ? formatDate(professional.lastLoginAt)
                      : "Not available"}
                  </p>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
