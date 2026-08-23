import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
const block = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["text", "image", "table", "button", "video", "spacer", "divider"]),
  heading: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
  imageUrl: z.string().max(1000).optional(),
  imageAlt: z.string().max(300).optional(),
  buttonLabel: z.string().max(100).optional(),
  buttonUrl: z.string().max(1000).optional(),
  videoUrl: z.string().max(1000).optional(),
  height: z.number().int().min(8).max(800).optional(),
  placement: z.enum(["top", "after-1", "after-2", "after-3", "bottom", "footer"]).optional(),
  rows: z
    .array(z.array(z.string().max(500)))
    .max(30)
    .optional(),
});
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN")
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = z
      .object({
        title: z.string().trim().min(1).max(250),
        content: z.string().max(200000),
        status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
        sections: z.array(block).max(50).optional(),
      })
      .safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: "Invalid CMS page." }, { status: 400 });
    const { id } = await params;
    const page = await db.cmsPage.update({
      where: { id: Number(id) },
      data: {
        title: body.data.title,
        content: body.data.content,
        status: body.data.status,
        sections: body.data.sections ? JSON.stringify(body.data.sections) : undefined,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: "Unable to save page." }, { status: 500 });
  }
}
