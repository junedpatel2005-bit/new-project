import { NextResponse } from "next/server";
import { listCategories, listOpenJobs, listProfessionals } from "@/lib/queries/marketplace";

export async function GET(_: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  try {
    if (resource === "categories") return NextResponse.json(await listCategories());
    if (resource === "professionals") return NextResponse.json(await listProfessionals());
    if (resource === "jobs") return NextResponse.json(await listOpenJobs());
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Unable to load marketplace data." }, { status: 500 });
  }
}
