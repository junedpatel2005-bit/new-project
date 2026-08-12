import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const sql = await readFile(
  "prisma/migrations/202608120004_professional_proposals/migration.sql",
  "utf8",
);

try {
  for (const statement of sql
    .split(";\n")
    .map((item) => item.trim())
    .filter(Boolean))
    await db.$executeRawUnsafe(statement);
  console.log("Professional proposal schema applied safely.");
} finally {
  await db.$disconnect();
}
