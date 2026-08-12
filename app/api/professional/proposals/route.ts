import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

const proposalSchema = z.object({
  jobId: z.number().int().positive(),
  bidAmount: z.number().int().positive().max(10_000_000),
  duration: z.string().trim().min(2).max(100),
  coverLetter: z.string().trim().min(10).max(5000),
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token)
      return NextResponse.json({ error: "Professional sign-in is required." }, { status: 401 });
    const session = await verifySession(token);
    if (session.role !== "PROFESSIONAL")
      return NextResponse.json({ error: "Professional access required." }, { status: 403 });
    const jobId = z.coerce
      .number()
      .int()
      .positive()
      .safeParse(request.nextUrl.searchParams.get("jobId"));
    if (!jobId.success)
      return NextResponse.json({ error: "A valid job is required." }, { status: 400 });
    const proposal = await db.projectRequest.findFirst({
      where: { jobId: jobId.data, professionalId: session.userId, origin: "PROFESSIONAL_PROPOSAL" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ proposal });
  } catch {
    return NextResponse.json({ error: "Unable to load your proposal." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token)
      return NextResponse.json({ error: "Professional sign-in is required." }, { status: 401 });
    const session = await verifySession(token);
    if (session.role !== "PROFESSIONAL")
      return NextResponse.json({ error: "Professional access required." }, { status: 403 });
    const parsed = proposalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Please provide a price, delivery estimate, and message." },
        { status: 400 },
      );
    const job = await db.clientJob.findUnique({ where: { id: parsed.data.jobId } });
    if (!job || job.status !== "OPEN")
      return NextResponse.json(
        { error: "This job is no longer accepting proposals." },
        { status: 409 },
      );
    if (job.userId === session.userId)
      return NextResponse.json(
        { error: "You cannot send a proposal to your own job." },
        { status: 403 },
      );
    const existing = await db.projectRequest.findFirst({
      where: {
        jobId: job.id,
        professionalId: session.userId,
        origin: "PROFESSIONAL_PROPOSAL",
        status: "PENDING",
      },
      select: { id: true },
    });
    if (existing)
      return NextResponse.json(
        { error: "You already have a pending proposal for this job." },
        { status: 409 },
      );
    const proposal = await db.projectRequest.create({
      data: {
        jobId: job.id,
        clientId: job.userId,
        professionalId: session.userId,
        bidAmount: parsed.data.bidAmount,
        duration: parsed.data.duration,
        coverLetter: parsed.data.coverLetter,
        status: "PENDING",
        origin: "PROFESSIONAL_PROPOSAL",
      },
    });
    const professional = await db.user.findUnique({
      where: { id: session.userId },
      select: { firstName: true, lastName: true },
    });
    await db.userNotification.create({
      data: {
        userId: job.userId,
        type: "NEW_PROPOSAL",
        title: "New Proposal",
        description: `${professional ? `${professional.firstName} ${professional.lastName}` : "A professional"} sent a proposal for ${job.title ?? "your job"}.`,
        href: `/job/${job.id}`,
      },
    });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("professional.proposal.failed", error);
    return NextResponse.json({ error: "Unable to send your proposal." }, { status: 500 });
  }
}
