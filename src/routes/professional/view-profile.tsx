"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  MapPin,
  Star,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Award,
  Image,
  FileText,
  Shield,
  Clock,
  DollarSign,
  Building2,
  Users,
  GraduationCap,
  MapPin as MapPinIcon,
  CreditCard,
  Calendar,
  ExternalLink,
  Verified,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DetailedProfessional } from "@/lib/types/marketplace";

function formatDate(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "Not specified";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending Review
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Verified
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
          <XCircle className="h-3 w-3" />
          Unavailable
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <AlertCircle className="h-3 w-3" />
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

export default function ViewProfessionalProfile() {
  const { proId } = useParams<{ proId: string }>();
  const [professional, setProfessional] = useState<DetailedProfessional | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    void fetch(`/api/marketplace/professional-detail?id=${encodeURIComponent(proId)}`)
      .then(async (response) => {
        if (response.status === 404) return setStatus("missing");
        if (!response.ok) throw new Error("Unable to load professional");
        setProfessional((await response.json()) as DetailedProfessional);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [proId]);

  if (status === "loading")
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </AppShell>
    );

  if (status === "missing")
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl p-6 text-center">
          <div className="rounded-xl border border-border bg-card p-12">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-2xl font-semibold">Professional Not Found</h1>
            <p className="mt-2 text-muted-foreground">
              This professional profile is no longer available or does not exist.
            </p>
          </div>
        </div>
      </AppShell>
    );

  if (status === "error" || !professional)
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl p-6 text-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-12">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-semibold text-destructive">Unable to Load Profile</h1>
            <p className="mt-2 text-muted-foreground">
              The profile could not be loaded. Please try again later.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* Header Section */}
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
                    {professional.verified && (
                      <Verified className="h-5 w-5 text-primary" />
                    )}
                  </h1>
                  <p className="text-muted-foreground">{professional.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Sign in to hire</Button>
                <Button variant="outline" disabled>
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
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
              {professional.serviceArea && (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-4 w-4" />
                  Serves: {professional.serviceArea}
                </span>
              )}
              <span>{getAvailabilityBadge(professional.availability)}</span>
              <span>{getWorkModeBadge(professional.workMode)}</span>
            </div>

            {/* Verification Status */}
            {professional.verificationStatus && (
              <div className="mt-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Verification: </span>
                {getVerificationBadge(professional.verificationStatus)}
              </div>
            )}
          </div>
        </article>

        {/* Main Content Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="skills">Skills & Experience</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {professional.bio ?? "This professional has not added an introduction yet."}
                </p>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {professional.email}
                    </dd>
                  </div>
                  {professional.phone && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {professional.phone}
                      </dd>
                    </div>
                  )}
                  {professional.companyWebsite && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={professional.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {professional.companyWebsite}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                  {professional.portfolioUrl && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Portfolio</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={professional.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View Portfolio
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Company Info */}
            {(professional.companyName || professional.industry || professional.teamSize) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {professional.companyName && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Company Name</dt>
                        <dd className="mt-1">{professional.companyName}</dd>
                      </div>
                    )}
                    {professional.industry && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
                        <dd className="mt-1">{professional.industry}</dd>
                      </div>
                    )}
                    {professional.teamSize && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Team Size</dt>
                        <dd className="mt-1">{professional.teamSize}</dd>
                      </div>
                    )}
                    {professional.address && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                        <dd className="mt-1">{professional.address}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Skills & Experience Tab */}
          <TabsContent value="skills" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.skills.length ? (
                  <div className="flex flex-wrap gap-2">
                    {professional.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No skills published yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Experience & Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {professional.experienceYears !== null && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Years of Experience</dt>
                      <dd className="mt-1 text-2xl font-semibold">{professional.experienceYears}+ years</dd>
                    </div>
                  )}
                  {professional.certifications.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">Certifications</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {professional.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {professional.tradeLicenseUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Trade License
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={professional.tradeLicenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Trade License
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Services Offered
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.services.length > 0 ? (
                  <div className="space-y-4">
                    {professional.services.map((service) => (
                      <div
                        key={service.id}
                        className="rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{service.name}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {service.price !== null && (
                              <span className="text-lg font-semibold">
                                {formatCurrency(service.price)}
                                {service.price > 0 ? "/service" : ""}
                              </span>
                            )}
                            <Badge variant={service.isActive ? "default" : "secondary"}>
                              {service.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        {service.imageUrl && (
                          <div className="mt-3">
                            <img
                              src={service.imageUrl}
                              alt={service.name}
                              className="rounded-lg max-h-48 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No services published yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {professional.hourlyRate !== null && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Hourly Rate</dt>
                      <dd className="mt-1 text-2xl font-semibold">{formatCurrency(professional.hourlyRate)}/hr</dd>
                    </div>
                  )}
                  {professional.fixedRate !== null && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Fixed Rate</dt>
                      <dd className="mt-1 text-2xl font-semibold">{formatCurrency(professional.fixedRate)}</dd>
                    </div>
                  )}
                  {(professional.hourlyRate === null && professional.fixedRate === null) && (
                    <div className="sm:col-span-2">
                      <p className="text-muted-foreground">Contact for pricing</p>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Work Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.workPhotos.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {professional.workPhotos.map((photo, index) => (
                      <div key={index} className="relative aspect-video rounded-xl overflow-hidden">
                        <img
                          src={photo}
                          alt={`Work sample ${index + 1}`}
                          className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
                    <Image className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No work photos yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This professional hasn't uploaded any work samples.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      {getVerificationBadge(professional.verificationStatus)}
                    </dd>
                  </div>
                  {professional.governmentIdUrl && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Government ID</dt>
                      <dd className="mt-1">
                        <a
                          href={professional.governmentIdUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                        </a>
                      </dd>
                    </div>
                  )}
                  {professional.licenseUrl && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">License</dt>
                      <dd className="mt-1">
                        <a
                          href={professional.licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                        </a>
                      </dd>
                    </div>
                  )}
                  {professional.insuranceUrl && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Insurance</dt>
                      <dd className="mt-1">
                        <a
                          href={professional.insuranceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                        </a>
                      </dd>
                    </div>
                  )}
                  {professional.selfieUrl && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Selfie Verification</dt>
                      <dd className="mt-1">
                        <a
                          href={professional.selfieUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Image className="h-4 w-4" />
                          View Photo
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Member Since</dt>
                    <dd className="mt-1">{formatDate(professional.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                    <dd className="mt-1">{formatDate(professional.updatedAt)}</dd>
                  </div>
                  {professional.lastLoginAt && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Last Login</dt>
                      <dd className="mt-1">{formatDate(professional.lastLoginAt)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Account Status</dt>
                    <dd className="mt-1">
                      <Badge variant={professional.isActive ? "default" : "destructive"}>
                        {professional.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                  {professional.serviceRadiusKm && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Service Radius</dt>
                      <dd className="mt-1">{professional.serviceRadiusKm} km</dd>
                    </div>
                  )}
                  {(professional.professionalLatitude !== null && professional.professionalLongitude !== null) && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Coordinates</dt>
                      <dd className="mt-1 text-sm font-mono">
                        {professional.professionalLatitude.toFixed(6)}, {professional.professionalLongitude.toFixed(6)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Service Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                {professional.serviceArea ? (
                  <p>{professional.serviceArea}</p>
                ) : (
                  <p className="text-muted-foreground">No specific service area defined</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}