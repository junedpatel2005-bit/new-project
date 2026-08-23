import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

async function isAdmin(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return false;
  try {
    return (await verifySession(token)).role === "ADMIN";
  } catch {
    return false;
  }
}
const input = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  iconName: z.string().trim().max(80).default("FolderTree"),
  segment: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"]).default("RESIDENTIAL"),
  parentId: z.coerce.number().int().positive().nullable().default(null),
});
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request)))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return NextResponse.json({
    services: await db.serviceCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request)))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const parsed = input.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid service name." }, { status: 400 });
  const baseSlug = slugify(parsed.data.name);
  const exists = await db.serviceCategory.findUnique({ where: { slug: baseSlug } });
  if (exists)
    return NextResponse.json(
      { error: "A service with this name already exists." },
      { status: 409 },
    );
  if (parsed.data.parentId !== null) {
    const parent = await db.serviceCategory.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.parentId !== null || parent.segment !== parsed.data.segment)
      return NextResponse.json(
        { error: "Choose a valid top-level category as the parent." },
        { status: 400 },
      );
  }
  const service = await db.serviceCategory.create({
    data: { ...parsed.data, slug: baseSlug, sortOrder: await db.serviceCategory.count() },
  });
  return NextResponse.json({ service }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request)))
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id))
    return NextResponse.json({ error: "Invalid service." }, { status: 400 });
  await db.serviceCategory.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
