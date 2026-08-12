import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaWithSharedTracking = PrismaClient & { projectTimelineEvent?: unknown };
const globalForPrisma = global as unknown as { prisma?: PrismaWithSharedTracking };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// Regenerate the development singleton after a Prisma schema change. Without this
// guard, Next's hot-reload can retain a client created before a new model existed.
export const db = globalForPrisma.prisma?.projectTimelineEvent
  ? globalForPrisma.prisma
  : new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
