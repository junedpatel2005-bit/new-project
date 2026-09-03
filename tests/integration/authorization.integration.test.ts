import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertDisposableTestDatabase } from "../../scripts/test-db-safety";
import { db } from "../../src/lib/db";
import { createSession, sessionCookie } from "../../src/lib/auth";

const prefix = "integration-authz-";

function requestWithSession(token?: string, method = "GET", body?: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: token
      ? {
          cookie: `${sessionCookie}=${token}`,
          ...(body ? { "content-type": "application/json" } : {}),
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("authorization and IDOR boundaries", () => {
  let clientA: { id: number };
  let clientB: { id: number };
  let professional: { id: number };
  let admin: { id: number };
  let jobA: { id: number };
  let clientAToken: string;
  let clientBToken: string;
  let professionalToken: string;
  let adminToken: string;

  beforeAll(async () => {
    assertDisposableTestDatabase();

    const users = await db.user.createManyAndReturn({
      data: [
        {
          email: `${prefix}client-a@example.test`,
          firstName: "Client",
          lastName: "A",
          emailVerifiedAt: new Date(),
        },
        {
          email: `${prefix}client-b@example.test`,
          firstName: "Client",
          lastName: "B",
          emailVerifiedAt: new Date(),
        },
        {
          email: `${prefix}professional@example.test`,
          firstName: "Professional",
          lastName: "A",
          role: "PROFESSIONAL",
          emailVerifiedAt: new Date(),
        },
        {
          email: `${prefix}admin@example.test`,
          firstName: "Admin",
          lastName: "A",
          role: "ADMIN",
          emailVerifiedAt: new Date(),
        },
      ],
      select: { id: true, email: true },
    });

    clientA = users.find((user) => user.email.includes("client-a"))!;
    clientB = users.find((user) => user.email.includes("client-b"))!;
    professional = users.find((user) => user.email.includes("professional"))!;
    admin = users.find((user) => user.email.includes("admin"))!;

    jobA = await db.clientJob.create({
      data: {
        userId: clientA.id,
        title: "Client A private job",
        category: "General",
        description: "Authorization integration fixture",
        status: "DRAFT",
      },
      select: { id: true },
    });

    [clientAToken, clientBToken, professionalToken, adminToken] = await Promise.all([
      createSession({ userId: clientA.id, role: "CLIENT" }),
      createSession({ userId: clientB.id, role: "CLIENT" }),
      createSession({ userId: professional.id, role: "PROFESSIONAL" }),
      createSession({ userId: admin.id, role: "ADMIN" }),
    ]);
  });

  afterAll(async () => {
    await db.clientJob.deleteMany({ where: { user: { email: { startsWith: prefix } } } });
    await db.session.deleteMany({ where: { user: { email: { startsWith: prefix } } } });
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.$disconnect();
  });

  it("allows the owner to read a job but hides it from other users and roles", async () => {
    const { GET } = await import("../../app/api/client/jobs/[id]/route");
    const params = Promise.resolve({ id: String(jobA.id) });

    expect((await GET(requestWithSession(clientAToken), { params })).status).toBe(200);
    expect((await GET(requestWithSession(clientBToken), { params })).status).toBe(404);
    expect((await GET(requestWithSession(professionalToken), { params })).status).toBe(404);
    expect((await GET(requestWithSession(), { params })).status).toBe(404);
  });

  it("prevents another client from mutating the owner's job", async () => {
    const { PATCH } = await import("../../app/api/client/jobs/[id]/route");
    const response = await PATCH(
      requestWithSession(clientBToken, "PATCH", { title: "Unauthorized change" }),
      { params: Promise.resolve({ id: String(jobA.id) }) },
    );

    expect(response.status).toBe(404);
    await expect(db.clientJob.findUniqueOrThrow({ where: { id: jobA.id } })).resolves.toMatchObject(
      {
        title: "Client A private job",
      },
    );
  });

  it("allows only admins to access the admin data API", async () => {
    const { GET } = await import("../../app/api/admin/data/[resource]/route");
    const params = Promise.resolve({ resource: "users" });

    expect((await GET(requestWithSession(), { params })).status).toBe(401);
    expect((await GET(requestWithSession(clientAToken), { params })).status).toBe(403);
    expect((await GET(requestWithSession(professionalToken), { params })).status).toBe(403);
    expect((await GET(requestWithSession(adminToken), { params })).status).toBe(200);
  });
});
