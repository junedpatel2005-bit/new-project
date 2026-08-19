import "server-only";
import { db } from "@/lib/db";

type Actor = { userId: number; role: "CLIENT" | "PROFESSIONAL" };
type CounterInput = { bidAmount: number; duration: string; message: string };

type ActionResult =
  | { error: string; status: number }
  | { ok: true; status: "REJECTED" }
  | { ok: true; request: Awaited<ReturnType<typeof db.projectRequest.update>> }
  | { ok: true; project: Awaited<ReturnType<typeof db.projectTracking.create>> };

export async function respondToProjectRequest(
  requestId: number,
  actor: Actor,
  action: "accept" | "reject" | "counter",
  counterInput?: CounterInput,
): Promise<ActionResult> {
  const where =
    actor.role === "CLIENT"
      ? { id: requestId, clientId: actor.userId, status: "PENDING" as const }
      : { id: requestId, professionalId: actor.userId, status: "PENDING" as const };
  const hireRequest = await db.projectRequest.findFirst({ where });
  if (!hireRequest) return { error: "This request is no longer available.", status: 409 as const };

  const otherPartyId = actor.role === "CLIENT" ? hireRequest.professionalId : hireRequest.clientId;
  const job = await db.clientJob.findUnique({
    where: { id: hireRequest.jobId },
    select: { id: true, title: true, status: true, userId: true },
  });

  if (action === "reject") {
    await db.projectRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
    await db.userNotification.create({
      data: {
        userId: otherPartyId,
        type: "REQUEST_DECLINED",
        title: "Request Declined",
        description: `Your request for ${job?.title ?? "the job"} was declined.`,
        href: `/job/${hireRequest.jobId}`,
      },
    });
    return { ok: true, status: "REJECTED" as const };
  }

  if (action === "counter") {
    if (!counterInput)
      return { error: "Counter offer details are required.", status: 400 as const };
    await db.projectNegotiation.create({
      data: {
        requestId,
        jobId: hireRequest.jobId,
        clientId: hireRequest.clientId,
        professionalId: hireRequest.professionalId,
        senderId: actor.userId,
        senderRole: actor.role,
        bidAmount: counterInput.bidAmount,
        duration: counterInput.duration,
        message: counterInput.message,
        previousBidAmount: hireRequest.bidAmount,
        previousDuration: hireRequest.duration,
        previousMessage: hireRequest.coverLetter,
      },
    });
    const updated = await db.projectRequest.update({
      where: { id: requestId },
      data: {
        bidAmount: counterInput.bidAmount,
        duration: counterInput.duration,
        coverLetter: counterInput.message,
      },
    });
    await db.userNotification.create({
      data: {
        userId: otherPartyId,
        type: "REQUEST_COUNTERED",
        title: "New Counter-Offer",
        description: `New terms proposed for ${job?.title ?? "the job"}: ₹${counterInput.bidAmount.toLocaleString()}.`,
        href: `/job/${hireRequest.jobId}`,
      },
    });
    return { ok: true, request: updated };
  }

  // accept
  if (!job || job.status !== "OPEN" || job.userId !== hireRequest.clientId)
    return { error: "This job is no longer available to hire for.", status: 409 as const };
  const closed = await db.clientJob.updateMany({
    where: { id: hireRequest.jobId, userId: hireRequest.clientId, status: "OPEN" },
    data: { status: "CLOSED" },
  });
  if (closed.count !== 1)
    return { error: "This job is no longer available to hire for.", status: 409 as const };

  await db.projectRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });
  await db.projectRequest.updateMany({
    where: { jobId: hireRequest.jobId, status: "PENDING", id: { not: requestId } },
    data: { status: "REJECTED" },
  });

  const tracking = await db.projectTracking.create({
    data: {
      requestId,
      jobId: hireRequest.jobId,
      clientId: hireRequest.clientId,
      professionalId: hireRequest.professionalId,
      status: "READY_TO_START",
    },
  });
  await db.projectTimelineEvent.create({
    data: {
      trackingId: tracking.id,
      actorId: actor.userId,
      actorRole: actor.role,
      type: "OFFER_ACCEPTED",
      title: "Offer accepted",
      description: `${actor.role === "CLIENT" ? "The client" : "The professional"} accepted the terms.`,
    },
  });
  await db.userNotification.create({
    data: {
      userId: otherPartyId,
      type: "REQUEST_ACCEPTED",
      title: "Request Accepted",
      description: `Your request for ${job.title ?? "the job"} was accepted.`,
      href: `/project/${tracking.id}/tracking`,
    },
  });

  return { ok: true, project: tracking };
}

/**
 * Determines whose "turn" it is on each pending request: the role of whoever sent the most
 * recent counter-offer, or — if nobody has countered yet — the role of whoever did NOT
 * originate the request (since the recipient of a fresh proposal/hire-request acts first).
 */
export async function attachLastActorRole<T extends { id: number; origin: string }>(
  items: T[],
): Promise<(T & { lastActorRole: "CLIENT" | "PROFESSIONAL" })[]> {
  if (!items.length) return [];
  const negotiations = await db.projectNegotiation.findMany({
    where: { requestId: { in: items.map((item) => item.id) } },
    orderBy: { createdAt: "desc" },
    select: { requestId: true, senderRole: true },
  });
  const latestByRequest = new Map<number, string>();
  for (const negotiation of negotiations) {
    if (!latestByRequest.has(negotiation.requestId)) {
      latestByRequest.set(negotiation.requestId, negotiation.senderRole);
    }
  }
  return items.map((item) => ({
    ...item,
    lastActorRole: (latestByRequest.get(item.id) ??
      (item.origin === "CLIENT_HIRE" ? "CLIENT" : "PROFESSIONAL")) as "CLIENT" | "PROFESSIONAL",
  }));
}
