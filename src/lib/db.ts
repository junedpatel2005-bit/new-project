import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaWithSharedTracking = PrismaClient & {
  projectTimelineEvent?: unknown;
  verificationDocumentReview?: unknown;
  pageTextOverride?: unknown;
  projectDisputeMessage?: unknown;
};
const globalForPrisma = global as unknown as {
  prisma?: PrismaWithSharedTracking;
  pgPool?: Pool;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

// PrismaPg creates a new Pool for every adapter connection when it receives a
// config object. Supplying one shared Pool prevents concurrent requests from
// repeatedly opening connections to the Supabase PgBouncer endpoint.
const pgPool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
const adapter = new PrismaPg(pgPool);
// Regenerate the development singleton after a Prisma schema change. Without this
// guard, Next's hot-reload can retain a client created before a new model existed.
export const db =
  globalForPrisma.prisma?.projectTimelineEvent &&
  globalForPrisma.prisma?.verificationDocumentReview &&
  globalForPrisma.prisma?.pageTextOverride &&
  globalForPrisma.prisma?.projectDisputeMessage &&
  globalForPrisma.pgPool
    ? globalForPrisma.prisma
    : new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.pgPool = pgPool;
}
