import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionCookie, verifySession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  approximateAddress,
  createDisplayPoint,
  getDistanceBoundingBox,
  getDistanceKm,
} from "@/lib/geo";
import { attachLastActorRole } from "@/lib/project-request-actions";
import { inferLocationFromAddress } from "@/lib/india-locations";

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
        }),
      );
    if (resource === "earnings") {
      if (!["PROFESSIONAL", "CLIENT"].includes(session.role))
        return NextResponse.json({ error: "Account access required." }, { status: 403 });
      const transactions = await db.projectTransaction.findMany({
        where:
          session.role === "PROFESSIONAL"
            ? { professionalId: session.userId }
            : { clientId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const payments = await db.payment.findMany({
        where: {
          milestoneId: {
            in: transactions
              .map((transaction) => transaction.milestoneId)
              .filter((id): id is number => id !== null),
          },
          status: "COMPLETED",
        },
        select: { id: true, milestoneId: true },
      });
      const paymentByMilestone = new Map(
        payments.map((payment) => [payment.milestoneId, payment.id]),
      );
      return NextResponse.json(
        transactions.map((transaction) => ({
          ...transaction,
          invoicePaymentId: transaction.milestoneId
            ? (paymentByMilestone.get(transaction.milestoneId) ?? null)
            : null,
        })),
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
    if (resource === "reviews") {
      if (session.role !== "PROFESSIONAL")
        return NextResponse.json({ error: "Professional access required." }, { status: 403 });
      const reviews = await db.projectReview.findMany({
        where: { professionalId: session.userId },
        orderBy: { createdAt: "desc" },
      });
      const clients = await db.user.findMany({
        where: { id: { in: [...new Set(reviews.map((review) => review.clientId))] } },
        select: { id: true, firstName: true, lastName: true },
      });
      const clientMap = new Map(
        clients.map((client) => [client.id, `${client.firstName} ${client.lastName}`.trim()]),
      );
      return NextResponse.json(
        reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          clientName: clientMap.get(review.clientId) ?? null,
          createdAt: review.createdAt.toISOString(),
        })),
      );
    }
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
          professionalLatitude: true,
          professionalLongitude: true,
          serviceRadiusKm: true,
        },
      });
      const hasServiceArea =
        professional?.professionalLatitude != null &&
        professional?.professionalLongitude != null &&
        professional?.serviceRadiusKm != null;
      const bbox = hasServiceArea
        ? getDistanceBoundingBox(
            professional!.professionalLatitude!,
            professional!.serviceRadiusKm!,
          )
        : null;

      const blockedJobs = await db.$transaction(async (tx) => {
        const [trackingJobs, acceptedRequests] = await Promise.all([
          tx.projectTracking.findMany({
            where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
            select: { jobId: true },
          }),
          tx.projectRequest.findMany({
            where: { status: "ACCEPTED" },
            select: { jobId: true },
          }),
        ]);
        return new Set([
          ...trackingJobs.map((job) => job.jobId),
          ...acceptedRequests.map((request) => request.jobId),
        ]);
      });

      const [openJobs, savedJobs, proposals, offers, activeProjects, completedProjects] =
        await Promise.all([
          db.clientJob.findMany({
            where: {
              status: "OPEN",
              id: { notIn: [...blockedJobs] },
              ...(bbox
                ? {
                    OR: [
                      { locationLat: null },
                      {
                        locationLat: {
                          gte: professional!.professionalLatitude! - bbox.latDelta,
                          lte: professional!.professionalLatitude! + bbox.latDelta,
                        },
                        locationLng: {
                          gte: professional!.professionalLongitude! - bbox.lngDelta,
                          lte: professional!.professionalLongitude! + bbox.lngDelta,
                        },
                      },
                    ],
                  }
                : {}),
            },
            orderBy: { createdAt: "desc" },
            take: bbox ? 100 : 20,
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  averageRating: true,
                  isVerified: true,
                },
              },
            },
          }),
          db.favoriteJob.findMany({
            where: { userId: session.userId, job: { status: "OPEN" } },
            take: 20,
            include: {
              job: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      averageRating: true,
                      isVerified: true,
                    },
                  },
                },
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
          db.projectTracking.findMany({
            where: { professionalId: session.userId, status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 20,
          }),
        ]);

      const hiddenJobIds = blockedJobs;

      function distanceKmFor(locationLat: number | null, locationLng: number | null) {
        if (
          !hasServiceArea ||
          locationLat === null ||
          locationLng === null ||
          professional?.professionalLatitude == null ||
          professional?.professionalLongitude == null
        )
          return null;
        return (
          Math.round(
            getDistanceKm(
              professional.professionalLatitude,
              professional.professionalLongitude,
              locationLat,
              locationLng,
            ) * 10,
          ) / 10
        );
      }

      const visibleOpenJobs = openJobs
        .filter((job) => !hiddenJobIds.has(job.id))
        .map((job) => ({ ...job, distanceKm: distanceKmFor(job.locationLat, job.locationLng) }))
        .filter(
          (job) =>
            job.distanceKm === null ||
            job.distanceKm <= (professional?.serviceRadiusKm ?? Infinity),
        )
        .sort((a, b) =>
          hasServiceArea ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : 0,
        )
        .slice(0, 20);
      const visibleSavedJobs = savedJobs
        .filter((favorite) => !hiddenJobIds.has(favorite.job.id))
        .map((favorite) => ({
          ...favorite,
          distanceKm: distanceKmFor(favorite.job.locationLat, favorite.job.locationLng),
        }));

      const clientIds = [
        ...new Set([
          ...visibleOpenJobs.map((job) => job.userId),
          ...visibleSavedJobs.map((favorite) => favorite.job.userId),
          ...proposals.map((request) => request.clientId),
          ...activeProjects.map((project) => project.clientId),
          ...completedProjects.map((project) => project.clientId),
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
          ...visibleOpenJobs.map((job) => job.id),
          ...visibleSavedJobs.map((favorite) => favorite.jobId),
          ...proposals.map((request) => request.jobId),
          ...activeProjects.map((project) => project.jobId),
          ...completedProjects.map((project) => project.jobId),
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
          locationState: true,
          locationDistrict: true,
          budgetMin: true,
          budgetMax: true,
          hourlyRate: true,
          timingType: true,
          deadline: true,
        },
      });
      const jobMap = new Map(jobs.map((job) => [job.id, job]));
      const activeJobIds = new Set(activeProjects.map((project) => project.jobId));
      const [visibleProposals, visibleOffers] = await Promise.all([
        attachLastActorRole(proposals.filter((request) => !activeJobIds.has(request.jobId))),
        attachLastActorRole(offers.filter((request) => !activeJobIds.has(request.jobId))),
      ]);

      const favoriteCounts = await db.favoriteJob.groupBy({
        by: ["jobId"],
        where: {
          jobId: {
            in: [
              ...new Set([
                ...visibleOpenJobs.map((job) => job.id),
                ...visibleSavedJobs.map((favorite) => favorite.job.id),
              ]),
            ],
          },
        },
        _count: { _all: true },
      });
      const favoriteCountMap = new Map(
        favoriteCounts.map((entry) => [entry.jobId, entry._count._all]),
      );

      return NextResponse.json({
        professional,
        openJobs: visibleOpenJobs
          .filter((job) => !activeJobIds.has(job.id))
          .map((job) => {
            const displayPoint =
              job.locationLat !== null && job.locationLng !== null
                ? createDisplayPoint(job.id, job.locationLat, job.locationLng)
                : null;
            const inferredLocation = inferLocationFromAddress(job.locationAddress);
            return {
              id: job.id,
              title: job.title,
              category: job.category,
              status: job.status,
              budgetMin: job.budgetMin,
              budgetMax: job.budgetMax,
              hourlyRate: job.hourlyRate,
              timingType: job.timingType,
              locationAddress: approximateAddress(job.locationAddress),
              locationState: job.locationState?.trim() || inferredLocation.state,
              locationDistrict: job.locationDistrict?.trim() || inferredLocation.district,
              locationLat: displayPoint?.lat ?? null,
              locationLng: displayPoint?.lng ?? null,
              distanceKm: job.distanceKm,
              description: job.description,
              clientName: clientMap.get(job.userId) ?? "Client",
              clientRating: job.user.averageRating ?? 0,
              clientVerified: job.user.isVerified ?? false,
              createdAt: job.createdAt.toISOString(),
              proposalCount: favoriteCountMap.get(job.id) ?? 0,
            };
          }),
        savedJobs: visibleSavedJobs
          .filter((favorite) => !activeJobIds.has(favorite.job.id))
          .map((favorite) => {
            const displayPoint =
              favorite.job.locationLat !== null && favorite.job.locationLng !== null
                ? createDisplayPoint(
                    favorite.job.id,
                    favorite.job.locationLat,
                    favorite.job.locationLng,
                  )
                : null;
            const inferredLocation = inferLocationFromAddress(favorite.job.locationAddress);
            return {
              id: favorite.job.id,
              title: favorite.job.title,
              category: favorite.job.category,
              status: favorite.job.status,
              budgetMin: favorite.job.budgetMin,
              budgetMax: favorite.job.budgetMax,
              hourlyRate: favorite.job.hourlyRate,
              timingType: favorite.job.timingType,
              locationAddress: approximateAddress(favorite.job.locationAddress),
              locationState: favorite.job.locationState?.trim() || inferredLocation.state,
              locationDistrict: favorite.job.locationDistrict?.trim() || inferredLocation.district,
              locationLat: displayPoint?.lat ?? null,
              locationLng: displayPoint?.lng ?? null,
              distanceKm: favorite.distanceKm,
              description: favorite.job.description,
              clientName: clientMap.get(favorite.job.userId) ?? "Client",
              clientRating: favorite.job.user.averageRating ?? 0,
              clientVerified: favorite.job.user.isVerified ?? false,
              createdAt: favorite.job.createdAt.toISOString(),
              proposalCount: favoriteCountMap.get(favorite.job.id) ?? 0,
            };
          }),
        proposals: visibleProposals.map((request) => {
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
            lastActorRole: request.lastActorRole,
            createdAt: request.createdAt.toISOString(),
          };
        }),
        offers: visibleOffers.map((request) => {
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
            lastActorRole: request.lastActorRole,
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
          deadline: jobMap.get(project.jobId)?.deadline?.toISOString() ?? null,
          budget:
            jobMap.get(project.jobId)?.timingType === "HOURLY"
              ? (jobMap.get(project.jobId)?.hourlyRate ?? null)
              : (jobMap.get(project.jobId)?.budgetMax ??
                jobMap.get(project.jobId)?.budgetMin ??
                null),
          timingType: jobMap.get(project.jobId)?.timingType ?? "FIXED",
          progress: project.progress,
          currentStage: project.currentStage,
        })),
        completedProjects: await Promise.all(
          completedProjects.map(async (project) => {
            const earnings = await db.projectTransaction.aggregate({
              where: {
                trackingId: project.id,
                professionalId: session.userId,
                status: "COMPLETED",
              },
              _sum: { amount: true },
            });
            return {
              id: project.id,
              jobId: project.jobId,
              jobTitle: jobMap.get(project.jobId)?.title ?? `Job #${project.jobId}`,
              clientName: clientMap.get(project.clientId) ?? "Client",
              completedAt: project.completedAt?.toISOString() ?? project.updatedAt.toISOString(),
              amount: earnings._sum.amount ?? 0,
              currency: "INR",
            };
          }),
        ),
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
        if (
          project &&
          project.clientId !== session.userId &&
          project.professionalId !== session.userId
        ) {
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
        include: { payment: { select: { status: true, professionalPayoutAmount: true } } },
      });
      const [
        job,
        professional,
        client,
        uploads,
        revisions,
        timeline,
        projectRequest,
        review,
        dispute,
      ] = await Promise.all([
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
            paymentMethod: true,
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
        db.projectReview.findUnique({ where: { trackingId: project.id } }),
        db.projectDispute.findFirst({
          where: {
            trackingId: project.id,
            OR: [{ reporterId: project.clientId }, { reporterId: project.professionalId }],
          },
          orderBy: { createdAt: "desc" },
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
        review,
        dispute,
      });
    }
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    console.error("portal.request.failed", { resource, userId: session.userId, error });
    return NextResponse.json({ error: "Unable to load portal data." }, { status: 500 });
  }
}

const markReadSchema = z
  .object({ id: z.number().int().positive() })
  .or(z.object({ all: z.literal(true) }));

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const session = await sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { resource } = await params;
  if (resource !== "notifications")
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = markReadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "A notification id is required." }, { status: 400 });
  if ("all" in parsed.data) {
    await db.userNotification.updateMany({
      where: { userId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await db.userNotification.updateMany({
      where: { id: parsed.data.id, userId: session.userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return NextResponse.json({ success: true });
}
