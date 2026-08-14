import "dotenv/config";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = "junedpatel2005@gmail.com";
const marker = "[Demo Faker Job]";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const templates = [
  {
    title: "Modern landing page for a local business",
    category: "Design",
    timingType: "FIXED",
    budgetMin: 800,
    budgetMax: 1400,
  },
  {
    title: "Home office electrical upgrade",
    category: "Home Services",
    timingType: "FIXED",
    budgetMin: 450,
    budgetMax: 900,
  },
  {
    title: "Product photos for an online store",
    category: "Photography",
    timingType: "FIXED",
    budgetMin: 300,
    budgetMax: 650,
  },
  {
    title: "Website conversion audit",
    category: "Marketing",
    timingType: "FIXED",
    budgetMin: 500,
    budgetMax: 950,
  },
  {
    title: "React dashboard improvements",
    category: "Development",
    timingType: "HOURLY",
    budgetMin: null,
    budgetMax: null,
    hourlyRate: 65,
  },
  {
    title: "Brand identity and design system",
    category: "Design",
    timingType: "FIXED",
    budgetMin: 1200,
    budgetMax: 2400,
  },
];

async function main() {
  faker.seed(20260813);
  const client = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!client) throw new Error(`No account found for ${email}.`);
  const existing = await db.clientJob.findMany({
    where: { userId: client.id, description: { startsWith: marker } },
    select: { id: true, title: true },
  });
  const existingIds = existing.map((job) => job.id);
  if (existingIds.length) {
    await db.projectTracking.deleteMany({
      where: { clientId: client.id, jobId: { in: existingIds } },
    });
    await db.projectRequest.deleteMany({
      where: { clientId: client.id, jobId: { in: existingIds } },
    });
    await db.clientJob.updateMany({ where: { id: { in: existingIds } }, data: { status: "OPEN" } });
  }
  const existingTitles = new Set(existing.map((job) => job.title));
  let created = 0;

  for (const item of templates) {
    const title = `${marker} ${item.title}`;
    if (existingTitles.has(title)) continue;
    const job = await db.clientJob.create({
      data: {
        userId: client.id,
        title,
        category: item.category,
        description: `${marker}\n${faker.lorem.paragraphs(2)}`,
        status: "OPEN",
        timingType: item.timingType,
        budgetMin: item.budgetMin,
        budgetMax: item.budgetMax,
        hourlyRate: item.hourlyRate ?? null,
        urgency: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
        workMode:
          item.category === "Development" || item.category === "Marketing" ? "REMOTE" : "ON_SITE",
        locationLabel:
          item.category === "Development" || item.category === "Marketing"
            ? "Remote"
            : "Surat, Gujarat",
        locationAddress:
          item.category === "Development" || item.category === "Marketing"
            ? "Remote"
            : "Surat, Gujarat, India",
        locationLat:
          item.category === "Development" || item.category === "Marketing" ? null : 21.1702,
        locationLng:
          item.category === "Development" || item.category === "Marketing" ? null : 72.8311,
        deadline: faker.date.soon({ days: 35 }),
      },
    });
    created += 1;
  }

  console.info("faker.jobs.added", { account: email, created, existing: existing.length });
}

main()
  .catch((error: unknown) => {
    console.error("faker.jobs.failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
