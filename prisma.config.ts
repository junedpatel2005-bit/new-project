import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx ./prisma/seed.ts",
  },
  // Prisma CLI commands such as migrate deploy need a session-capable connection.
  // The web application continues to use DATABASE_URL (Supavisor transaction pooler).
  datasource: { url: env("DIRECT_URL") },
});
