import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") ?? "/";
  const entries = await db.pageTextOverride.findMany({ where: { pagePath: path } });
  return NextResponse.json({
    text: Object.fromEntries(entries.map((entry) => [entry.elementKey, entry.text])),
  });
}
