import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionCookie, verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

async function sessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { resource } = await params;
  try {
    if (resource === "notifications")
      return NextResponse.json(
        await db.userNotification.findMany({
          where: { userId: session.userId, clearedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      );
    if (resource === "earnings") {
      if (session.role !== "PROFESSIONAL")
        return NextResponse.json({ error: "Professional access required." }, { status: 403 });
      return NextResponse.json(
        await db.projectTransaction.findMany({
          where: { professionalId: session.userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      );
    }
    if (resource === "messages")
      return NextResponse.json(
        await db.messageConversation.findMany({
          where: { OR: [{ clientId: session.userId }, { professionalId: session.userId }] },
          orderBy: { lastMessageAt: "desc" },
          take: 50,
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        }),
      );
    if (resource === "project") {
      const parsed = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(request.nextUrl.searchParams.get("id"));
      if (!parsed.success)
        return NextResponse.json({ error: "A valid project id is required." }, { status: 400 });
      const project = await db.projectTracking.findFirst({
        where: {
          id: parsed.data,
          OR: [{ clientId: session.userId }, { professionalId: session.userId }],
        },
      });
      if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      const milestones = await db.projectMilestone.findMany({
        where: { trackingId: project.id },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ project, milestones });
    }
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    console.error("portal.request.failed", { resource, userId: session.userId, error });
    return NextResponse.json({ error: "Unable to load portal data." }, { status: 500 });
  }
}
