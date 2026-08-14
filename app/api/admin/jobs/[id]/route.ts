import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });

  try {
    const session = await verifySession(token);
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  }

  const job = await db.clientJob.findUnique({
    where: { id: jobId },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
          address: true,
          isVerified: true,
          createdAt: true,
        },
      },
      _count: { select: { favoriteJobs: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const [proposals, project] = await Promise.all([
    db.projectRequest.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        professionalId: true,
        bidAmount: true,
        duration: true,
        status: true,
        origin: true,
        createdAt: true,
      },
    }),
    db.projectTracking.findFirst({
      where: { jobId },
      select: {
        id: true,
        status: true,
        progress: true,
        currentStage: true,
        startedAt: true,
        completedAt: true,
      },
    }),
  ]);

  const professionalIds = [...new Set(proposals.map((proposal) => proposal.professionalId))];
  const professionals = await db.user.findMany({
    where: { id: { in: professionalIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const professionalsById = new Map(
    professionals.map((professional) => [professional.id, professional]),
  );
  const [milestones, payments] = project
    ? await Promise.all([
        db.projectMilestone.findMany({
          where: { trackingId: project.id },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            amount: true,
            dueDate: true,
            status: true,
            approvedAt: true,
          },
        }),
        db.projectTransaction.aggregate({
          where: { trackingId: project.id, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ])
    : [[], { _sum: { amount: null } }];
  const milestoneTotal = milestones.reduce((total, milestone) => total + milestone.amount, 0);
  const paidAmount = payments._sum.amount ?? 0;

  return NextResponse.json({
    job: {
      ...job,
      proposals: proposals.map((proposal) => ({
        ...proposal,
        professional: professionalsById.get(proposal.professionalId) ?? null,
      })),
      project: project
        ? {
            ...project,
            milestones,
            financial: {
              milestoneTotal,
              paidAmount,
              remainingAmount: Math.max(milestoneTotal - paidAmount, 0),
            },
          }
        : null,
    },
  });
}
