import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: `${path.resolve(import.meta.dirname, "src")}/$1` }],
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.{git,cache,output,temp}/**"],
  },
});
