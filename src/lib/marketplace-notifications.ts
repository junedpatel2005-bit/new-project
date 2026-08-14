import "server-only";

import { db } from "@/lib/db";
import { logServerError } from "@/lib/server-logger";
import { emitRealtimeNotification } from "@/lib/realtime";

type BroadcastNotification = {
  type: string;
  title: string;
  description: string;
  href: string;
};

async function notifyRole(
  role: "ADMIN" | "CLIENT" | "PROFESSIONAL",
  notification: BroadcastNotification,
) {
  try {
    const recipients = await db.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });
    if (!recipients.length) return;

    await db.userNotification.createMany({
      data: recipients.map((recipient) => ({ userId: recipient.id, ...notification })),
    });
    emitRealtimeNotification(
      recipients.map((recipient) => recipient.id),
      notification,
    );
  } catch (error) {
    // A failed notification must never block account creation or job publishing.
    logServerError("marketplace.notification.broadcast.failed", error, {
      role,
      type: notification.type,
    });
  }
}

export function notifyClientsOfNewProfessional(professional: {
  id: number;
  firstName: string;
  lastName: string;
}) {
  const name = `${professional.firstName} ${professional.lastName}`.trim() || "A new professional";
  return notifyRole("CLIENT", {
    type: "NEW_PROFESSIONAL",
    title: "New professional joined Servio",
    description: `${name} has joined the marketplace. View their profile and see if they are a fit for your next project.`,
    href: `/pro/${professional.id}`,
  });
}

export function notifyAdminsOfNewAccount(user: {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim() || "A new user";
  const roleLabel = user.role === "PROFESSIONAL" ? "professional" : "client";
  return notifyRole("ADMIN", {
    type: "NEW_ACCOUNT",
    title: `New ${roleLabel} registration`,
    description: `${name} registered as a ${roleLabel}.`,
    href: `/admin/users/${user.id}`,
  });
}

export function notifyProfessionalsOfNewJob(job: {
  id: number;
  title: string | null;
  category: string | null;
}) {
  const title = job.title?.trim() || "A new client job";
  return notifyRole("PROFESSIONAL", {
    type: "NEW_JOB",
    title: "New job posted",
    description: `${title}${job.category ? ` · ${job.category}` : ""} is now open for proposals.`,
    href: `/job/${job.id}`,
  });
}

export function notifyAdminsOfNewJob(job: {
  id: number;
  title: string | null;
  category: string | null;
}) {
  return notifyRole("ADMIN", {
    type: "NEW_JOB",
    title: "New job posted",
    description: `${job.title?.trim() || "A client"}${job.category ? ` · ${job.category}` : ""} is now open.`,
    href: `/admin/operations?job=${job.id}`,
  });
}

export function notifyAdminsOfNewProposal(input: {
  jobId: number;
  jobTitle: string | null;
  professionalName: string;
}) {
  return notifyRole("ADMIN", {
    type: "NEW_PROPOSAL",
    title: "New professional proposal",
    description: `${input.professionalName} sent a proposal for ${input.jobTitle?.trim() || `job #${input.jobId}`}.`,
    href: `/admin/operations?job=${input.jobId}`,
  });
}
