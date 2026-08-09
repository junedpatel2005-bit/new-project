import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

async function getSession(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const account = await db.user.findUnique({
    where: { id: session.userId },
    select: { emailVerifiedAt: true },
  });
  if (!account?.emailVerifiedAt)
    return NextResponse.json(
      { error: "Please verify your email before completing your profile." },
      { status: 403 },
    );

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid profile details." }, { status: 400 });
  }

  if (session.role === "CLIENT") {
    const { fullName, phone, companyName, address, companyWebsite, industry } = body as Record<
      string,
      string
    >;
    if (!fullName || !phone || !companyName || !address) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }
    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
    const existingProfile = await db.clientProfile.findFirst({ where: { userId: session.userId } });
    const profileData = {
      fullName,
      phone,
      companyName,
      address,
      companyWebsite: companyWebsite || null,
      industry: industry || null,
    };
    if (existingProfile) {
      await db.clientProfile.update({ where: { id: existingProfile.id }, data: profileData });
    } else {
      await db.clientProfile.create({
        data: {
          userId: session.userId,
          email: user.email,
          ...profileData,
        },
      });
    }
    await db.user.update({ where: { id: session.userId }, data: { phone, companyName, address } });
  } else if (session.role === "PROFESSIONAL") {
    const { category, city, experienceYears, hourlyRate, serviceArea } = body as Record<
      string,
      string
    >;
    if (!category || !city) {
      return NextResponse.json({ error: "Please add your category and city." }, { status: 400 });
    }
    await db.user.update({
      where: { id: session.userId },
      data: {
        professionalCategory: category,
        professionalCity: city,
        experienceYears: experienceYears ? Number(experienceYears) : null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
        serviceArea: serviceArea || null,
      },
    });
  } else {
    return NextResponse.json(
      { error: "This profile type cannot be updated here." },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
}
