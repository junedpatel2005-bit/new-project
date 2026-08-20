import { NextResponse } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenMatch = cookieHeader.match(new RegExp(`${sessionCookie}=([^;]+)`));
  const token = tokenMatch?.[1];
  if (!token) {
    return NextResponse.json({ user: null });
  }

  try {
    const session = await verifySession(token);
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        email: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: String(user.id),
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
