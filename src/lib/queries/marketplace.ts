import "server-only";
import { db } from "@/lib/db";

export async function listCategories() {
  return db.serviceCategory.findMany({
    select: { id: true, name: true, slug: true, description: true, iconName: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listProfessionals() {
  return db.user.findMany({
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
    },
    orderBy: [{ isVerified: "desc" }, { averageRating: "desc" }],
    take: 50,
  });
}

export async function listOpenJobs() {
  return db.clientJob.findMany({
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
      createdAt: true,
      user: { select: { firstName: true, lastName: true, avatarUrl: true, averageRating: true } },
      _count: { select: { favoriteJobs: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
