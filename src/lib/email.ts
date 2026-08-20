import "server-only";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}

export async function sendAuthEmail(
  to: string,
  subject: string,
  heading: string,
  actionUrl: string,
  action: string,
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const safeHeading = escapeHtml(heading);
  const safeAction = escapeHtml(action);
  const safeActionUrl = escapeHtml(actionUrl);
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `<main style="font-family:Arial,sans-serif;background:#F7F9FC;padding:32px"><section style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#0B1F4D">${safeHeading}</h1><p>Use the secure link below. It expires soon.</p><a href="${safeActionUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${safeAction}</a></section></main>`,
  });
}

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM,
  );
}

export async function sendNotificationEmail(input: {
  to: string;
  title: string;
  description: string;
  href?: string;
}) {
  if (!isEmailConfigured()) return;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const appUrl = process.env.APP_URL ?? "";
  const actionUrl = input.href ? `${appUrl}${input.href}` : appUrl;
  const safeTitle = escapeHtml(input.title);
  const safeDescription = escapeHtml(input.description);
  const safeActionUrl = escapeHtml(actionUrl);
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.title,
    html: `<main style="font-family:Arial,sans-serif;background:#F7F9FC;padding:32px"><section style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#0B1F4D">${safeTitle}</h1><p>${safeDescription}</p>${input.href ? `<a href="${safeActionUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Open Servio</a>` : ""}</section></main>`,
  });
}
