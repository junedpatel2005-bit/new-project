import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRazorpayWebhookConfigured, verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-Razorpay-Signature");
  if (!isRazorpayWebhookConfigured() || !verifyRazorpayWebhookSignature(rawBody, signature))
    return NextResponse.json({ error: "Invalid Razorpay webhook." }, { status: 401 });
  const payload = JSON.parse(rawBody) as {
    id?: string;
    event?: string;
    payload?: {
      payment?: {
        entity?: { id?: string; order_id?: string; status?: string; error_description?: string };
      };
    };
  };
  if (!payload.id || !payload.event)
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  try {
    await db.razorpayWebhookEvent.create({
      data: { eventId: payload.id, eventName: payload.event, payloadJson: rawBody },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ received: true });
    throw error;
  }
  const entity = payload.payload?.payment?.entity;
  if (entity?.order_id) {
    await db.payment.updateMany({
      where: { razorpayOrderId: entity.order_id },
      data: {
        ...(payload.event === "payment.captured"
          ? { status: "COMPLETED", capturedAt: new Date(), razorpayPaymentId: entity.id }
          : {}),
        ...(payload.event === "payment.failed"
          ? { status: "FAILED", failureReason: entity.error_description ?? "Payment failed." }
          : {}),
      },
    });
  }
  return NextResponse.json({ received: true });
}
