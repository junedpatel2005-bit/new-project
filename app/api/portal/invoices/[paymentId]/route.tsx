import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { renderReportPdf, pdfResponse } from "@/lib/reports/pdf/render";
import { ReportDocument } from "@/lib/reports/pdf/ReportDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }
  const paymentId = Number((await params).paymentId);
  if (!Number.isInteger(paymentId) || paymentId < 1)
    return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 });
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "COMPLETED")
    return NextResponse.json({ error: "Completed payment not found." }, { status: 404 });
  if (
    session.role !== "ADMIN" &&
    session.userId !== payment.clientId &&
    session.userId !== payment.professionalId
  )
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const invoice = await db.invoice.upsert({
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
  const [client, professional] = await Promise.all([
    db.user.findUnique({
      where: { id: payment.clientId },
      select: { firstName: true, lastName: true, email: true },
    }),
    db.user.findUnique({
      where: { id: payment.professionalId },
      select: { firstName: true, lastName: true, email: true },
    }),
  ]);
  const money = (amount: number) => `INR ${amount.toLocaleString("en-IN")}`;
  const buffer = await renderReportPdf(
    <ReportDocument
      title="Payment invoice"
      subtitle={invoice.invoiceNumber}
      generatedFor={client?.email ?? "Klick-Pro account"}
      columns={[
        {
          key: "item",
          header: "Description",
          width: 4,
          format: () => "Marketplace milestone payment",
        },
        {
          key: "client",
          header: "Client",
          width: 2,
          format: () => `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim(),
        },
        {
          key: "professional",
          header: "Professional",
          width: 2,
          format: () => `${professional?.firstName ?? ""} ${professional?.lastName ?? ""}`.trim(),
        },
        {
          key: "gross",
          header: "Gross",
          width: 1.5,
          align: "right",
          format: () => money(invoice.amount),
        },
        {
          key: "net",
          header: "Professional net",
          width: 1.5,
          align: "right",
          format: () => money(invoice.netAmount),
        },
      ]}
      rows={[invoice]}
    />,
  );
  return pdfResponse(buffer, `${invoice.invoiceNumber}.pdf`);
}
