import "dotenv/config";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const SEED_PASSWORD = "ServioSeed#2026";
const SEED_CLIENT_EMAIL = "seed.client@servio.example";
const SEED_DOMAIN = "seed.servio.example";
const categories = [
  "Development",
  "Design",
  "Home Services",
  "Photography",
  "Marketing",
  "Tutoring",
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const INDIAN_CITIES: { city: string; lat: number; lng: number }[] = [
  { city: "Mumbai", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Bengaluru", lat: 12.9716, lng: 77.5946 },
  { city: "Surat", lat: 21.1702, lng: 72.8311 },
  { city: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { city: "Pune", lat: 18.5204, lng: 73.8567 },
  { city: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { city: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { city: "Chandigarh", lat: 30.7333, lng: 76.7794 },
];

/** Jitters a city center by up to ~5km so professionals in the same city don't stack exactly. */
function jitterNearCity(city: { lat: number; lng: number }) {
  const jitterDegrees = 0.045;
  return {
    lat: city.lat + (Math.random() - 0.5) * jitterDegrees,
    lng: city.lng + (Math.random() - 0.5) * jitterDegrees,
  };
}

const CATEGORY_INDUSTRY: Record<string, string> = {
  Development: "Information Technology",
  Design: "Creative Services",
  "Home Services": "Home & Facility Maintenance",
  Photography: "Media & Entertainment",
  Marketing: "Marketing & Advertising",
  Tutoring: "Education & Training",
};

async function upsertCategories() {
  await Promise.all(
    categories.map((name, index) =>
      db.serviceCategory.upsert({
        where: { name },
        update: {},
        create: {
          name,
          slug: name.toLowerCase().replaceAll(" ", "-"),
          description: `Find qualified ${name.toLowerCase()} professionals.`,
          iconName: "Briefcase",
          sortOrder: index,
        },
      }),
    ),
  );
}

async function createProfessionals(passwordHash: string) {
  const professionals = Array.from({ length: 12 }, (_, index) => {
    const cityInfo = INDIAN_CITIES[index % INDIAN_CITIES.length]!;
    const coords = jitterNearCity(cityInfo);
    const category = categories[index % categories.length] ?? "Development";
    return {
      email: `professional.${index + 1}@${SEED_DOMAIN}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      category,
      industry: CATEGORY_INDUSTRY[category] ?? "Professional Services",
      city: cityInfo.city,
      hourlyRate: faker.number.int({ min: 35, max: 180 }),
      fixedRate: faker.number.int({ min: 2000, max: 25000 }),
      experienceYears: faker.number.int({ min: 1, max: 15 }),
      serviceArea: `${cityInfo.city} and nearby areas`,
      address: `${faker.location.buildingNumber()}, ${faker.location.street()}, ${cityInfo.city}`,
      teamSize: faker.helpers.arrayElement(["Just me", "2-5", "6-10"]),
      skills: faker.helpers.arrayElements(
        ["React", "TypeScript", "Plumbing", "Figma", "SEO", "Photography", "Tutoring", "AWS"],
        { min: 3, max: 5 },
      ),
      latitude: coords.lat,
      longitude: coords.lng,
    };
  });

  // A fully-detailed professional used as the reference profile.
  const suratCity = INDIAN_CITIES.find((entry) => entry.city === "Surat")!;
  professionals.push({
    email: "surat.pro@servio.example",
    firstName: "Rajesh",
    lastName: "Patel",
    category: "Development",
    industry: CATEGORY_INDUSTRY.Development!,
    city: "Surat",
    hourlyRate: 120,
    fixedRate: 45000,
    experienceYears: 8,
    serviceArea: "Vesu, Adajan, Piplod, Surat",
    address: "204, Divine Enclave, Vesu, Surat, Gujarat 395007",
    teamSize: "2-5",
    skills: ["React", "TypeScript", "AWS", "Figma", "SEO"],
    latitude: suratCity.lat,
    longitude: suratCity.lng,
  });

  return Promise.all(
    professionals.map((professional, index) =>
      db.user.upsert({
        where: { email: professional.email },
        update: {
          professionalLatitude: professional.latitude,
          professionalLongitude: professional.longitude,
          professionalCity: professional.city,
          industry: professional.industry,
          experienceYears: professional.experienceYears,
          fixedRate: professional.fixedRate,
          serviceArea: professional.serviceArea,
          address: professional.address,
          teamSize: professional.teamSize,
        },
        create: {
          email: professional.email,
          firstName: professional.firstName,
          lastName: professional.lastName,
          passwordHash,
          role: "PROFESSIONAL",
          authProvider: "LOCAL",
          emailVerifiedAt: new Date(),
          professionalCategory: professional.category,
          industry: professional.industry,
          professionalCity: professional.city,
          hourlyRate: professional.hourlyRate,
          fixedRate: professional.fixedRate,
          experienceYears: professional.experienceYears,
          serviceArea: professional.serviceArea,
          address: professional.address,
          teamSize: professional.teamSize,
          professionalSkillsJson: JSON.stringify(professional.skills),
          companyDescription: faker.company.catchPhrase(),
          isVerified: index % 3 !== 0,
          availabilityStatus: index % 2 === 0 ? "available" : "this_week",
          averageRating: faker.number.float({ min: 4.1, max: 5, fractionDigits: 1 }),
          reviewCount: faker.number.int({ min: 3, max: 65 }),
          professionalLatitude: professional.latitude,
          professionalLongitude: professional.longitude,
        },
      }),
    ),
  );
}

async function createJobs(clientId: number) {
  const jobs = Array.from({ length: 8 }, (_, index) => ({
    title: `Seed marketplace job ${index + 1}: ${faker.company.catchPhrase()}`,
    category: categories[index % categories.length] ?? "Development",
    description: faker.lorem.paragraphs(2),
  }));
  await Promise.all(
    jobs.map(async (job, index) => {
      const existing = await db.clientJob.findFirst({
        where: { title: job.title },
        select: { id: true },
      });
      if (existing) return;
      await db.clientJob.create({
        data: {
          userId: clientId,
          title: job.title,
          category: job.category,
          description: job.description,
          budgetMin: faker.number.int({ min: 500, max: 2500 }),
          budgetMax: faker.number.int({ min: 3000, max: 10000 }),
          urgency: index % 3 === 0 ? "HIGH" : "MEDIUM",
          workMode: index % 2 === 0 ? "REMOTE" : "ON_SITE",
          locationLabel: index % 2 === 0 ? "Remote" : faker.location.city(),
          deadline: faker.date.soon({ days: 30 }),
        },
      });
    }),
  );
}

async function main() {
  faker.seed(20260810);
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  await upsertCategories();
  const client = await db.user.upsert({
    where: { email: SEED_CLIENT_EMAIL },
    update: {},
    create: {
      email: SEED_CLIENT_EMAIL,
      firstName: "Seed",
      lastName: "Client",
      passwordHash,
      role: "CLIENT",
      authProvider: "LOCAL",
      emailVerifiedAt: new Date(),
    },
  });
  await createProfessionals(passwordHash);
  await createJobs(client.id);
  console.info("seed.completed", { categories: categories.length, professionals: 12, jobs: 8 });
}

main()
  .catch((error: unknown) => {
    console.error("seed.failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
