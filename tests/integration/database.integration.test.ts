import { beforeAll, afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { assertDisposableTestDatabase } from "../../scripts/test-db-safety";
import { db } from "../../src/lib/db";
import { verifyPhoneOtp } from "../../src/lib/phone-otp-provider";

type WebhookPost = (request: Request) => Promise<Response>;

function signedWebhook(body: string) {
  const signature = crypto
    .createHmac("sha256", "integration-razorpay-secret")
    .update(body)
    .digest("hex");
  return new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Razorpay-Signature": signature },
    body,
  });
}

function paymentEvent(input: {
  eventId: string;
  event: string;
  orderId: string;
  paymentId: string;
  amount?: number;
  currency?: string;
}) {
  return JSON.stringify({
    id: input.eventId,
    event: input.event,
    payload: {
      payment: {
        entity: {
          id: input.paymentId,
          order_id: input.orderId,
          amount: input.amount ?? 10_000,
          currency: input.currency ?? "INR",
        },
      },
    },
  });
}

describe("disposable PostgreSQL integration", () => {
  beforeAll(() => {
    assertDisposableTestDatabase();
    process.env.PHONE_OTP_PROVIDER = "development";
    process.env.DEV_PHONE_OTP = "2412";
    process.env.RAZORPAY_ENABLED = "true";
    process.env.RAZORPAY_WEBHOOK_SECRET = "integration-razorpay-secret";
  });

  afterAll(async () => {
    await db.otpCode.deleteMany({ where: { phone: " +919999999999".trim() } });
    await db.otpCode.deleteMany({ where: { phone: "+918888888888" } });
    await db.razorpayWebhookEvent.deleteMany({
      where: { eventId: { startsWith: "integration-" } },
    });
    await db.walletTransaction.deleteMany({
      where: { providerReference: { startsWith: "integration-" } },
    });
    await db.payment.deleteMany({ where: { razorpayOrderId: { startsWith: "integration-" } } });
    await db.wallet.deleteMany({ where: { user: { email: { startsWith: "integration-" } } } });
    await db.user.deleteMany({ where: { email: { startsWith: "integration-" } } });
    await db.$disconnect();
  });

  it("allows exactly one concurrent correct OTP consumer", async () => {
    const phone = "+919999999999";
    await db.otpCode.deleteMany({ where: { phone } });
    await db.otpCode.create({
      data: {
        phone,
        role: "CLIENT",
        codeHash: "93e2a45037eb149bd13e633f2cdd848b0caaa04a4f048df7c49de10fb41a3d16",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const [first, second] = await Promise.all([
      verifyPhoneOtp(phone, "2412", "CLIENT"),
      verifyPhoneOtp(phone, "2412", "CLIENT"),
    ]);

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    const stored = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
    expect(stored?.consumedAt).not.toBeNull();
    expect(stored?.attempts).toBe(1);
  });

  it("rejects an expired OTP", async () => {
    const phone = "+918888888888";
    await db.otpCode.deleteMany({ where: { phone } });
    await db.otpCode.create({
      data: {
        phone,
        role: "CLIENT",
        codeHash: "93e2a45037eb149bd13e633f2cdd848b0caaa04a4f048df7c49de10fb41a3d16",
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    const result = await verifyPhoneOtp(phone, "2412", "CLIENT");
    expect(result.ok).toBe(false);
    await db.otpCode.deleteMany({ where: { phone } });
  });

  it("processes a captured payment once and ignores its duplicate", async () => {
    const { POST } = (await import("../../app/api/webhooks/razorpay/route")) as {
      POST: WebhookPost;
    };
    const orderId = "integration-captured-order";
    await db.user.createMany({
      data: [
        {
          email: "integration-client-captured@example.test",
          firstName: "Client",
          lastName: "Captured",
        },
        {
          email: "integration-pro-captured@example.test",
          firstName: "Pro",
          lastName: "Captured",
          role: "PROFESSIONAL",
        },
      ],
    });
    const client = await db.user.findUniqueOrThrow({
      where: { email: "integration-client-captured@example.test" },
    });
    const professional = await db.user.findUniqueOrThrow({
      where: { email: "integration-pro-captured@example.test" },
    });
    await db.payment.create({
      data: {
        clientId: client.id,
        professionalId: professional.id,
        amount: 100,
        provider: "razorpay",
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: orderId,
        idempotencyKey: "integration-captured-payment",
      },
    });
    const body = paymentEvent({
      eventId: "integration-captured-event",
      event: "payment.captured",
      orderId,
      paymentId: "integration-captured-payment-id",
    });
    const first = await POST(signedWebhook(body));
    const second = await POST(signedWebhook(body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(
      db.payment.findUniqueOrThrow({ where: { razorpayOrderId: orderId } }),
    ).resolves.toMatchObject({ status: "COMPLETED" });
    await expect(
      db.razorpayWebhookEvent.findMany({ where: { eventId: "integration-captured-event" } }),
    ).resolves.toHaveLength(1);
    await expect(
      db.razorpayWebhookEvent.findUniqueOrThrow({
        where: { eventId: "integration-captured-event" },
      }),
    ).resolves.toMatchObject({ processingStatus: "PROCESSED", processingAttempts: 1 });
  });

  it("leaves the payment unchanged on mismatch and retries the same event safely", async () => {
    const { POST } = (await import("../../app/api/webhooks/razorpay/route")) as {
      POST: WebhookPost;
    };
    const orderId = "integration-retry-order";
    await db.user.createMany({
      data: [
        { email: "integration-client-retry@example.test", firstName: "Client", lastName: "Retry" },
        {
          email: "integration-pro-retry@example.test",
          firstName: "Pro",
          lastName: "Retry",
          role: "PROFESSIONAL",
        },
      ],
    });
    const client = await db.user.findUniqueOrThrow({
      where: { email: "integration-client-retry@example.test" },
    });
    const professional = await db.user.findUniqueOrThrow({
      where: { email: "integration-pro-retry@example.test" },
    });
    await db.payment.create({
      data: {
        clientId: client.id,
        professionalId: professional.id,
        amount: 100,
        provider: "razorpay",
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: orderId,
        idempotencyKey: "integration-retry-payment",
      },
    });
    const invalid = paymentEvent({
      eventId: "integration-retry-event",
      event: "payment.captured",
      orderId,
      paymentId: "integration-retry-payment-id",
      amount: 9_999,
    });
    expect((await POST(signedWebhook(invalid))).status).toBe(500);
    await expect(
      db.payment.findUniqueOrThrow({ where: { razorpayOrderId: orderId } }),
    ).resolves.toMatchObject({ status: "PENDING" });
    await expect(
      db.razorpayWebhookEvent.findUniqueOrThrow({ where: { eventId: "integration-retry-event" } }),
    ).resolves.toMatchObject({ processingStatus: "FAILED" });

    const valid = paymentEvent({
      eventId: "integration-retry-event",
      event: "payment.captured",
      orderId,
      paymentId: "integration-retry-payment-id",
    });
    expect((await POST(signedWebhook(valid))).status).toBe(200);
    await expect(
      db.payment.findUniqueOrThrow({ where: { razorpayOrderId: orderId } }),
    ).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("does not regress a completed payment on an out-of-order failure", async () => {
    const { POST } = (await import("../../app/api/webhooks/razorpay/route")) as {
      POST: WebhookPost;
    };
    const orderId = "integration-ordering-order";
    await db.user.createMany({
      data: [
        {
          email: "integration-client-ordering@example.test",
          firstName: "Client",
          lastName: "Ordering",
        },
        {
          email: "integration-pro-ordering@example.test",
          firstName: "Pro",
          lastName: "Ordering",
          role: "PROFESSIONAL",
        },
      ],
    });
    const client = await db.user.findUniqueOrThrow({
      where: { email: "integration-client-ordering@example.test" },
    });
    const professional = await db.user.findUniqueOrThrow({
      where: { email: "integration-pro-ordering@example.test" },
    });
    await db.payment.create({
      data: {
        clientId: client.id,
        professionalId: professional.id,
        amount: 100,
        provider: "razorpay",
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: orderId,
        idempotencyKey: "integration-ordering-payment",
      },
    });
    expect(
      (
        await POST(
          signedWebhook(
            paymentEvent({
              eventId: "integration-ordering-captured",
              event: "payment.captured",
              orderId,
              paymentId: "integration-ordering-payment-id",
            }),
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await POST(
          signedWebhook(
            paymentEvent({
              eventId: "integration-ordering-failed",
              event: "payment.failed",
              orderId,
              paymentId: "integration-ordering-payment-id",
            }),
          ),
        )
      ).status,
    ).toBe(200);
    await expect(
      db.payment.findUniqueOrThrow({ where: { razorpayOrderId: orderId } }),
    ).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("allows only one concurrent processing attempt for an identical event", async () => {
    const { POST } = (await import("../../app/api/webhooks/razorpay/route")) as {
      POST: WebhookPost;
    };
    const body = JSON.stringify({ id: "integration-concurrent-event", event: "payment.captured" });
    const responses = await Promise.all([POST(signedWebhook(body)), POST(signedWebhook(body))]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 200]);
    await expect(
      db.razorpayWebhookEvent.findUniqueOrThrow({
        where: { eventId: "integration-concurrent-event" },
      }),
    ).resolves.toMatchObject({ processingStatus: "PROCESSED", processingAttempts: 1 });
  });
});
