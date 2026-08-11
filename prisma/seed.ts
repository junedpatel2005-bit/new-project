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
  // Surat, Gujarat coordinates
  const suratLat = 21.1702;
  const suratLng = 72.8311;

  const professionals = Array.from({ length: 12 }, (_, index) => ({
    email: `professional.${index + 1}@${SEED_DOMAIN}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    category: categories[index % categories.length] ?? "Development",
    city: faker.location.city(),
    hourlyRate: faker.number.int({ min: 35, max: 180 }),
    skills: faker.helpers.arrayElements(
      ["React", "TypeScript", "Plumbing", "Figma", "SEO", "Photography", "Tutoring", "AWS"],
      { min: 3, max: 5 },
    ),
    // Generate realistic lat/lng coordinates (using major city areas)
    latitude: faker.location.latitude({ min: -90, max: 90 }),
    longitude: faker.location.longitude({ min: -180, max: 180 }),
  }));

  // Add a specific professional in Surat
  professionals.push({
    email: "surat.pro@servio.example",
    firstName: "Rajesh",
    lastName: "Patel",
    category: "Development",
    city: "Surat",
    hourlyRate: 120,
    skills: ["React", "TypeScript", "AWS", "Figma", "SEO"],
    latitude: suratLat,
    longitude: suratLng,
  });
  return Promise.all(
    professionals.map((professional, index) =>
      db.user.upsert({
        where: { email: professional.email },
        update: {
          professionalLatitude: professional.latitude,
          professionalLongitude: professional.longitude,
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
          professionalCity: professional.city,
          hourlyRate: professional.hourlyRate,
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
