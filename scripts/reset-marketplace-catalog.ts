import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const catalog = [
  [
    "Residential",
    [
      ["Web Development", "Frontend Developer"],
      ["Software Development", "Python Developer"],
      ["Mobile Development", "Android Developer"],
      ["IT Support", "Computer Technician"],
    ],
  ],
  [
    "Commercial",
    [
      ["Software Engineering", "Backend Developer"],
      ["Cloud Computing", "DevOps Engineer"],
      ["Data Science", "Data Analyst"],
      ["Cyber Security", "Security Analyst"],
    ],
  ],
  [
    "Industrial",
    [
      ["Artificial Intelligence", "Machine Learning Engineer"],
      ["Automation Technology", "Automation Programmer"],
      ["Embedded Systems", "Embedded Software Developer"],
      ["Robotics", "Robotics Programmer"],
    ],
  ],
] as const;

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const before = {
    jobs: await db.clientJob.count(),
    hireJobs: await db.hireJob.count(),
    categories: await db.serviceCategory.count(),
    payments: await db.payment.count(),
    earnings: await db.projectTransaction.count(),
  };
  console.log("Before:", before);

  await db.$transaction(
    async (tx) => {
      // Keep financial records, but remove nonfinancial project workflow rows.
      await tx.payment.updateMany({ data: { milestoneId: null } });
      await tx.projectTimelineEvent.deleteMany();
      await tx.projectWorkUpload.deleteMany();
      await tx.projectCompletionRequest.deleteMany();
      await tx.projectRevisionRequest.deleteMany();
      await tx.projectReviewRequest.deleteMany();
      await tx.projectDisputeMessage.deleteMany();
      await tx.projectDispute.deleteMany();
      await tx.projectReview.deleteMany();
      await tx.projectNegotiation.deleteMany();
      await tx.projectRequest.deleteMany();
      await tx.projectMilestone.deleteMany();
      await tx.projectTracking.deleteMany();

      await tx.favoriteJob.deleteMany();
      await tx.clientJobAttachment.deleteMany();
      await tx.clientJob.deleteMany();

      await tx.hireMilestone.deleteMany();
      await tx.hireAttachment.deleteMany();
      await tx.hireContract.deleteMany();
      await tx.directHireNegotiation.deleteMany();
      await tx.hireJob.deleteMany();

      await tx.service.deleteMany();
      await tx.serviceCategory.deleteMany();

      for (const [segment, groups] of catalog) {
        const root = await tx.serviceCategory.create({
          data: {
            name: segment,
            slug: slug(segment),
            segment: segment.toUpperCase(),
            sortOrder: catalog.findIndex(([name]) => name === segment),
          },
        });
        for (const [category, subCategory] of groups) {
          const parent = await tx.serviceCategory.create({
            data: {
              name: category,
              slug: slug(category),
              segment: segment.toUpperCase(),
              parentId: root.id,
            },
          });
          await tx.serviceCategory.create({
            data: {
              name: subCategory,
              slug: slug(subCategory),
              segment: segment.toUpperCase(),
              parentId: parent.id,
            },
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  const after = {
    jobs: await db.clientJob.count(),
    hireJobs: await db.hireJob.count(),
    categories: await db.serviceCategory.count(),
    payments: await db.payment.count(),
    earnings: await db.projectTransaction.count(),
  };
  console.log("After:", after);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
