import { spawnSync } from "node:child_process";
import { assertDisposableTestDatabase } from "./test-db-safety";

const command = process.argv[2];
const composeFile = "docker-compose.test.yml";

function run(program: string, args: string[], environment = process.env) {
  const result = spawnSync(program, args, {
    stdio: "inherit",
    env: environment,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function testEnvironment() {
  const testUrl = assertDisposableTestDatabase();
  return { ...process.env, NODE_ENV: "test", DATABASE_URL: testUrl, DIRECT_URL: testUrl };
}

switch (command) {
  case "up":
    run("docker", ["compose", "-f", composeFile, "up", "-d", "--wait"]);
    break;
  case "down":
    assertDisposableTestDatabase();
    run("docker", ["compose", "-f", composeFile, "down", "--volumes", "--remove-orphans"]);
    break;
  case "migrate-replay":
    run("npx", ["prisma", "migrate", "deploy"], testEnvironment());
    break;
  case "integration":
    run("npx", ["prisma", "db", "push", "--force-reset", "--accept-data-loss"], testEnvironment());
    run("npx", ["vitest", "run", "--config", "vitest.integration.config.ts"], testEnvironment());
    break;
  default:
    throw new Error("Usage: test-db.ts <up|down|migrate-replay|integration>");
}
