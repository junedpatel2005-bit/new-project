import { db } from "@/lib/db";
import { getDistanceBoundingBox, getDistanceKm, createDisplayPoint } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfessionalDiscoveryResult } from "@/lib/types/professional-discovery";

export type ProfessionalDiscoveryFilter = {
  query?: string;
  segment?: string;
  category?: string;
  city?: string;
  minRating?: number;
  verified?: boolean;
  availability?: string;
  distanceKm?: number;
  originLat?: number;
  originLng?: number;
  sort?: "recommended" | "rating" | "distance" | "most-reviewed" | "price";
  page?: number;
  limit?: number;
};

const MAX_RESULTS_PER_PAGE = 50;
const DEFAULT_RESULTS_PER_PAGE = 20;

async function buildSearchWhere(filter: ProfessionalDiscoveryFilter) {
  const where: Prisma.UserWhereInput = {
    role: "PROFESSIONAL",
    isActive: true,
  };

  if (filter.verified) {
    where.isVerified = true;
  }

  if (filter.category) {
    where.professionalCategory = filter.category;
  }

  if (filter.segment) {
    const segmentCategories = await db.serviceCategory.findMany({
      where: { segment: filter.segment },
      select: { name: true },
    });
    where.professionalCategory = filter.category
      ? filter.category
      : { in: segmentCategories.map((category) => category.name) };
  }

  if (filter.city) {
    where.professionalCity = filter.city;
  }

  if (filter.availability) {
    where.availabilityStatus = filter.availability;
  }

  if (typeof filter.minRating === "number") {
    where.averageRating = { gte: filter.minRating };
  }

  if (filter.query?.trim()) {
    const term = filter.query.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { professionalCategory: { contains: term, mode: "insensitive" } },
      { professionalCity: { contains: term, mode: "insensitive" } },
      { companyDescription: { contains: term, mode: "insensitive" } },
      { professionalSkillsJson: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(
  filter: ProfessionalDiscoveryFilter,
): Array<{ [key: string]: "asc" | "desc" }> {
  if (filter.sort === "rating") {
    return [{ averageRating: "desc" }, { reviewCount: "desc" }, { updatedAt: "desc" }];
  }
  if (filter.sort === "most-reviewed") {
    return [{ reviewCount: "desc" }, { averageRating: "desc" }, { updatedAt: "desc" }];
  }
  if (filter.sort === "price") {
    return [{ hourlyRate: "asc" }, { averageRating: "desc" }];
  }
  return [{ isVerified: "desc" }, { averageRating: "desc" }, { reviewCount: "desc" }];
}

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

function toPublicProfessional(
  professional: {
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
    professionalLatitude: number | null;
    professionalLongitude: number | null;
  },
  distanceKm: number | null,
): ProfessionalDiscoveryResult {
  return {
    id: String(professional.id),
    name: `${professional.firstName} ${professional.lastName}`.trim(),
    title: professional.professionalCategory ?? "Professional",
    avatarUrl: professional.avatarUrl,
    verified: professional.isVerified,
    rating: professional.averageRating,
    reviewCount: professional.reviewCount,
    hourlyRate: professional.hourlyRate,
    location: professional.professionalCity,
    approximateDistanceKm: distanceKm,
    availabilityStatus: professional.availabilityStatus,
    skills: parseSkills(professional.professionalSkillsJson),
    bio: professional.companyDescription,
    displayPoint:
      professional.professionalLatitude !== null && professional.professionalLongitude !== null
        ? (createDisplayPoint(
            professional.id,
            professional.professionalLatitude,
            professional.professionalLongitude,
          ) ?? undefined)
        : undefined,
  };
}

type UserProfessionalRecord = {
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
  professionalLatitude: number | null;
  professionalLongitude: number | null;
};

function applyDistanceFilter(
  professionals: UserProfessionalRecord[],
  originLat: number,
  originLng: number,
  distanceKm: number,
) {
  return professionals
    .map((professional) => {
      if (
        professional.professionalLatitude === null ||
        professional.professionalLongitude === null ||
        Number.isNaN(professional.professionalLatitude) ||
        Number.isNaN(professional.professionalLongitude)
      ) {
        return null;
      }
      const distance = getDistanceKm(
        originLat,
        originLng,
        professional.professionalLatitude,
        professional.professionalLongitude,
      );
      return { professional, distance };
    })
    .filter(
      (item): item is { professional: (typeof professionals)[number]; distance: number } =>
        item !== null && item.distance <= distanceKm,
    );
}

export async function searchProfessionals(filter: ProfessionalDiscoveryFilter) {
  const page = Math.max(filter.page ?? 1, 1);
  const limit = Math.min(
    Math.max(filter.limit ?? DEFAULT_RESULTS_PER_PAGE, 1),
    MAX_RESULTS_PER_PAGE,
  );
  const pageStart = (page - 1) * limit;
  const pageEnd = pageStart + limit;
  const useExactDistanceFiltering =
    typeof filter.distanceKm === "number" &&
    typeof filter.originLat === "number" &&
    typeof filter.originLng === "number";
  const useDistanceOrdering =
    filter.sort === "distance" &&
    typeof filter.originLat === "number" &&
    typeof filter.originLng === "number";

  const baseWhere = await buildSearchWhere(filter);
  if (useExactDistanceFiltering) {
    const originLat = filter.originLat!;
    const originLng = filter.originLng!;
    const distanceKm = filter.distanceKm!;
    const bbox = getDistanceBoundingBox(originLat, distanceKm);
    baseWhere.professionalLatitude = {
      gte: originLat - bbox.latDelta,
      lte: originLat + bbox.latDelta,
    };
    baseWhere.professionalLongitude = {
      gte: originLng - bbox.lngDelta,
      lte: originLng + bbox.lngDelta,
    };
    baseWhere.AND = [
      { professionalLatitude: { not: null } },
      { professionalLongitude: { not: null } },
    ];
  }

  const candidateTake =
    useExactDistanceFiltering || useDistanceOrdering ? Math.min(page * limit + 20, 200) : limit + 1;
  const candidateSkip = useExactDistanceFiltering || useDistanceOrdering ? 0 : pageStart;

  const candidateUsersQuery = {
    where: baseWhere,
    orderBy: buildOrderBy(filter),
    skip: candidateSkip,
    take: candidateTake,
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
      professionalLatitude: true,
      professionalLongitude: true,
    },
  } as const;

  const professionals = (await db.user.findMany(candidateUsersQuery)) as UserProfessionalRecord[];

  let distanceFilteredResults: Array<{
    professional: UserProfessionalRecord;
    distance: number;
  }> | null = null;
  let sortedByDistanceResults: Array<{
    professional: UserProfessionalRecord;
    distance: number;
  }> | null = null;
  let pagedProfessionals: UserProfessionalRecord[] = professionals;

  if (useExactDistanceFiltering) {
    distanceFilteredResults = applyDistanceFilter(
      professionals,
      filter.originLat!,
      filter.originLng!,
      filter.distanceKm!,
    );

    if (useDistanceOrdering) {
      distanceFilteredResults.sort((a, b) => a.distance - b.distance);
    }

    pagedProfessionals = distanceFilteredResults
      .slice(pageStart, pageEnd)
      .map((item) => item.professional);
  } else if (useDistanceOrdering) {
    sortedByDistanceResults = professionals
      .map((professional) => {
        if (
          professional.professionalLatitude === null ||
          professional.professionalLongitude === null ||
          Number.isNaN(professional.professionalLatitude) ||
          Number.isNaN(professional.professionalLongitude)
        ) {
          return { professional, distance: Number.POSITIVE_INFINITY };
        }
        return {
          professional,
          distance: getDistanceKm(
            filter.originLat!,
            filter.originLng!,
            professional.professionalLatitude,
            professional.professionalLongitude,
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance);

    pagedProfessionals = sortedByDistanceResults
      .slice(pageStart, pageEnd)
      .map((item) => item.professional);
  } else {
    pagedProfessionals = professionals.slice(0, limit);
  }

  const results = pagedProfessionals.map((professional) => {
    const distance =
      distanceFilteredResults?.find((item) => item.professional.id === professional.id)?.distance ??
      sortedByDistanceResults?.find((item) => item.professional.id === professional.id)?.distance ??
      null;
    return toPublicProfessional(
      professional,
      typeof distance === "number" && Number.isFinite(distance) ? distance : null,
    );
  });

  const total = await db.user.count({ where: baseWhere });
  const hasMore =
    useExactDistanceFiltering || useDistanceOrdering
      ? Boolean(
          (distanceFilteredResults?.length ??
            sortedByDistanceResults?.length ??
            professionals.length) > pageEnd,
        )
      : professionals.length > limit;

  return {
    professionals: results,
    total,
    page,
    limit,
    hasMore,
    facets: { cities: [], categories: [] },
  };
}
