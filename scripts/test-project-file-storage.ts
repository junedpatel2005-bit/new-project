import "dotenv/config";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";

const base = "http://localhost:3000";
const clientId = 43;
const professionalId = 76;
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
const auth = (userId: number, role: "CLIENT" | "PROFESSIONAL") =>
  new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
const cookie = async (userId: number, role: "CLIENT" | "PROFESSIONAL") =>
  `servio_session=${await auth(userId, role)}`;

let trackingId: number | undefined;
let requestId: number | undefined;
const storageKeys: string[] = [];

async function action(
  actionName: string,
  values: Record<string, unknown>,
  userId = professionalId,
  role: "CLIENT" | "PROFESSIONAL" = "PROFESSIONAL",
) {
  const response = await fetch(`${base}/api/portal/project-actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await cookie(userId, role) },
    body: JSON.stringify({ action: actionName, projectId: trackingId, ...values }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(`${actionName} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

async function upload(files: File[]) {
  const form = new FormData();
  form.set("projectId", String(trackingId));
  files.forEach((file) => form.append("files", file));
  const response = await fetch(`${base}/api/portal/project-files`, {
    method: "POST",
    headers: { Cookie: await cookie(professionalId, "PROFESSIONAL") },
    body: form,
  });
  const body = (await response.json().catch(() => null)) as {
    attachments?: { id: number; url: string }[];
    error?: string;
  } | null;
  if (!response.ok || !body?.attachments) throw new Error(`upload failed: ${JSON.stringify(body)}`);
  const records = await db.storedFile.findMany({
    where: { id: { in: body.attachments.map((file) => file.id) } },
  });
  storageKeys.push(...records.map((file) => file.storageKey));
  return body.attachments;
}

async function assertFile(
  url: string,
  expected: Uint8Array,
  userId: number,
  role: "CLIENT" | "PROFESSIONAL",
) {
  const response = await fetch(`${base}${url}`, {
    headers: { Cookie: await cookie(userId, role) },
  });
  const actual = new Uint8Array(await response.arrayBuffer());
  if (
    !response.ok ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  )
    throw new Error(`file read failed for ${url}`);
}

try {
  const testRequest = await db.projectRequest.create({
    data: {
      jobId: 70,
      clientId,
      professionalId,
      bidAmount: 300,
      duration: "1 week",
      coverLetter: "Temporary secure upload verification record.",
      status: "ACCEPTED",
    },
  });
  requestId = testRequest.id;
  const project = await db.projectTracking.create({
    data: {
      requestId: testRequest.id,
      jobId: 70,
      clientId,
      professionalId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
  trackingId = project.id;

  const imageBytes = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAFAAH/e+m+7wAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const pdfBytes = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF",
  );
  const docBytes = new TextEncoder().encode("Project document attachment");
  const initial = await upload([
    new File([imageBytes], "homepage.png", { type: "image/png" }),
    new File([pdfBytes], "requirements.pdf", { type: "application/pdf" }),
    new File([docBytes], "notes.txt", { type: "text/plain" }),
  ]);
  await action("upload-work", {
    title: "Initial design files",
    note: "Real files uploaded.",
    attachmentIds: initial.map((file) => file.id),
  });
  await assertFile(initial[0]!.url, imageBytes, clientId, "CLIENT");
  await assertFile(initial[1]!.url, pdfBytes, clientId, "CLIENT");
  await assertFile(initial[2]!.url, docBytes, clientId, "CLIENT");

  for (let index = 1; index <= 3; index += 1)
    await action(
      "create-milestone",
      {
        title: `Upload test milestone ${index}`,
        amount: 100,
        deadline: "2026-12-01T00:00:00.000Z",
      },
      clientId,
      "CLIENT",
    );
  const view = await fetch(`${base}/api/portal/project?id=${trackingId}`, {
    headers: { Cookie: await cookie(clientId, "CLIENT") },
  });
  const data = await view.json();
  const first = data.milestones.find(
    (milestone: { status: string }) => milestone.status === "IN_PROGRESS",
  );
  const originalBytes = new TextEncoder().encode("Original milestone submission");
  const original = await upload([
    new File([originalBytes], "milestone-original.txt", { type: "text/plain" }),
  ]);
  await action("submit-milestone", {
    milestoneId: first.id,
    note: "Original work",
    attachmentIds: original.map((file) => file.id),
  });
  await action(
    "request-revision",
    { milestoneId: first.id, note: "Please revise the heading." },
    clientId,
    "CLIENT",
  );
  const revisedBytes = new TextEncoder().encode("Revised milestone submission");
  const revised = await upload([
    new File([revisedBytes], "milestone-revised.txt", { type: "text/plain" }),
  ]);
  await action("submit-milestone", {
    milestoneId: first.id,
    note: "Revised work",
    attachmentIds: revised.map((file) => file.id),
  });
  await assertFile(original[0]!.url, originalBytes, clientId, "CLIENT");
  await assertFile(revised[0]!.url, revisedBytes, clientId, "CLIENT");
  await action("approve-milestone", { milestoneId: first.id }, clientId, "CLIENT");

  let current = await (
    await fetch(`${base}/api/portal/project?id=${trackingId}`, {
      headers: { Cookie: await cookie(clientId, "CLIENT") },
    })
  ).json();
  while (
    current.milestones.some((milestone: { status: string }) => milestone.status === "IN_PROGRESS")
  ) {
    const milestone = current.milestones.find(
      (item: { status: string }) => item.status === "IN_PROGRESS",
    );
    const bytes = new TextEncoder().encode(`Milestone ${milestone.id} submission`);
    const attachment = await upload([
      new File([bytes], `milestone-${milestone.id}.txt`, { type: "text/plain" }),
    ]);
    await action("submit-milestone", {
      milestoneId: milestone.id,
      note: "Milestone delivery",
      attachmentIds: attachment.map((file) => file.id),
    });
    await action("approve-milestone", { milestoneId: milestone.id }, clientId, "CLIENT");
    current = await (
      await fetch(`${base}/api/portal/project?id=${trackingId}`, {
        headers: { Cookie: await cookie(clientId, "CLIENT") },
      })
    ).json();
  }
  const finalBytes = new TextEncoder().encode("Final work attachment");
  const final = await upload([new File([finalBytes], "final-work.txt", { type: "text/plain" })]);
  await action("submit-final-work", {
    note: "Final work",
    attachmentIds: final.map((file) => file.id),
  });
  await assertFile(final[0]!.url, finalBytes, clientId, "CLIENT");
  const denied = await fetch(`${base}${final[0]!.url}`, {
    headers: { Cookie: await cookie(999999, "CLIENT") },
  });
  if (denied.status !== 404) throw new Error(`unauthorized access returned ${denied.status}`);
  const persisted = await (
    await fetch(`${base}/api/portal/project?id=${trackingId}`, {
      headers: { Cookie: await cookie(clientId, "CLIENT") },
    })
  ).json();
  if (
    !persisted.timeline.some((event: { type: string }) => event.type === "REVISED_WORK_SUBMITTED")
  )
    throw new Error("revision history was not persisted");
  console.log(
    JSON.stringify(
      {
        passed:
          "image, PDF, document, milestone, revision, final upload/download, and unauthorized access",
        trackingId,
      },
      null,
      2,
    ),
  );
} finally {
  if (trackingId) {
    await db.projectTimelineEvent.deleteMany({ where: { trackingId } });
    await db.projectWorkUpload.deleteMany({ where: { trackingId } });
    await db.projectRevisionRequest.deleteMany({ where: { trackingId } });
    await db.projectMilestone.deleteMany({ where: { trackingId } });
    await db.projectTracking.deleteMany({ where: { id: trackingId } });
    await db.storedFile.deleteMany({ where: { purpose: `project-work:${trackingId}` } });
  }
  if (requestId) await db.projectRequest.deleteMany({ where: { id: requestId } });
  await Promise.all(
    storageKeys.map((key) =>
      unlink(path.join(process.cwd(), ".project-work-files", key)).catch(() => undefined),
    ),
  );
  await db.$disconnect();
}
