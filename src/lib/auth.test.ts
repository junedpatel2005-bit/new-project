import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, sessionCreate, sessionFindUnique, sessionUpdateMany } = vi.hoisted(() => {
  process.env.AUTH_SECRET = "test-only-auth-secret";
  return {
    findUnique: vi.fn(),
    sessionCreate: vi.fn(),
    sessionFindUnique: vi.fn(),
    sessionUpdateMany: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("./db", () => ({
  db: {
    user: {
      findUnique,
    },
    session: {
      create: sessionCreate,
      findUnique: sessionFindUnique,
      updateMany: sessionUpdateMany,
    },
  },
}));

import { createSession, requireVerifiedUser, revokeSession, verifySession } from "./auth";

describe("database-backed sessions", () => {
  beforeEach(() => {
    findUnique.mockReset();
    sessionCreate.mockReset();
    sessionFindUnique.mockReset();
    sessionUpdateMany.mockReset();
    sessionCreate.mockResolvedValue({});
  });

  function activeSession(overrides: Record<string, unknown> = {}) {
    sessionFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 42,
        role: "CLIENT",
        isActive: true,
        emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
        ...overrides,
      },
    });
  }

  it("allows a verified active user and uses the current database role", async () => {
    activeSession({ role: "PROFESSIONAL" });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(requireVerifiedUser(token)).resolves.toMatchObject({
      userId: 42,
      role: "PROFESSIONAL",
    });
  });

  it("rejects an unverified user from verified operations", async () => {
    activeSession({ emailVerifiedAt: null });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(requireVerifiedUser(token)).rejects.toThrow("Email verification required");
  });

  it("rejects a disabled user", async () => {
    activeSession({ isActive: false });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(verifySession(token)).rejects.toThrow("Inactive session");
  });

  it("rejects a deleted user", async () => {
    sessionFindUnique.mockResolvedValue(null);
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(verifySession(token)).rejects.toThrow("Inactive session");
  });

  it("rejects a revoked session", async () => {
    activeSession();
    const token = await createSession({ userId: 42, role: "CLIENT" });
    sessionFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: { id: 42, role: "CLIENT", isActive: true, emailVerifiedAt: new Date() },
    });
    await expect(verifySession(token)).rejects.toThrow("Inactive session");
  });

  it("revokes the database session represented by a valid token", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 1 });
    const token = await createSession({ userId: 42, role: "CLIENT" });
    await expect(revokeSession(token)).resolves.toBe(true);
    expect(sessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }) }),
    );
  });
});
