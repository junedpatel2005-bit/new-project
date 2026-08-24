import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN")
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const [newUsers, verification, jobs, notifications, messages] = await Promise.all([
      db.userNotification.count({
        where: { userId: session.userId, type: "NEW_ACCOUNT", readAt: null },
      }),
      db.professionalVerification.count({ where: { status: "PENDING" } }),
      db.projectDispute.count({ where: { status: "OPEN" } }),
      db.userNotification.count({ where: { userId: session.userId, readAt: null } }),
      db.socketMessage.count({ where: { receiverId: session.userId, readAt: null } }),
    ]);
    return NextResponse.json({ newUsers, verification, jobs, notifications, messages });
  } catch {
    return NextResponse.json({ error: "Unable to load sidebar counts." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN")
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const body = (await request.json().catch(() => null)) as { section?: string } | null;
    if (body?.section === "users") {
      await db.userNotification.updateMany({
        where: { userId: session.userId, type: "NEW_ACCOUNT", readAt: null },
        data: { readAt: new Date() },
      });
    }
    if (body?.section === "notifications") {
      await db.userNotification.updateMany({
        where: { userId: session.userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to update sidebar counts." }, { status: 500 });
  }
}
