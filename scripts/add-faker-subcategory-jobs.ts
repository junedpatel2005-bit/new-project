import "dotenv/config";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const marker = "[Subcategory Demo Job]";
const seedClientEmail = "seed.client@servio.example";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const locations = [
  { city: "Mumbai", region: "Maharashtra", country: "India", lat: 19.076, lng: 72.8777 },
  { city: "London", region: "England", country: "United Kingdom", lat: 51.5072, lng: -0.1276 },
  { city: "Toronto", region: "Ontario", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { city: "Austin", region: "Texas", country: "United States", lat: 30.2672, lng: -97.7431 },
  { city: "Sydney", region: "New South Wales", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { city: "Berlin", region: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { city: "Dubai", region: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { city: "Singapore", region: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Sao Paulo", region: "Sao Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
  {
    city: "Cape Town",
    region: "Western Cape",
    country: "South Africa",
    lat: -33.9249,
    lng: 18.4241,
  },
  { city: "Tokyo", region: "Kanto", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { city: "Paris", region: "Ile-de-France", country: "France", lat: 48.8566, lng: 2.3522 },
];

function jitter(value: number) {
  return value + (Math.random() - 0.5) * 0.08;
}

async function main() {
  faker.seed(20260821);
  const client = await db.user.findUnique({
    where: { email: seedClientEmail },
    select: { id: true },
  });
  if (!client) throw new Error(`Client ${seedClientEmail} was not found.`);

  const subcategories = await db.serviceCategory.findMany({
    where: { parentId: { not: null } },
    orderBy: [{ segment: "asc" }, { sortOrder: "asc" }],
    select: { name: true, segment: true, parent: { select: { name: true } } },
  });
  if (!subcategories.length) {
    throw new Error("No subcategories found. Run scripts/add-demo-subcategories.ts first.");
  }

  let created = 0;
  let existing = 0;
  for (const [index, subcategory] of subcategories.entries()) {
    const location = locations[index % locations.length]!;
    const title = `${marker} ${subcategory.name} project in ${location.city}`;
    const alreadyExists = await db.clientJob.findFirst({
      where: { userId: client.id, title },
      select: { id: true },
    });
    if (alreadyExists) {
      existing += 1;
      continue;
    }

    const timingType = index % 4 === 0 ? "HOURLY" : "FIXED";
    const budgetMin = faker.number.int({ min: 700, max: 3000 });
    const budgetMax = budgetMin + faker.number.int({ min: 900, max: 5000 });
    await db.clientJob.create({
      data: {
        userId: client.id,
        title,
        category: subcategory.name,
        description: `${marker}\n${faker.lorem.paragraphs(3)}\nThe client needs an experienced professional for ${subcategory.name.toLowerCase()} in ${location.city}.`,
        status: "OPEN",
        timingType,
        budgetMin: timingType === "FIXED" ? budgetMin : null,
        budgetMax: timingType === "FIXED" ? budgetMax : null,
        hourlyRate: timingType === "HOURLY" ? faker.number.int({ min: 25, max: 150 }) : null,
        urgency: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
        workMode: index % 3 === 0 ? "REMOTE" : index % 3 === 1 ? "ON_SITE" : "BOTH",
        locationLabel: `${location.city}, ${location.country}`,
        locationAddress: `${faker.location.streetAddress()}, ${location.city}, ${location.region}, ${location.country}`,
        locationLat: jitter(location.lat),
        locationLng: jitter(location.lng),
        jobDate: faker.date.soon({ days: 20 }),
        deadline: faker.date.soon({ days: 45 }),
      },
    });
    created += 1;
    console.log(
      `Created ${subcategory.segment} / ${subcategory.parent?.name} / ${subcategory.name}`,
    );
  }

  console.info("subcategory.jobs.completed", {
    client: seedClientEmail,
    subcategories: subcategories.length,
    created,
    existing,
  });
}

main()
  .catch((error: unknown) => {
    console.error("subcategory.jobs.failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
