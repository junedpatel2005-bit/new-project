import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "/";
  const slug = path === "/" ? "" : path.replace(/^\//, "");
  const page = await db.cmsPage.findUnique({
    where: { slug },
    select: { status: true, sections: true },
  });

  if (!page || page.status !== "PUBLISHED") {
    return NextResponse.json({ blocks: [] });
  }

  try {
    const parsed: unknown = JSON.parse(page.sections || "[]");
    return NextResponse.json({ blocks: Array.isArray(parsed) ? parsed : [] });
  } catch {
    return NextResponse.json({ blocks: [] });
  }
}
