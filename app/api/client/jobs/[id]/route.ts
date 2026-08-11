import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCookie, verifySession } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  budgetMin: z.coerce.number().int().min(0).max(10000000).nullable().optional(),
  budgetMax: z.coerce.number().int().min(0).max(10000000).nullable().optional(),
  hourlyRate: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  timingType: z.enum(["FIXED", "HOURLY"]).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  jobDate: z.string().date().nullable().optional(),
  deadline: z.string().date().nullable().optional(),
  workMode: z.enum(["ON_SITE", "REMOTE", "BOTH"]).optional(),
  locationLabel: z.string().trim().max(100).nullable().optional(),
  locationAddress: z.string().trim().max(300).nullable().optional(),
  locationLat: z.coerce.number().min(-90).max(90).nullable().optional(),
  locationLng: z.coerce.number().min(-180).max(180).nullable().optional(),
  mode: z.enum(["draft", "publish"]),
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
  return {
    title: d.title || null,
    category: d.category || null,
    description: d.description || null,
    budgetMin: d.budgetMin ?? null,
    budgetMax: d.budgetMax ?? null,
    hourlyRate: d.hourlyRate ?? null,
    timingType: d.timingType ?? "FIXED",
    urgency: d.urgency ?? "MEDIUM",
    workMode: d.workMode ?? "BOTH",
    jobDate: d.jobDate ? new Date(`${d.jobDate}T00:00:00.000Z`) : null,
    deadline: d.deadline ? new Date(`${d.deadline}T00:00:00.000Z`) : null,
    locationLabel: d.locationLabel || null,
    locationAddress: d.locationAddress || null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
  };
}
async function errors(d: z.infer<typeof bodySchema>) {
  const fields: Record<string, string> = {};
  if (!d.title?.trim()) fields.title = "Enter a job title.";
  if (!d.category?.trim()) fields.category = "Choose a category.";
  if (!d.description?.trim()) fields.description = "Describe the work needed.";
  if (!d.deadline) fields.deadline = "Choose a deadline.";
  if (d.workMode !== "REMOTE" && !d.locationAddress?.trim())
    fields.locationAddress = "Choose a job location.";
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
      attachments: { select: { id: true, fileName: true, fileType: true, fileSize: true, previewUrl: true } },
    },
  });
  return job
    ? NextResponse.json({ job })
    : NextResponse.json({ error: "Not found." }, { status: 404 });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await client(request);
  const id = idOf((await params).id);
  if (!userId || !id) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const current = await db.clientJob.findFirst({ where: { id, userId } });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (current.status === "CLOSED")
    return NextResponse.json({ error: "Closed jobs cannot be changed." }, { status: 409 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Please review the job details." }, { status: 400 });
  const fields = parsed.data.mode === "publish" ? await errors(parsed.data) : {};
  if (Object.keys(fields).length)
    return NextResponse.json(
      { error: "Please correct the highlighted fields.", fields },
      { status: 400 },
    );
  const job = await db.clientJob.update({
    where: { id },
    data: {
      ...dataOf(parsed.data),
      status: parsed.data.mode === "publish" ? "OPEN" : current.status,
    },
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
