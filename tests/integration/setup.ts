import { vi } from "vitest";

process.env.AUTH_SECRET ??= "integration-only-auth-secret";

// Next.js uses this package as a build-time server/client boundary marker.
// Vitest runs these tests directly in Node, so the marker has no runtime behavior.
vi.mock("server-only", () => ({}), { virtual: true });
