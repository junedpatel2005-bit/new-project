import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientSession } from "@/lib/client-profile-auth";

const locationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(300),
});

async function getOwnedLocation(request: NextRequest, id: string) {
  const session = await getClientSession(request);
  const locationId = Number(id);
  if (!session || !Number.isInteger(locationId) || locationId < 1) return null;
  return db.clientSavedLocation.findFirst({
    where: { id: locationId, clientProfile: { userId: session.userId } },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const location = await getOwnedLocation(request, (await params).id);
  if (!location) return NextResponse.json({ error: "Saved location not found." }, { status: 404 });
  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a label and address." }, { status: 400 });
  const updated = await db.clientSavedLocation.update({
    where: { id: location.id },
    data: parsed.data,
  });
  return NextResponse.json({ location: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const location = await getOwnedLocation(request, (await params).id);
  if (!location) return NextResponse.json({ error: "Saved location not found." }, { status: 404 });
  await db.clientSavedLocation.delete({ where: { id: location.id } });
  return NextResponse.json({ success: true });
}
