import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Professional sign-in is required." }, { status: 401 });
  try {
    const session = await verifySession(token);
    if (session.role !== "PROFESSIONAL") return NextResponse.json({ error: "Professional access required." }, { status: 403 });
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document first." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Document must be smaller than 10 MB." }, { status: 400 });
    const extension = path.extname(file.name).toLowerCase();
    if (!['.jpg','.jpeg','.png','.webp','.pdf'].includes(extension)) return NextResponse.json({ error: "Upload a JPG, PNG, WEBP, or PDF document." }, { status: 400 });
    const folder = path.join(process.cwd(), "public", "verification-uploads", String(session.userId));
    await mkdir(folder, { recursive: true });
    const name = `${randomUUID()}${extension}`;
    await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/verification-uploads/${session.userId}/${name}`, name: file.name });
  } catch { return NextResponse.json({ error: "Unable to upload document." }, { status: 500 }); }
}
