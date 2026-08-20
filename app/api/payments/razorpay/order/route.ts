import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { createRazorpayOrder, isRazorpayConfigured, razorpayConfig } from "@/lib/razorpay";

const schema = z.object({
  projectId: z.number().int().positive(),
  milestoneId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  if (!isRazorpayConfigured())
    return NextResponse.json({
      enabled: false,
      message: "Online payments are not currently configured.",
    });
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Client sign-in is required." }, { status: 401 });
  }
  if (session.role !== "CLIENT")
    return NextResponse.json({ error: "Client access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  const project = await db.projectTracking.findFirst({
    where: { id: parsed.data.projectId, clientId: session.userId },
  });
  const milestone = project
    ? await db.projectMilestone.findFirst({
        where: {
          id: parsed.data.milestoneId,
          trackingId: project.id,
          status: "AWAITING_CLIENT_REVIEW",
        },
      })
    : null;
  if (!project || !milestone)
    return NextResponse.json(
      { error: "This milestone is not ready for payment." },
      { status: 409 },
    );
  const existing = await db.payment.findUnique({ where: { milestoneId: milestone.id } });
  if (existing?.razorpayOrderId && existing.status !== "COMPLETED")
    return NextResponse.json({
      enabled: true,
      keyId: razorpayConfig().keyId,
      orderId: existing.razorpayOrderId,
      amount: existing.amount * 100,
      currency: "INR",
    });
  const order = await createRazorpayOrder({
    amountRupees: milestone.amount,
    receipt: `servio_${project.id}_${milestone.id}`,
    notes: {
      projectId: String(project.id),
      milestoneId: String(milestone.id),
      clientId: String(session.userId),
    },
  });
  if (!order)
    return NextResponse.json({
      enabled: false,
      message: "Online payments are not currently configured.",
    });
  const payment = existing
    ? await db.payment.update({
        where: { id: existing.id },
        data: {
          provider: "razorpay",
          providerReference: order.orderId,
          razorpayOrderId: order.orderId,
          amount: milestone.amount,
          status: "PENDING",
        },
      })
    : await db.payment.create({
        data: {
          clientId: project.clientId,
          professionalId: project.professionalId,
          jobId: project.jobId,
          amount: milestone.amount,
          commissionAmount: Math.floor(milestone.amount * 0.1),
          currency: "INR",
          provider: "razorpay",
          providerReference: order.orderId,
          razorpayOrderId: order.orderId,
          projectTrackingId: project.id,
          milestoneId: milestone.id,
          status: "PENDING",
          idempotencyKey: `razorpay-${order.orderId}`,
        },
      });
  return NextResponse.json({
    enabled: true,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: payment.razorpayOrderId,
    amount: payment.amount * 100,
    currency: "INR",
    paymentId: payment.id,
  });
}
