import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

const profileSchema = z.object({
  category: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  experienceYears: z.coerce.number().int().min(0).max(80).nullable(),
  hourlyRate: z.coerce.number().int().min(0).max(1_000_000).nullable(),
  serviceArea: z.string().trim().max(200).optional().or(z.literal("")),
  workMode: z.enum(["on_site", "remote", "both"]),
  bio: z.string().trim().max(2_000).optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(60)).max(20),
});

async function professionalIdFrom(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return null;
  try {
    const session = await verifySession(token);
    return session.role === "PROFESSIONAL" ? session.userId : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await professionalIdFrom(request);
  if (!userId)
    return NextResponse.json({ error: "Professional sign-in is required." }, { status: 401 });
  const profile = await db.user.findUnique({
    where: { id: userId },
    select: {
      professionalCategory: true,
      professionalCity: true,
      experienceYears: true,
      hourlyRate: true,
      serviceArea: true,
      workMode: true,
      companyDescription: true,
      professionalSkillsJson: true,
    },
  });
  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  const userId = await professionalIdFrom(request);
  if (!userId)
    return NextResponse.json({ error: "Professional sign-in is required." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Complete the required professional details." },
      { status: 400 },
    );
  const profile = await db.user.update({
    where: { id: userId },
    data: {
      professionalCategory: parsed.data.category,
      professionalCity: parsed.data.city,
      experienceYears: parsed.data.experienceYears,
      hourlyRate: parsed.data.hourlyRate,
      serviceArea: parsed.data.serviceArea || null,
      workMode: parsed.data.workMode,
      companyDescription: parsed.data.bio || null,
      professionalSkillsJson: JSON.stringify(parsed.data.skills),
    },
  });
  return NextResponse.json({ profile });
}
