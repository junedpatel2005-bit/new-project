import "server-only";
import nodemailer from "nodemailer";
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
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `<main style="font-family:Arial,sans-serif;background:#F7F9FC;padding:32px"><section style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#0B1F4D">${heading}</h1><p>Use the secure link below. It expires soon.</p><a href="${actionUrl}" style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${action}</a></section></main>`,
  });
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Your Servio verification code",
    html: `<main style="font-family:Arial,sans-serif;background:#F7F9FC;padding:32px"><section style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#0B1F4D">Verify your email</h1><p>Use this code to finish creating your account. It expires in 15 minutes.</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>If you did not create a Servio account, you can ignore this email.</p></section></main>`,
  });
}
