import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { logServerError } from "@/lib/server-logger";

const bodySchema = z.object({ action: z.enum(["accept", "reject"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
    const session = await verifySession(token);
    if (session.role !== "CLIENT")
      return NextResponse.json({ error: "Client access required." }, { status: 403 });
    const id = z.coerce
      .number()
      .int()
      .positive()
      .safeParse((await params).id);
    const input = bodySchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !input.success)
      return NextResponse.json(
        { error: "Please provide a valid proposal action." },
        { status: 400 },
      );
    const proposal = await db.projectRequest.findFirst({
      where: {
        id: id.data,
        clientId: session.userId,
        origin: "PROFESSIONAL_PROPOSAL",
        status: "PENDING",
      },
    });
    if (!proposal)
      return NextResponse.json({ error: "This proposal is no longer available." }, { status: 409 });
    const job = await db.clientJob.findFirst({
      where: { id: proposal.jobId, userId: session.userId },
      select: { id: true, title: true, status: true },
    });
    if (!job)
      return NextResponse.json({ error: "This proposal is no longer available." }, { status: 409 });
    if (input.data.action === "reject") {
      await db.projectRequest.update({ where: { id: proposal.id }, data: { status: "REJECTED" } });
      await db.userNotification.create({
        data: {
          userId: proposal.professionalId,
          type: "PROPOSAL_DECLINED",
          title: "Proposal Declined",
          description: `Your proposal for ${job.title ?? "the job"} was not selected.`,
          href: `/job/${proposal.jobId}`,
        },
      });
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }
    if (job.status !== "OPEN")
      return NextResponse.json(
        { error: "This job is no longer available to hire for." },
        { status: 409 },
      );
    const closed = await db.clientJob.updateMany({
      where: { id: proposal.jobId, userId: session.userId, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    if (closed.count !== 1)
      return NextResponse.json(
        { error: "This job is no longer available to hire for." },
        { status: 409 },
      );
    await db.projectRequest.update({ where: { id: proposal.id }, data: { status: "ACCEPTED" } });
    await db.projectRequest.updateMany({
      where: { jobId: proposal.jobId, origin: "PROFESSIONAL_PROPOSAL", status: "PENDING" },
      data: { status: "REJECTED" },
    });
    const tracking = await db.projectTracking.create({
      data: {
        requestId: proposal.id,
        jobId: proposal.jobId,
        clientId: proposal.clientId,
        professionalId: proposal.professionalId,
        status: "READY_TO_START",
      },
    });
    await db.projectTimelineEvent.create({
      data: {
        trackingId: tracking.id,
        actorId: session.userId,
        actorRole: "CLIENT",
        type: "PROPOSAL_ACCEPTED",
        title: "Proposal accepted",
        description: "The client hired the professional.",
      },
    });
    await db.userNotification.create({
      data: {
        userId: proposal.professionalId,
        type: "PROPOSAL_ACCEPTED",
        title: "Proposal Accepted",
        description: `Your proposal for ${job.title ?? "the job"} was accepted.`,
        href: `/project/${tracking.id}/tracking`,
      },
    });
    return NextResponse.json({ ok: true, project: tracking });
  } catch (error) {
    logServerError("client.proposal.action.failed", error, {
      requestId: request.headers.get("x-request-id"),
    });
    return NextResponse.json({ error: "Unable to update this proposal." }, { status: 500 });
  }
}
