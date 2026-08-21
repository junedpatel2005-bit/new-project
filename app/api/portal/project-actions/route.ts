import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { notifyDisputeRaised } from "@/lib/marketplace-notifications";
import { enqueueBackgroundJob } from "@/lib/background-jobs";

const attachmentIds = z.array(z.number().int().positive()).min(1).max(10);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create-milestone"),
    projectId: z.number().int().positive(),
    title: z.string().trim().min(2).max(160),
    amount: z.number().int().min(0),
    description: z.string().trim().max(2000).nullish(),
    deadline: z.string().datetime().nullish(),
  }),
  z.object({ action: z.literal("start-work"), projectId: z.number().int().positive() }),
  z.object({
    action: z.literal("update-progress"),
    projectId: z.number().int().positive(),
    progress: z.number().int().min(0).max(100),
    stage: z.string().trim().min(2).max(160),
    note: z.string().trim().min(2).max(2000),
  }),
  z.object({
    action: z.literal("upload-work"),
    projectId: z.number().int().positive(),
    milestoneId: z.number().int().positive().nullish(),
    title: z.string().trim().min(2).max(160),
    note: z.string().trim().max(2000).nullish(),
    attachmentIds,
  }),
  z.object({
    action: z.literal("submit-milestone"),
    projectId: z.number().int().positive(),
    milestoneId: z.number().int().positive(),
    note: z.string().trim().min(2).max(2000),
    attachmentIds,
  }),
  z.object({
    action: z.literal("request-revision"),
    projectId: z.number().int().positive(),
    milestoneId: z.number().int().positive(),
    note: z.string().trim().min(2).max(2000),
  }),
  z.object({
    action: z.literal("approve-milestone"),
    projectId: z.number().int().positive(),
    milestoneId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("submit-final-work"),
    projectId: z.number().int().positive(),
    note: z.string().trim().min(2).max(2000),
    attachmentIds,
  }),
  z.object({
    action: z.literal("request-client"),
    projectId: z.number().int().positive(),
    title: z.string().trim().min(2).max(160).optional(),
    note: z.string().trim().min(2).max(2000),
  }),
  z.object({ action: z.literal("complete-project"), projectId: z.number().int().positive() }),
  z.object({
    action: z.literal("respond-to-review"),
    projectId: z.number().int().positive(),
    response: z.string().trim().min(2).max(2000),
  }),
  z.object({
    action: z.literal("submit-review"),
    projectId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).nullish(),
  }),
  z.object({
    action: z.literal("submit-dispute"),
    projectId: z.number().int().positive(),
    issueType: z.string().trim().min(2).max(80),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM").optional(),
    message: z.string().trim().min(10).max(4000),
  }),
]);

