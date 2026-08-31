import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const columns = await db.$queryRaw<{ column_name: string }[]>(Prisma.sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ProjectTracking'
  ORDER BY ordinal_position
`);
const migrations = await db
  .$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>(
    Prisma.sql`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY started_at
  `,
  )
  .catch(() => []);
console.log(JSON.stringify({ columns, migrations }));
await db.$disconnect();
