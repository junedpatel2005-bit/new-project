import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { attachLastActorRole } from "@/lib/project-request-actions";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  budgetMin: z.coerce.number().int().min(0).max(10000000).nullable().optional(),
  budgetMax: z.coerce.number().int().min(0).max(10000000).nullable().optional(),
  hourlyRate: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  timingType: z.enum(["FIXED", "HOURLY"]).optional(),
  paymentMethod: z.enum(["WALLET", "OFFLINE"]).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  jobDate: z.string().date().nullable().optional(),
  deadline: z.string().date().nullable().optional(),
  workMode: z.enum(["ON_SITE", "REMOTE", "BOTH"]).optional(),
  locationLabel: z.string().trim().max(100).nullable().optional(),
  locationAddress: z.string().trim().max(300).nullable().optional(),
  locationState: z.string().trim().max(100).nullable().optional(),
  locationDistrict: z.string().trim().max(100).nullable().optional(),
  locationLat: z.coerce.number().min(-90).max(90).nullable().optional(),
  locationLng: z.coerce.number().min(-180).max(180).nullable().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  mode: z.enum(["draft", "publish"]).optional(),
});
async function client(request: NextRequest) {
  try {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) return null;
    const session = await verifySession(token);
    if (session.role !== "CLIENT") return null;
    return session.userId;
  } catch {
    return null;
  }
}
function idOf(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function dataOf(d: z.infer<typeof bodySchema>) {
  const update: Record<string, unknown> = {
    title: d.title || null,
    category: d.category || null,
    description: d.description || null,
    budgetMin: d.budgetMin ?? null,
    budgetMax: d.budgetMax ?? null,
    hourlyRate: d.hourlyRate ?? null,
    timingType: d.timingType ?? "FIXED",
    paymentMethod: d.paymentMethod ?? "WALLET",
    urgency: d.urgency ?? "MEDIUM",
    workMode: d.workMode ?? "BOTH",
    jobDate: d.jobDate ? new Date(`${d.jobDate}T00:00:00.000Z`) : null,
    deadline: d.deadline ? new Date(`${d.deadline}T00:00:00.000Z`) : null,
    locationLabel: d.locationLabel || null,
    locationAddress: d.locationAddress || null,
    locationState: d.locationState || null,
    locationDistrict: d.locationDistrict || null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
  };
  if (d.status) update.status = d.status;
  return update;
}
async function errors(d: z.infer<typeof bodySchema>) {
  const fields: Record<string, string> = {};
  if (!d.title?.trim()) fields.title = "Enter a job title.";
  if (!d.category?.trim()) fields.category = "Choose a category.";
  if (!d.description?.trim()) fields.description = "Describe the work needed.";
  if (!d.deadline) fields.deadline = "Choose a deadline.";
  if (d.workMode !== "REMOTE") {
    if (!d.locationAddress?.trim()) fields.locationAddress = "Choose a job location.";
    else if (d.locationLat == null || d.locationLng == null)
      fields.locationAddress =
        "Select the address from the search results or drop a pin on the map so professionals can find you nearby.";
  }
  if (d.timingType === "HOURLY" && !d.hourlyRate) fields.hourlyRate = "Enter an hourly rate.";
  if (d.timingType !== "HOURLY" && (d.budgetMin == null || d.budgetMax == null))
    fields.budgetMin = "Enter a budget range.";
  if (d.budgetMin != null && d.budgetMax != null && d.budgetMin > d.budgetMax)
    fields.budgetMax = "Maximum budget must be at least the minimum.";
  if (d.jobDate && d.deadline && d.deadline < d.jobDate)
    fields.deadline = "Deadline cannot be before the preferred job date.";
  if (
    d.category?.trim() &&
    !(await db.serviceCategory.findFirst({
      where: { name: d.category.trim() },
      select: { id: true },
    }))
  )
    fields.category = "Choose a valid category.";
  return fields;
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await client(request);
  const id = idOf((await params).id);
  if (!userId || !id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const job = await db.clientJob.findFirst({
    where: { id, userId },
    include: {
      attachments: {
        select: { id: true, fileName: true, fileType: true, fileSize: true, previewUrl: true },
      },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const category = job.category
    ? await db.serviceCategory.findFirst({
        where: { name: job.category },
        select: { segment: true, parent: { select: { name: true } } },
      })
    : null;

  const project = await db.projectTracking.findFirst({
    where: { jobId: id, clientId: userId },
    select: { id: true },
  });
  const proposalSelect = {
    id: true,
    professionalId: true,
    bidAmount: true,
    duration: true,
    coverLetter: true,
    status: true,
    origin: true,
    createdAt: true,
  } as const;
  const [proposals, hireRequests] = await Promise.all([
    db.projectRequest.findMany({
      where: { jobId: id, clientId: userId, origin: "PROFESSIONAL_PROPOSAL" },
      orderBy: { createdAt: "desc" },
      select: proposalSelect,
    }),
    db.projectRequest.findMany({
      where: { jobId: id, clientId: userId, origin: "CLIENT_HIRE" },
      orderBy: { createdAt: "desc" },
      select: proposalSelect,
    }),
  ]);
  const professionals = await db.user.findMany({
    where: {
      id: { in: [...proposals, ...hireRequests].map((item) => item.professionalId) },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      professionalCategory: true,
      professionalCity: true,
      averageRating: true,
      reviewCount: true,
      isVerified: true,
    },
  });
  const professionalById = new Map(
    professionals.map((professional) => [professional.id, professional]),
  );
  const [proposalsWithActor, hireRequestsWithActor] = await Promise.all([
    attachLastActorRole(proposals),
    attachLastActorRole(hireRequests),
  ]);
  const negotiations = await db.projectNegotiation.findMany({
    where: { requestId: { in: proposals.map((proposal) => proposal.id) } },
    orderBy: { createdAt: "desc" },
    select: {
      requestId: true,
      previousBidAmount: true,
      previousDuration: true,
      previousMessage: true,
    },
  });
  const latestNegotiationByRequest = new Map<number, (typeof negotiations)[number]>();
  for (const negotiation of negotiations) {
    if (!latestNegotiationByRequest.has(negotiation.requestId))
      latestNegotiationByRequest.set(negotiation.requestId, negotiation);
  }
  return NextResponse.json({
    job: {
      ...job,
      projectId: project?.id ?? null,
      mainCategory: category?.parent?.name ?? null,
      categorySegment: category?.segment ?? null,
    },
    proposals: proposalsWithActor.map((proposal) => ({
      ...proposal,
      previous: latestNegotiationByRequest.get(proposal.id)
        ? {
            bidAmount: latestNegotiationByRequest.get(proposal.id)!.previousBidAmount,
            duration: latestNegotiationByRequest.get(proposal.id)!.previousDuration,
            message: latestNegotiationByRequest.get(proposal.id)!.previousMessage,
          }
        : null,
      professional: professionalById.get(proposal.professionalId) ?? null,
    })),
    hireRequests: hireRequestsWithActor.map((hireRequest) => ({
      ...hireRequest,
      professional: professionalById.get(hireRequest.professionalId) ?? null,
    })),
  });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await client(request);
  const id = idOf((await params).id);
  if (!userId || !id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const current = await db.clientJob.findFirst({ where: { id, userId } });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please review the job details." }, { status: 400 });
  if (current.status === "CLOSED" && parsed.data.status !== "OPEN")
    return NextResponse.json({ error: "Closed jobs cannot be changed." }, { status: 409 });

  // A status-only transition (no `mode`, e.g. Close/Reopen from the job detail page) must only
  // touch `status` — rebuilding the full record from `dataOf()` would null out every field the
  // caller didn't send.
  const isStatusOnly =
    !parsed.data.mode && Object.keys(parsed.data).every((key) => key === "status");
  if (isStatusOnly) {
    if (!parsed.data.status)
      return NextResponse.json({ error: "Please review the job details." }, { status: 400 });
    const job = await db.clientJob.update({ where: { id }, data: { status: parsed.data.status } });
    return NextResponse.json({ job });
  }

  if (current.status === "CLOSED")
    return NextResponse.json({ error: "Closed jobs cannot be changed." }, { status: 409 });
  const fields = parsed.data.mode === "publish" ? await errors(parsed.data) : {};
  if (Object.keys(fields).length)
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields },
      { status: 400 },
    );
  const updateData = dataOf(parsed.data);
  if (parsed.data.mode === "publish" && !parsed.data.status) {
    updateData.status = "OPEN";
  }
  const job = await db.clientJob.update({
    where: { id },
    data: updateData,
  });
  return NextResponse.json({ job });
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await client(request);
  const id = idOf((await params).id);
  if (!userId || !id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const job = await db.clientJob.findFirst({ where: { id, userId }, select: { status: true } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (job.status !== "DRAFT")
    return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 409 });
  await db.clientJob.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