const clientActions = new Set([
  "create-milestone",
  "request-revision",
  "approve-milestone",
  "complete-project",
]);
const sharedActions = new Set(["submit-review", "submit-dispute"]);

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const session = await verifySession(token);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Please provide valid project information." },
        { status: 400 },
      );
    const input = parsed.data;
    const isClientAction = clientActions.has(input.action);
    const isSharedAction = sharedActions.has(input.action);
    const isProfessionalAction = !isClientAction && !isSharedAction;
    if (
      (isClientAction && session.role !== "CLIENT") ||
      (isProfessionalAction && session.role !== "PROFESSIONAL")
    )
      return NextResponse.json(
        { error: `${isClientAction ? "Client" : "Professional"} access required.` },
        { status: 403 },
      );
    const project = await db.projectTracking.findFirst({
      where: {
        id: input.projectId,
        OR: [{ clientId: session.userId }, { professionalId: session.userId }],
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const event = async (
      type: string,
      title: string,
      description?: string,
      fields: {
        milestoneId?: number;
        progress?: number;
        stage?: string;
        attachmentJson?: string;
      } = {},
    ) =>
      db.projectTimelineEvent.create({
        data: {
          trackingId: project.id,
          actorId: session.userId,
          actorRole: session.role,
          type,
          title,
          description,
          ...fields,
        },
      });
    const attachmentsFor = async (ids: number[]) => {
      const uniqueIds = [...new Set(ids)];
      const files = await db.storedFile.findMany({
        where: {
          id: { in: uniqueIds },
          ownerId: session.userId,
          purpose: `project-work:${project.id}`,
          isPublic: false,
        },
      });
      if (files.length !== uniqueIds.length) return null;
      return files.map((file) => ({
        id: file.id,
        name: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        url: `/api/v1/portal/project-files/${file.id}`,
      }));
    };

    if (input.action === "start-work") {
      if (project.status !== "READY_TO_START")
        return NextResponse.json({ error: "This project has already started." }, { status: 409 });
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
      await event(
        "WORK_STARTED",
        "Work started",
        "The professional started working on this project.",
      );
    }
    if (input.action === "update-progress") {
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "IN_PROGRESS", progress: input.progress, currentStage: input.stage },
      });
      await event("PROGRESS_UPDATED", `Progress updated — ${input.progress}%`, input.note, {
        progress: input.progress,
        stage: input.stage,
      });
    }
    if (input.action === "create-milestone") {
      const count = await db.projectMilestone.count({ where: { trackingId: project.id } });
      if (count >= 5)
        return NextResponse.json(
          { error: "A project can have a maximum of 5 milestones." },
          { status: 409 },
        );
      // A new milestone should start IN_PROGRESS whenever nothing else is currently active —
      // not just when it's the very first milestone ever created. Otherwise a milestone added
      // after all prior ones are already approved gets stuck at UPCOMING with no way for the
      // professional to work on it (no future approval event will ever activate it).
      const activeCount = await db.projectMilestone.count({
        where: {
          trackingId: project.id,
          status: { in: ["IN_PROGRESS", "REVISION_REQUESTED", "AWAITING_CLIENT_REVIEW"] },
        },
      });
      const milestone = await db.projectMilestone.create({
        data: {
          trackingId: project.id,
          clientId: project.clientId,
          professionalId: project.professionalId,
          title: input.title,
          amount: input.amount,
          description: input.description ?? null,
          dueDate: input.deadline ? new Date(input.deadline) : null,
          status: activeCount === 0 ? "IN_PROGRESS" : "UPCOMING",
        },
      });
      await event("MILESTONE_CREATED", "Milestone created", input.title, {
        milestoneId: milestone.id,
      });
    }
    if (input.action === "upload-work") {
      if (!["IN_PROGRESS", "REVISION_REQUESTED"].includes(project.status))
        return NextResponse.json(
          { error: "Work can only be uploaded while the project is in progress." },
          { status: 409 },
        );
      const attachments = await attachmentsFor(input.attachmentIds);
      if (!attachments)
        return NextResponse.json(
          { error: "One or more uploaded files are unavailable." },
          { status: 400 },
        );
      const upload = await db.projectWorkUpload.create({
        data: {
          trackingId: project.id,
          milestoneId: input.milestoneId ?? null,
          title: input.title,
          note: input.note ?? null,
          fileName: attachments[0]?.name ?? null,
          fileUrl: attachments[0]?.url ?? null,
          filesJson: JSON.stringify(attachments),
          roundNumber: project.status === "REVISION_REQUESTED" ? 2 : 1,
          status: "UPLOADED",
        },
      });
      await event(
        upload.roundNumber > 1 ? "REVISED_WORK_UPLOADED" : "WORK_UPLOADED",
        upload.roundNumber > 1 ? "Revised work uploaded" : "Work uploaded",
        input.note ?? input.title,
        {
          milestoneId: input.milestoneId ?? undefined,
          attachmentJson: JSON.stringify(attachments),
        },
      );
    }
    if (input.action === "submit-milestone") {
      const milestone = await db.projectMilestone.findFirst({
        where: {
          id: input.milestoneId,
          trackingId: project.id,
          status: { in: ["IN_PROGRESS", "REVISION_REQUESTED"] },
        },
      });
      if (!milestone)
        return NextResponse.json({ error: "This milestone cannot be submitted." }, { status: 409 });
      const attachments = await attachmentsFor(input.attachmentIds);
      if (!attachments)
        return NextResponse.json(
          { error: "One or more uploaded files are unavailable." },
          { status: 400 },
        );
      const isResubmission = milestone.status === "REVISION_REQUESTED";
      await db.projectWorkUpload.create({
        data: {
          trackingId: project.id,
          milestoneId: milestone.id,
          title: milestone.title,
          note: input.note,
          fileName: attachments[0]?.name ?? null,
          fileUrl: attachments[0]?.url ?? null,
          filesJson: JSON.stringify(attachments),
          roundNumber: isResubmission ? 2 : 1,
          status: "SUBMITTED",
        },
      });
      await db.projectMilestone.update({
        where: { id: milestone.id },
        data: { status: "AWAITING_CLIENT_REVIEW", submittedAt: new Date() },
      });
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "AWAITING_CLIENT_REVIEW", currentStage: milestone.title },
      });
      await event(
        isResubmission ? "REVISED_WORK_SUBMITTED" : "MILESTONE_SUBMITTED",
        isResubmission ? "Revised work submitted" : "Milestone submitted",
        input.note,
        {
          milestoneId: milestone.id,
          attachmentJson: JSON.stringify(attachments),
        },
      );
    }
    if (input.action === "request-revision") {
      const milestone = await db.projectMilestone.findFirst({
        where: { id: input.milestoneId, trackingId: project.id, status: "AWAITING_CLIENT_REVIEW" },
      });
      if (!milestone)
        return NextResponse.json(
          { error: "This milestone is not awaiting review." },
          { status: 409 },
        );
      await db.projectRevisionRequest.create({
        data: {
          trackingId: project.id,
          clientId: project.clientId,
          professionalId: project.professionalId,
          note: input.note,
        },
      });
      await db.projectMilestone.update({
        where: { id: milestone.id },
        data: { status: "REVISION_REQUESTED" },
      });
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "REVISION_REQUESTED", currentStage: milestone.title },
      });
      await event("REVISION_REQUESTED", "Revision requested", input.note, {
        milestoneId: milestone.id,
      });
    }
    if (input.action === "approve-milestone") {
      return NextResponse.json(
        { error: "Milestones must be paid from the client wallet.", paymentRequired: true },
        { status: 402 },
      );
    }
    if (input.action === "submit-final-work") {
      const milestones = await db.projectMilestone.findMany({ where: { trackingId: project.id } });
      if (milestones.length < 3 || !milestones.every((item) => item.status === "APPROVED"))
        return NextResponse.json(
          { error: "All 3–5 milestones must be approved before final work can be submitted." },
          { status: 409 },
        );
      const attachments = await attachmentsFor(input.attachmentIds);
      if (!attachments)
        return NextResponse.json(
          { error: "One or more uploaded files are unavailable." },
          { status: 400 },
        );
      await db.projectWorkUpload.create({
        data: {
          trackingId: project.id,
          title: "Final work",
          note: input.note,
          fileName: attachments[0]?.name ?? null,
          fileUrl: attachments[0]?.url ?? null,
          filesJson: JSON.stringify(attachments),
          status: "FINAL_SUBMITTED",
        },
      });
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "FINAL_WORK_SUBMITTED" },
      });
      await event("FINAL_WORK_SUBMITTED", "Final work submitted", input.note, {
        attachmentJson: JSON.stringify(attachments),
      });
    }
    if (input.action === "request-client") {
      await event("PROFESSIONAL_REQUEST", input.title ?? "Request sent to client", input.note);
      await db.userNotification.create({
        data: {
          userId: project.clientId,
          type: "PROJECT_REQUEST",
          title: input.title ?? "Request from your professional",
          description: input.note,
          href: `/project/${project.id}/tracking`,
        },
      });
    }
    if (input.action === "complete-project") {
      if (project.status !== "FINAL_WORK_SUBMITTED")
        return NextResponse.json(
          { error: "Final work must be submitted before the project can be completed." },
          { status: 409 },
        );
      await db.projectTracking.update({
        where: { id: project.id },
        data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
      });
      await db.clientJob.updateMany({
        where: { id: project.jobId, userId: project.clientId },
        data: { status: "CLOSED" },
      });
      await event(
        "PROJECT_COMPLETED",
        "Project completed",
        "The client approved the final work and completed the project.",
        { progress: 100 },
      );
    }
    if (input.action === "submit-review") {
      if (session.role !== "CLIENT")
        return NextResponse.json(
          { error: "Only clients can submit a professional review." },
          { status: 403 },
        );
      const review = await db.projectReview.upsert({
        where: { trackingId: project.id },
        update: {
          rating: input.rating,
          comment: input.comment ?? null,
          updatedAt: new Date(),
        },
        create: {
          trackingId: project.id,
          clientId: project.clientId,
          professionalId: project.professionalId,
          rating: input.rating,
          comment: input.comment ?? null,
        },
      });
      const targetReviews = await db.projectReview.findMany({
        where: { professionalId: project.professionalId },
      });
      if (targetReviews.length > 0) {
        const average =
          targetReviews.reduce((sum, item) => sum + item.rating, 0) / targetReviews.length;
        await db.user.update({
          where: { id: project.professionalId },
          data: {
            averageRating: Number(average.toFixed(1)),
            reviewCount: targetReviews.length,
          },
        });
      }
      await event(
        "PROJECT_REVIEW_SUBMITTED",
        "Professional review submitted",
        input.comment ?? `Rated the project ${input.rating}/5.`,
      );
      return NextResponse.json({ ok: true, reviewId: review.id });
    }
    if (input.action === "respond-to-review") {
      const review = await db.projectReview.findUnique({ where: { trackingId: project.id } });
      if (!review)
        return NextResponse.json({ error: "No client review is available yet." }, { status: 409 });
      await db.projectReview.update({
        where: { trackingId: project.id },
        data: { professionalResponse: input.response, professionalResponseAt: new Date() },
      });
      await event(
        "REVIEW_RESPONSE_SUBMITTED",
        "Response to client review submitted",
        input.response,
      );
      return NextResponse.json({ ok: true });
    }
    if (input.action === "submit-dispute") {
      if (
        ![
          "READY_TO_START",
          "IN_PROGRESS",
          "AWAITING_CLIENT_REVIEW",
          "REVISION_REQUESTED",
          "FINAL_WORK_SUBMITTED",
          "COMPLETED",
          "CLOSED",
        ].includes(project.status)
      )
        return NextResponse.json(
          { error: "A dispute can only be raised while the project is active or closed." },
          { status: 409 },
        );
      const existingOpenDispute = await db.projectDispute.findFirst({
        where: { trackingId: project.id, status: "OPEN" },
      });
      if (existingOpenDispute)
        return NextResponse.json(
          { error: "This project already has an open dispute." },
          { status: 409 },
        );
      const dispute = await db.projectDispute.create({
        data: {
          trackingId: project.id,
          reporterId: session.userId,
          reporterRole: session.role,
          clientId: project.clientId,
          professionalId: project.professionalId,
          issueType: input.issueType,
          priority: input.priority ?? "MEDIUM",
          message: input.message,
          status: "OPEN",
        },
      });
      await event(
        "DISPUTE_RAISED",
        "Dispute raised",
        `Issue type: ${input.issueType}. ${input.message}`,
      );
      const [job, reporter] = await Promise.all([
        db.clientJob.findUnique({ where: { id: project.jobId }, select: { title: true } }),
        db.user.findUnique({
          where: { id: session.userId },
          select: { firstName: true, lastName: true },
        }),
      ]);
      enqueueBackgroundJob(
        "dispute.raised.notifications",
        () =>
          notifyDisputeRaised({
            disputeId: dispute.id,
            trackingId: project.id,
            jobTitle: job?.title ?? null,
            issueType: input.issueType,
            reporterRole: session.role as "CLIENT" | "PROFESSIONAL",
            reporterName: reporter
              ? `${reporter.firstName} ${reporter.lastName}`.trim()
              : session.role === "CLIENT"
                ? "The client"
                : "The professional",
            clientId: project.clientId,
            professionalId: project.professionalId,
          }),
        { disputeId: dispute.id, trackingId: project.id },
      );
      return NextResponse.json({ ok: true, disputeId: dispute.id });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("project.action.failed", error);
    return NextResponse.json({ error: "Unable to update the project." }, { status: 500 });
  }
}
