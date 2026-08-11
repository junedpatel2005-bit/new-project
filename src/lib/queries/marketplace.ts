import "server-only";
import { db } from "@/lib/db";
import type {
  MarketplaceCategory,
  MarketplaceJob,
  MarketplaceProfessional,
} from "@/lib/types/marketplace";

function parseSkills(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((skill) => typeof skill === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function toProfessional(professional: {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  professionalCategory: string | null;
  professionalCity: string | null;
  hourlyRate: number | null;
  averageRating: number;
  reviewCount: number;
  availabilityStatus: string;
  isVerified: boolean;
  professionalSkillsJson: string | null;
  companyDescription: string | null;
}): MarketplaceProfessional {
  return {
    id: String(professional.id),
    name: `${professional.firstName} ${professional.lastName}`.trim(),
    title: professional.professionalCategory ?? "Professional",
    avatar: professional.avatarUrl,
    rating: professional.averageRating,
    reviews: professional.reviewCount,
    hourlyRate: professional.hourlyRate,
    location: professional.professionalCity,
    availability: professional.availabilityStatus,
    verified: professional.isVerified,
    skills: parseSkills(professional.professionalSkillsJson),
    bio: professional.companyDescription,
  };
}

export async function listCategories(): Promise<MarketplaceCategory[]> {
  const [categories, professionals] = await Promise.all([
    db.serviceCategory.findMany({
      select: { id: true, name: true, slug: true, description: true, iconName: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.user.groupBy({
      by: ["professionalCategory"],
      where: { role: "PROFESSIONAL", isActive: true },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(
    professionals.map((entry) => [entry.professionalCategory, entry._count._all]),
  );
  return categories.map((category) => ({
    ...category,
    professionalCount: counts.get(category.name) ?? 0,
  }));
}

export async function listProfessionals(): Promise<MarketplaceProfessional[]> {
  const professionals = await db.user.findMany({
    where: { role: "PROFESSIONAL", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      professionalCategory: true,
      professionalCity: true,
      hourlyRate: true,
      averageRating: true,
      reviewCount: true,
      availabilityStatus: true,
      isVerified: true,
      professionalSkillsJson: true,
      companyDescription: true,
    },
    orderBy: [{ isVerified: "desc" }, { averageRating: "desc" }],
    take: 50,
  });
  return professionals.map(toProfessional);
}

export async function listOpenJobs(): Promise<MarketplaceJob[]> {
  const jobs = await db.clientJob.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      budgetMin: true,
      budgetMax: true,
      urgency: true,
      workMode: true,
      locationLabel: true,
      locationAddress: true,
      jobDate: true,
      deadline: true,
      timingType: true,
      hourlyRate: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true, averageRating: true } },
      _count: { select: { favoriteJobs: true } },
      attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true, previewUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jobs
    .filter((job): job is typeof job & { title: string; description: string; category: string } =>
      Boolean(job.title && job.description && job.category),
    )
    .map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      category: job.category,
      budgetMin: job.budgetMin,
      budgetMax: job.budgetMax,
      urgency: job.urgency,
      workMode: job.workMode,
      location: job.locationLabel,
      locationAddress: job.locationAddress,
      jobDate: job.jobDate?.toISOString() ?? null,
      deadline: job.deadline?.toISOString() ?? null,
      timingType: job.timingType as "FIXED" | "HOURLY",
      hourlyRate: job.hourlyRate,
      createdAt: job.createdAt.toISOString(),
      proposalCount: job._count.favoriteJobs,
      client: {
        name: `${job.user.firstName} ${job.user.lastName}`.trim(),
        avatar: job.user.avatarUrl,
        rating: job.user.averageRating,
      },
      attachments: job.attachments,
    }));
}

export async function getProfessional(id: number): Promise<MarketplaceProfessional | null> {
  const professional = await db.user.findFirst({
    where: { id, role: "PROFESSIONAL", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      professionalCategory: true,
      professionalCity: true,
      hourlyRate: true,
      averageRating: true,
      reviewCount: true,
      availabilityStatus: true,
      isVerified: true,
      professionalSkillsJson: true,
      companyDescription: true,
    },
  });
  return professional ? toProfessional(professional) : null;
}

export async function getOpenJob(id: number): Promise<MarketplaceJob | null> {
  const job = await db.clientJob.findFirst({
    where: { id, status: "OPEN" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      budgetMin: true,
      budgetMax: true,
      urgency: true,
      workMode: true,
      locationLabel: true,
      locationAddress: true,
      jobDate: true,
      deadline: true,
      timingType: true,
      hourlyRate: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true, averageRating: true } },
      _count: { select: { favoriteJobs: true } },
      attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true, previewUrl: true } },
    },
  });
  if (!job || !job.title || !job.description || !job.category) return null;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    budgetMin: job.budgetMin,
    budgetMax: job.budgetMax,
    urgency: job.urgency,
    workMode: job.workMode,
    location: job.locationLabel,
    locationAddress: job.locationAddress,
    jobDate: job.jobDate?.toISOString() ?? null,
    deadline: job.deadline?.toISOString() ?? null,
    timingType: job.timingType as "FIXED" | "HOURLY",
    hourlyRate: job.hourlyRate,
    createdAt: job.createdAt.toISOString(),
    proposalCount: job._count.favoriteJobs,
    client: {
      name: `${job.user.firstName} ${job.user.lastName}`.trim(),
      avatar: job.user.avatarUrl,
      rating: job.user.averageRating,
    },
    attachments: job.attachments,
  };
}
