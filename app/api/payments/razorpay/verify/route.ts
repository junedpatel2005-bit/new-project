import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/razorpay";

const schema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured())
    return NextResponse.json({ error: "Online payments are not configured." }, { status: 503 });
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || session.role !== "CLIENT")
    return NextResponse.json({ error: "Invalid payment verification." }, { status: 400 });
  const input = parsed.data;
  if (
    !verifyRazorpayPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
    )
  )
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: input.razorpayOrderId },
  });
  if (
    !payment ||
    payment.clientId !== session.userId ||
    !payment.projectTrackingId ||
    !payment.milestoneId
  )
    return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
  if (payment.status === "COMPLETED")
    return NextResponse.json({ ok: true, alreadyProcessed: true });
  const milestone = await db.projectMilestone.findUnique({ where: { id: payment.milestoneId } });
  const project = await db.projectTracking.findUnique({ where: { id: payment.projectTrackingId } });
  if (!milestone || !project || milestone.status !== "AWAITING_CLIENT_REVIEW")
    return NextResponse.json({ error: "This milestone is no longer payable." }, { status: 409 });
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        capturedAt: new Date(),
      },
    });
    await tx.invoice.upsert({
      where: { paymentId: payment.id },
      create: {
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(payment.id).padStart(6, "0")}`,
        paymentId: payment.id,
        clientId: payment.clientId,
        professionalId: payment.professionalId,
        amount: payment.amount,
        commissionAmount: payment.commissionAmount,
        netAmount: Math.max(0, payment.amount - payment.commissionAmount),
        currency: payment.currency,
      },
      update: {},
    });
    await tx.projectMilestone.update({
      where: { id: milestone.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await tx.projectTransaction.create({
      data: {
        trackingId: project.id,
        milestoneId: milestone.id,
        clientId: project.clientId,
        professionalId: project.professionalId,
        amount: payment.amount,
        currency: "INR",
        type: "RAZORPAY_MILESTONE_PAYMENT",
        status: "COMPLETED",
        description: `Razorpay milestone payment: ${milestone.title}`,
      },
    });
    const approvedCount = await tx.projectMilestone.count({
      where: { trackingId: project.id, status: "APPROVED" },
    });
    const totalCount = await tx.projectMilestone.count({ where: { trackingId: project.id } });
    const next = await tx.projectMilestone.findFirst({
      where: { trackingId: project.id, status: "UPCOMING" },
      orderBy: { createdAt: "asc" },
    });
    if (approvedCount === totalCount && totalCount === 5) {
      await tx.projectTracking.update({
        where: { id: project.id },
        data: { status: "COMPLETED", progress: 100, completedAt: new Date(), currentStage: null },
      });
      await tx.clientJob.updateMany({
        where: { id: project.jobId, userId: project.clientId },
        data: { status: "CLOSED" },
      });
    } else {
      if (next)
        await tx.projectMilestone.update({
          where: { id: next.id },
          data: { status: "IN_PROGRESS" },
        });
      await tx.projectTracking.update({
        where: { id: project.id },
        data: { status: "IN_PROGRESS", currentStage: next?.title ?? null },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
