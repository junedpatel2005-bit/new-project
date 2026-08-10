import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientSession } from "@/lib/client-profile-auth";

const locationSchema = z.object({
  label: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(300),
});

async function getProfile(request: NextRequest) {
  const session = await getClientSession(request);
  if (!session) return null;
  const profile = await db.clientProfile.findFirst({ where: { userId: session.userId } });
  return { session, profile };
}

export async function GET(request: NextRequest) {
  const result = await getProfile(request);
  if (!result) return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  if (!result.profile)
    return NextResponse.json(
      { error: "Complete your client profile before adding locations." },
      { status: 409 },
    );
  const locations = await db.clientSavedLocation.findMany({
    where: { clientProfileId: result.profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  const result = await getProfile(request);
  if (!result) return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  if (!result.profile)
    return NextResponse.json(
      { error: "Complete your client profile before adding locations." },
      { status: 409 },
    );
  const parsed = locationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a label and address." }, { status: 400 });
  const location = await db.clientSavedLocation.create({
    data: { clientProfileId: result.profile.id, ...parsed.data },
  });
  return NextResponse.json({ location }, { status: 201 });
}
