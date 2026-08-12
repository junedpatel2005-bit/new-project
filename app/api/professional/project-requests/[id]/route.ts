import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

function requestIdOf(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const professionalId = await professionalIdFrom(request);
  const requestId = requestIdOf((await params).id);
  if (!professionalId || !requestId)
    return NextResponse.json({ error: "Hire request not found." }, { status: 404 });

  const hireRequest = await db.projectRequest.findFirst({
    where: { id: requestId, professionalId },
  });
  if (!hireRequest) return NextResponse.json({ error: "Hire request not found." }, { status: 404 });
  if (hireRequest.status !== "PENDING")
    return NextResponse.json(
      { error: "This hire request has already been handled." },
      { status: 409 },
    );

  const project = await db.$transaction(async (tx) => {
    const closedJob = await tx.clientJob.updateMany({
      where: { id: hireRequest.jobId, userId: hireRequest.clientId, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    if (closedJob.count !== 1) throw new Error("This job is no longer available to hire for.");

    await tx.projectRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
    const tracking = await tx.projectTracking.create({
      data: {
        requestId,
        jobId: hireRequest.jobId,
        clientId: hireRequest.clientId,
        professionalId,
        status: "READY_TO_START",
      },
    });
    await tx.projectTimelineEvent.create({
      data: {
        trackingId: tracking.id,
        actorId: professionalId,
        actorRole: "PROFESSIONAL",
        type: "OFFER_ACCEPTED",
        title: "Offer accepted",
        description: "The professional accepted the hire request.",
      },
    });
    return tracking;
  });

  return NextResponse.json({ project });
}
