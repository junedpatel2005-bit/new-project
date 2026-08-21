import "server-only";

import { db } from "@/lib/db";
import { logServerError } from "@/lib/server-logger";
import { emitRealtimeNotification } from "@/lib/realtime";
import { sendNotificationEmail } from "@/lib/email";

type BroadcastNotification = {
  type: string;
  title: string;
  description: string;
  href: string;
};

async function sendEmails(
  recipients: Array<{ email: string; emailNotificationsEnabled: boolean }>,
  notification: BroadcastNotification,
) {
  const results = await Promise.allSettled(
    recipients
      .filter((recipient) => recipient.emailNotificationsEnabled)
      .map((recipient) => sendNotificationEmail({ to: recipient.email, ...notification })),
  );
  results.forEach((result) => {
    if (result.status === "rejected")
      logServerError("marketplace.notification.email.failed", result.reason, {
        type: notification.type,
      });
  });
}

async function notifyRole(
  role: "ADMIN" | "CLIENT" | "PROFESSIONAL",
  notification: BroadcastNotification,
) {
  try {
    const recipients = await db.user.findMany({
      where: { role, isActive: true },
      select: { id: true, email: true, emailNotificationsEnabled: true },
    });
    if (!recipients.length) return;

    await db.userNotification.createMany({
      data: recipients.map((recipient) => ({ userId: recipient.id, ...notification })),
    });
    emitRealtimeNotification(
      recipients.map((recipient) => recipient.id),
      notification,
    );
    const configuredAdminEmail =
      role === "ADMIN" && process.env.ADMIN_EMAIL?.includes("@")
        ? process.env.ADMIN_EMAIL.trim().toLowerCase()
        : null;
    await sendEmails(
      recipients.map((recipient) => ({
        ...recipient,
        email:
          recipient.email.endsWith(".local") && configuredAdminEmail
            ? configuredAdminEmail
            : recipient.email,
      })),
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

async function notifyUsers(userIds: number[], notification: BroadcastNotification) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  try {
    const recipients = await db.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, email: true, emailNotificationsEnabled: true },
    });
    await db.userNotification.createMany({
      data: recipients.map((recipient) => ({ userId: recipient.id, ...notification })),
    });
    emitRealtimeNotification(
      recipients.map((recipient) => recipient.id),
      notification,
    );
    await sendEmails(recipients, notification);
  } catch (error) {
    logServerError("marketplace.notification.direct.failed", error, {
      userIds: ids.join(","),
      type: notification.type,
    });
  }
}

export async function notifyDisputeRaised(input: {
  disputeId: number;
  trackingId: number;
  jobTitle: string | null;
  issueType: string;
  reporterRole: "CLIENT" | "PROFESSIONAL";
  reporterName: string;
  clientId: number;
  professionalId: number;
}) {
  const jobLabel = input.jobTitle?.trim() || "your project";
  const reporterLabel = input.reporterRole === "CLIENT" ? "the client" : "the professional";
  await notifyRole("ADMIN", {
    type: "DISPUTE_RAISED",
    title: "New dispute raised",
    description: `${input.reporterName} (${reporterLabel}) raised a ${input.issueType} dispute on ${jobLabel}.`,
    href: `/admin/operations?dispute=${input.disputeId}`,
  });
  await notifyUsers([input.clientId, input.professionalId], {
    type: "DISPUTE_RAISED",
    title: "A dispute was raised on your project",
    description: `${input.reporterName} raised a ${input.issueType} dispute on ${jobLabel}. Our team will review it and follow up soon.`,
    href: `/project/${input.trackingId}/tracking`,
  });
}

export async function notifyDisputeResolved(input: {
  trackingId: number;
  jobTitle: string | null;
  status: "OPEN" | "RESOLVED";
  clientId: number;
  professionalId: number;
}) {
  const jobLabel = input.jobTitle?.trim() || "your project";
  await notifyUsers([input.clientId, input.professionalId], {
    type: "DISPUTE_UPDATED",
    title: input.status === "RESOLVED" ? "Dispute resolved" : "Dispute reopened",
    description:
      input.status === "RESOLVED"
        ? `Servio support marked the dispute on ${jobLabel} as resolved.`
        : `Servio support reopened the dispute on ${jobLabel} for further review.`,
    href: `/project/${input.trackingId}/tracking`,
  });
}

export function notifyDisputeMessage(input: {
  disputeId: number;
  trackingId: number;
  recipientId: number;
  senderName: string;
  message: string;
}) {
  return notifyUsers([input.recipientId], {
    type: "DISPUTE_MESSAGE",
    title: `Message from Servio support about dispute #${input.disputeId}`,
    description: `${input.senderName}: ${input.message.slice(0, 180)}`,
    href: `/project/${input.trackingId}/tracking`,
  });
}

export async function notifyMilestoneFunded(input: {
  projectId: number;
  milestoneId: number;
  milestoneTitle: string;
  amount: number;
  clientId: number;
  professionalId: number;
}) {
  const href = `/project/${input.projectId}/tracking`;
  const amount = `₹${input.amount.toLocaleString("en-IN")}`;
  await notifyUsers([input.clientId], {
    type: "MILESTONE_FUNDED",
    title: "Milestone payment received",
    description: `${amount} has been received for ${input.milestoneTitle}. The professional payout is waiting for admin approval.`,
    href,
  });
  await notifyUsers([input.professionalId], {
    type: "MILESTONE_FUNDED",
    title: "Milestone funded",
    description: `${input.milestoneTitle} is funded for ${amount}. Your payout is waiting for admin approval.`,
    href,
  });
  await notifyRole("ADMIN", {
    type: "MILESTONE_FUNDED",
    title: "Milestone payout approval required",
    description: `${input.milestoneTitle} has received ${amount}. Review and approve the professional payout.`,
    href: "/admin/finance",
  });
}

export async function notifyMilestonePayoutApproved(input: {
  projectId: number;
  milestoneTitle: string;
  payoutAmount: number;
  platformEarnings: number;
  clientId: number;
  professionalId: number;
}) {
  const href = `/project/${input.projectId}/tracking`;
  const payout = `₹${input.payoutAmount.toLocaleString("en-IN")}`;
  await notifyUsers([input.clientId], {
    type: "MILESTONE_PAYOUT_APPROVED",
    title: "Professional payout approved",
    description: `The payout of ${payout} for ${input.milestoneTitle} has been approved and released.`,
    href,
  });
  await notifyUsers([input.professionalId], {
    type: "MILESTONE_PAYOUT_APPROVED",
    title: "Your milestone payment was released",
    description: `${payout} for ${input.milestoneTitle} has been added to your wallet.`,
    href: "/professional/earnings",
  });
  await notifyRole("ADMIN", {
    type: "MILESTONE_PAYOUT_APPROVED",
    title: "Milestone payout completed",
    description: `${payout} was released for ${input.milestoneTitle}. Platform earnings: ₹${input.platformEarnings.toLocaleString("en-IN")}.`,
    href: "/admin/finance",
  });
}
