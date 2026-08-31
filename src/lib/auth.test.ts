import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique } = vi.hoisted(() => {
  process.env.AUTH_SECRET = "test-only-auth-secret";
  return { findUnique: vi.fn() };
});

vi.mock("server-only", () => ({}));

vi.mock("./db", () => ({
  db: {
    user: {
      findUnique,
    },
  },
}));

import { createSession, requireVerifiedUser, verifySession } from "./auth";

describe("database-backed sessions", () => {
  beforeEach(() => findUnique.mockReset());

  it("allows a verified active user and uses the current database role", async () => {
    findUnique.mockResolvedValue({
      id: 42,
      role: "PROFESSIONAL",
      isActive: true,
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(requireVerifiedUser(token)).resolves.toMatchObject({
      userId: 42,
      role: "PROFESSIONAL",
    });
  });

  it("rejects an unverified user from verified operations", async () => {
    findUnique.mockResolvedValue({
      id: 42,
      role: "CLIENT",
      isActive: true,
      emailVerifiedAt: null,
    });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(requireVerifiedUser(token)).rejects.toThrow("Email verification required");
  });

  it("rejects a disabled user", async () => {
    findUnique.mockResolvedValue({
      id: 42,
      role: "CLIENT",
      isActive: false,
      emailVerifiedAt: new Date(),
    });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(verifySession(token)).rejects.toThrow("Inactive session user");
  });

  it("rejects a deleted user", async () => {
    findUnique.mockResolvedValue(null);
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(verifySession(token)).rejects.toThrow("Inactive session user");
  });
});
