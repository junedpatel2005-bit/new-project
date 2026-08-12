import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionCookie, verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

async function sessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(sessionCookie)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { resource } = await params;
  try {
    if (resource === "notifications")
      return NextResponse.json(
        await db.userNotification.findMany({
          where: { userId: session.userId, clearedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      );
    if (resource === "earnings") {
      if (session.role !== "PROFESSIONAL")
        return NextResponse.json({ error: "Professional access required." }, { status: 403 });
      return NextResponse.json(
        await db.projectTransaction.findMany({
          where: { professionalId: session.userId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      );
    }
    if (resource === "messages")
      return NextResponse.json(
        await db.messageConversation.findMany({
          where: { OR: [{ clientId: session.userId }, { professionalId: session.userId }] },
          orderBy: { lastMessageAt: "desc" },
          take: 50,
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        }),
      );
    if (resource === "professional-jobs") {
      if (session.role !== "PROFESSIONAL")
        return NextResponse.json({ error: "Professional access required." }, { status: 403 });

      const professional = await db.user.findUnique({
        where: { id: session.userId },
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
          professionalCategory: true,
          professionalCity: true,
          averageRating: true,
          reviewCount: true,
          isVerified: true,
          availabilityStatus: true,
          experienceYears: true,
        },
      });

      const [openJobs, savedJobs, proposals, offers, activeProjects, completedProjects] =
        await Promise.all([
          db.clientJob.findMany({
            where: { status: "OPEN" },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { user: { select: { firstName: true, lastName: true } } },
          }),
          db.favoriteJob.findMany({
            where: { userId: session.userId, job: { status: "OPEN" } },
            take: 20,
            include: {
              job: {
                include: { user: { select: { firstName: true, lastName: true } } },
              },
            },
          }),
          db.projectRequest.findMany({
            where: { professionalId: session.userId, origin: "PROFESSIONAL_PROPOSAL" },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          db.projectRequest.findMany({
            where: { professionalId: session.userId, origin: "CLIENT_HIRE" },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          db.projectTracking.findMany({
            where: { professionalId: session.userId, status: { not: "COMPLETED" } },
            orderBy: { acceptedAt: "desc" },
            take: 20,
          }),
          db.projectTransaction.findMany({
            where: { professionalId: session.userId, status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
        ]);

      const clientIds = [
        ...new Set([
          ...openJobs.map((job) => job.userId),
          ...savedJobs.map((favorite) => favorite.job.userId),
          ...proposals.map((request) => request.clientId),
          ...activeProjects.map((project) => project.clientId),
          ...offers.map((request) => request.clientId),
        ]),
      ];
      const clients = await db.user.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const clientMap = new Map(
        clients.map((client) => [client.id, `${client.firstName} ${client.lastName}`.trim()]),
      );

      const jobIds = [
        ...new Set([
          ...openJobs.map((job) => job.id),
          ...savedJobs.map((favorite) => favorite.jobId),
          ...proposals.map((request) => request.jobId),
          ...activeProjects.map((project) => project.jobId),
          ...offers.map((request) => request.jobId),
        ]),
      ];
      const jobs = await db.clientJob.findMany({
        where: { id: { in: jobIds } },
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          locationAddress: true,
          budgetMin: true,
          budgetMax: true,
          hourlyRate: true,
          timingType: true,
        },
      });
      const jobMap = new Map(jobs.map((job) => [job.id, job]));
      const activeJobIds = new Set(activeProjects.map((project) => project.jobId));

      return NextResponse.json({
        professional,
        openJobs: openJobs
          .filter((job) => !activeJobIds.has(job.id))
          .map((job) => ({
            id: job.id,
            title: job.title,
            category: job.category,
            status: job.status,
            budgetMin: job.budgetMin,
            budgetMax: job.budgetMax,
            hourlyRate: job.hourlyRate,
            timingType: job.timingType,
            locationAddress: job.locationAddress,
            description: job.description,
            clientName: clientMap.get(job.userId) ?? "Client",
            createdAt: job.createdAt.toISOString(),
            proposalCount: 0,
          })),
        savedJobs: savedJobs
          .filter((favorite) => !activeJobIds.has(favorite.job.id))
          .map((favorite) => ({
            id: favorite.job.id,
            title: favorite.job.title,
            category: favorite.job.category,
            status: favorite.job.status,
            budgetMin: favorite.job.budgetMin,
            budgetMax: favorite.job.budgetMax,
            hourlyRate: favorite.job.hourlyRate,
            timingType: favorite.job.timingType,
            locationAddress: favorite.job.locationAddress,
            description: favorite.job.description,
            clientName: clientMap.get(favorite.job.userId) ?? "Client",
            createdAt: favorite.job.createdAt.toISOString(),
            proposalCount: 0,
          })),
        proposals: proposals.map((request) => {
          const job = jobMap.get(request.jobId);
          return {
            id: request.id,
            jobId: request.jobId,
            jobTitle: job?.title ?? `Job #${request.jobId}`,
            clientName: clientMap.get(request.clientId) ?? "Client",
            bidAmount: request.bidAmount,
            duration: request.duration,
            coverLetter: request.coverLetter,
            status: request.status,
            createdAt: request.createdAt.toISOString(),
          };
        }),
        offers: offers.map((request) => {
          const job = jobMap.get(request.jobId);
          return {
            id: request.id,
            jobId: request.jobId,
            jobTitle: job?.title ?? `Job #${request.jobId}`,
            clientName: clientMap.get(request.clientId) ?? "Client",
            bidAmount: request.bidAmount,
            duration: request.duration,
            coverLetter: request.coverLetter,
            status: request.status,
            createdAt: request.createdAt.toISOString(),
          };
        }),
        activeProjects: activeProjects.map((project) => ({
          id: project.id,
          jobId: project.jobId,
          jobTitle: jobMap.get(project.jobId)?.title ?? `Job #${project.jobId}`,
          clientName: clientMap.get(project.clientId) ?? "Client",
          status: project.status,
          acceptedAt: project.acceptedAt.toISOString(),
        })),
        completedProjects: completedProjects.map((project) => ({
          id: project.id,
          amount: project.amount,
          currency: project.currency,
          description: project.description,
          createdAt: project.createdAt.toISOString(),
        })),
      });
    }
    if (resource === "project") {
      const id = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(request.nextUrl.searchParams.get("id"));
      const jobId = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(request.nextUrl.searchParams.get("jobId"));
      if (!id.success && !jobId.success)
        return NextResponse.json(
          { error: "A valid project or job id is required." },
          { status: 400 },
        );
      let project = null;
      if (id.success) {
        project = await db.projectTracking.findUnique({ where: { id: id.data } });
        if (project && project.clientId !== session.userId && project.professionalId !== session.userId) {
          project = null;
        }
      } else {
        project = await db.projectTracking.findFirst({
          where: {
            jobId: jobId.data,
            OR: [{ clientId: session.userId }, { professionalId: session.userId }],
          },
        });
      }
      if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      const milestones = await db.projectMilestone.findMany({
        where: { trackingId: project.id },
        orderBy: { createdAt: "asc" },
      });
      const [job, professional, client, uploads, revisions, timeline, projectRequest] =
        await Promise.all([
          db.clientJob.findUnique({
            where: { id: project.jobId },
            select: {
              title: true,
              category: true,
              urgency: true,
              workMode: true,
              jobDate: true,
              deadline: true,
              locationAddress: true,
              locationLat: true,
              locationLng: true,
              description: true,
              budgetMin: true,
              budgetMax: true,
              hourlyRate: true,
              timingType: true,
            },
          }),
          db.user.findUnique({
            where: { id: project.professionalId },
            select: { firstName: true, lastName: true },
          }),
          db.user.findUnique({
            where: { id: project.clientId },
            select: { firstName: true, lastName: true },
          }),
          db.projectWorkUpload.findMany({
            where: { trackingId: project.id },
            orderBy: { createdAt: "desc" },
          }),
          db.projectRevisionRequest.findMany({
            where: { trackingId: project.id },
            orderBy: { createdAt: "desc" },
          }),
          db.projectTimelineEvent.findMany({
            where: { trackingId: project.id },
            orderBy: { createdAt: "desc" },
          }),
          db.projectRequest.findUnique({
            where: { id: project.requestId },
            select: { bidAmount: true },
          }),
        ]);
      return NextResponse.json({
        project,
        milestones,
        job,
        professional,
        client,
        viewerRole: session.role,
        uploads,
        revisions,
        timeline,
        agreedAmount: projectRequest?.bidAmount ?? null,
      });
    }
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    console.error("portal.request.failed", { resource, userId: session.userId, error });
    return NextResponse.json({ error: "Unable to load portal data." }, { status: 500 });
  }
}
