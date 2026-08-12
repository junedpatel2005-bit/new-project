import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const sql = await readFile(
  "prisma/migrations/202608120003_shared_project_tracking/migration.sql",
  "utf8",
);

try {
  await db.$transaction(
    sql
      .split(";\n")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => db.$executeRawUnsafe(statement)),
  );
  console.log("Shared project tracking schema applied safely.");
} finally {
  await db.$disconnect();
}
