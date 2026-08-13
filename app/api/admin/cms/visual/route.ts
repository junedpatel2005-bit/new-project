import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

const schema = z.object({
  path: z.string().min(1).max(120),
  text: z.record(z.string().min(1).max(80), z.string().trim().min(1).max(600)),
});

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid page changes." }, { status: 400 });
    await db.$transaction(Object.entries(parsed.data.text).map(([elementKey, text]) =>
      db.pageTextOverride.upsert({
        where: { pagePath_elementKey: { pagePath: parsed.data.path, elementKey } },
        create: { pagePath: parsed.data.path, elementKey, text, updatedAt: new Date() },
        update: { text, updatedAt: new Date() },
      }),
    ));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin.cms.visual.save.failed", error);
    return NextResponse.json({ error: "Unable to save visual page." }, { status: 500 });
  }
}
