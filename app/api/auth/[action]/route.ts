import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { db } from "@/lib/db";
import { createSession, sessionCookie, sessionOptions, verifySession } from "@/lib/auth";
import {
  createPhoneVerificationProof,
  hasValidPhoneVerificationProof,
  phoneProofCookie,
  phoneProofCookieOptions,
} from "@/lib/dev-phone-otp";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-otp-provider";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { sendAuthEmail, sendVerificationCodeEmail } from "@/lib/email";

const registerSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email(),
    phone: z.string().min(7).max(25),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/),
    role: z.enum(["CLIENT", "PROFESSIONAL"]),
    terms: z.literal(true),
  })
  .superRefine((value, context) => {
    if (!value.phone?.trim()) {
      context.addIssue({ code: "custom", path: ["phone"], message: "A phone number is required." });
    }
  });
const credentials = z.object({ email: z.string().email(), password: z.string().min(1) });
const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
const clientKey = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
const safe = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const verificationCode = () => String(randomInt(100000, 1000000));

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
    const callbackUrl = `${appUrl}/api/auth/google`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/login?oauthError=google-not-configured", request.url));
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      const role =
        request.nextUrl.searchParams.get("role") === "PROFESSIONAL" ? "PROFESSIONAL" : "CLIENT";
      const state = randomBytes(24).toString("hex");
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", callbackUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("state", state);
      const response = NextResponse.redirect(url);
      response.cookies.set("servio_google_oauth", JSON.stringify({ state, role }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      return response;
    }

    try {
      const saved = JSON.parse(request.cookies.get("servio_google_oauth")?.value ?? "{}") as {
        state?: string;
        role?: "CLIENT" | "PROFESSIONAL";
      };
      if (!saved.state || saved.state !== request.nextUrl.searchParams.get("state"))
        throw new Error("Invalid OAuth state");
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });
      const token = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenResponse.ok || !token.access_token)
        throw new Error("Could not exchange Google authorization code");
      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const profile = (await profileResponse.json()) as {
        sub?: string;
        email?: string;
        given_name?: string;
        family_name?: string;
        name?: string;
      };
      if (!profileResponse.ok || !profile.sub || !profile.email)
        throw new Error("Could not read Google profile");
      let user = await db.user.findFirst({
        where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
      });
      if (!user) {
        const names = (profile.name ?? "New User").trim().split(/\s+/, 2);
        user = await db.user.create({
          data: {
            googleId: profile.sub,
            authProvider: "GOOGLE",
            email: profile.email,
            firstName: profile.given_name ?? names[0] ?? "New",
            lastName: profile.family_name ?? names[1] ?? "",
            role: saved.role ?? "CLIENT",
            emailVerifiedAt: new Date(),
          },
        });
      } else if (!user.googleId) {
        user = await db.user.update({
          where: { id: user.id },
          data: { googleId: profile.sub, authProvider: "GOOGLE", emailVerifiedAt: new Date() },
        });
      }
      const redirect =
        user.role === "CLIENT"
          ? "/client-profile"
          : user.role === "PROFESSIONAL"
            ? "/professional/setup"
            : "/admin";
      const response = NextResponse.redirect(new URL(redirect, request.url));
      response.cookies.set(
        sessionCookie,
        await createSession({ userId: user.id, role: user.role }),
        sessionOptions,
      );
      response.cookies.set("servio_google_oauth", "", { httpOnly: true, path: "/", maxAge: 0 });
      return response;
    } catch {
      const response = NextResponse.redirect(
        new URL("/login?oauthError=google-failed", request.url),
      );
      response.cookies.set("servio_google_oauth", "", { httpOnly: true, path: "/", maxAge: 0 });
      return response;
    }
  }
  if (action !== "me") return safe("Not found", 404);
  const token = request.cookies.get(sessionCookie)?.value;
  // This endpoint also powers the public app shell. A signed-out visitor is
  // a normal state, not an error, so return an empty session without a 401.
  if (!token) return NextResponse.json({ user: null });
  try {
    const session = await verifySession(token);
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });
    return user?.isActive ? NextResponse.json({ user }) : NextResponse.json({ user: null });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const body = await request.json().catch(() => null);
  // Credential attempts are scoped to an address as well as the browser IP.
  // In local development every user shares the "local" client key; using only
  // that key locks every account after five attempts from any account.
  const loginEmail =
    action === "login" && typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
  const rateLimitKey = loginEmail
    ? `${action}:${clientKey(request)}:${loginEmail}`
    : `${action}:${clientKey(request)}`;
  if (!rateLimit(rateLimitKey))
    return safe("Too many attempts. Please try again shortly.", 429);
  if (action === "send-phone-otp") {
    const parsed = z.object({ phone: z.string().min(7).max(25) }).safeParse(body);
    if (!parsed.success) return safe("Enter a valid phone number.");
    const existingUser = await db.user.findFirst({ where: { phone: parsed.data.phone } });
    if (existingUser)
      return NextResponse.json(
        {
          error:
            "This phone number is already registered. Please log in or use a different number.",
        },
        { status: 409 },
      );
    if (
      !rateLimit(`send-phone-otp:${clientKey(request)}:${parsed.data.phone.trim()}`, 3, 10 * 60_000)
    )
      return safe("Too many code requests. Please try again later.", 429);
    const result = await requestPhoneOtp(parsed.data.phone);
    if (!result.ok) return safe(result.error, result.status);
    // The development code is configured only on the server. A real SMS sender
    // can replace this isolated action without changing signup or registration.
    return NextResponse.json({ success: true });
  }
  if (action === "verify-phone") {
    const parsed = z
      .object({ phone: z.string().min(7).max(25), code: z.string().min(1).max(20) })
      .safeParse(body);
    if (!parsed.success) return safe("Enter a valid phone number and verification code.");
    if (
      !rateLimit(`verify-phone:${clientKey(request)}:${parsed.data.phone.trim()}`, 5, 10 * 60_000)
    )
      return safe("Too many verification attempts. Please try again later.", 429);
    const result = await verifyPhoneOtp(parsed.data.phone, parsed.data.code);
    if (!result.ok) return safe(result.error, result.status);

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      phoneProofCookie,
      await createPhoneVerificationProof(parsed.data.phone),
      phoneProofCookieOptions,
    );
    return response;
  }
  if (action === "check-availability") {
    const parsed = z
      .object({ email: z.string().email().optional(), phone: z.string().min(7).max(25).optional() })
      .refine((value) => Boolean(value.email || value.phone), {
        message: "Email or phone is required.",
      })
      .safeParse(body);
    if (!parsed.success) {
      return safe("Enter a valid email or phone number.");
    }
    const fields: Record<string, string> = {};
    if (parsed.data.email) {
      const emailTaken = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (emailTaken) fields.email = "Email is already registered.";
    }
    if (parsed.data.phone) {
      const phoneTaken = await db.user.findFirst({ where: { phone: parsed.data.phone } });
      if (phoneTaken) fields.phone = "Phone number is already registered.";
    }
    return NextResponse.json({ fields }, { status: 200 });
  }

  if (action === "register") {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
      );
      return NextResponse.json(
        { error: "Please correct the highlighted fields.", fields },
        { status: 400 },
      );
    }
    const data = parsed.data;
    if (
      !(await hasValidPhoneVerificationProof(
        request.cookies.get(phoneProofCookie)?.value,
        data.phone!,
      ))
    ) {
      return safe("Verify this phone number before creating an account.", 403);
    }
    const [existingEmailUser, existingPhoneUser] = await Promise.all([
      db.user.findUnique({ where: { email: data.email } }),
      db.user.findFirst({ where: { phone: data.phone } }),
    ]);
    const duplicateFields: Record<string, string> = {};
    if (existingEmailUser) duplicateFields.email = "Email is already registered.";
    if (existingPhoneUser) duplicateFields.phone = "Phone number is already registered.";
    if (existingEmailUser || existingPhoneUser) {
      return NextResponse.json(
        {
          error: "An account already exists with that email or phone.",
          fields: duplicateFields,
        },
        { status: 409 },
      );
    }
    const user = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        phoneVerifiedAt: new Date(),
      },
    });
    const code = verificationCode();
    await db.apiToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(code),
        kind: "EMAIL_VERIFICATION",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await sendVerificationCodeEmail(user.email, code);
    const response = NextResponse.json(
      {
        success: true,
        redirect: "/verify",
      },
      { status: 201 },
    );
    response.cookies.set(
      sessionCookie,
      await createSession({ userId: user.id, role: user.role }),
      sessionOptions,
    );
    response.cookies.set(phoneProofCookie, "", { ...phoneProofCookieOptions, maxAge: 0 });
    return response;
  }
  if (action === "login") {
    const parsed = credentials.safeParse(body);
    if (!parsed.success) return safe("Invalid email or password.", 401);
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (
      !user?.passwordHash ||
      !user.isActive ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    )
      return safe("Invalid email or password.", 401);
    clearRateLimit(rateLimitKey);
    const response = NextResponse.json({
      success: true,
      redirect:
        user.role === "ADMIN"
          ? "/admin"
          : !user.emailVerifiedAt
            ? "/verify"
            : user.role === "PROFESSIONAL"
              ? user.professionalCategory && user.professionalCity
                ? "/professional/dashboard"
                : "/professional/setup"
              : "/dashboard",
    });
    response.cookies.set(
      sessionCookie,
      await createSession({ userId: user.id, role: user.role }),
      sessionOptions,
    );
    return response;
  }
  if (action === "logout") {
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookie, "", { ...sessionOptions, maxAge: 0 });
    return response;
  }
  if (action === "update-email") {
    const parsed = z.object({ email: z.string().email() }).safeParse(body);
    if (!parsed.success) return safe("Enter a valid email address.");
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) return safe("Please sign in again.", 401);
    try {
      const session = await verifySession(token);
      const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
      const existingEmailUser = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (existingEmailUser && existingEmailUser.id !== user.id) {
        return NextResponse.json(
          {
            error: "This email address is already registered.",
            fields: { email: "Email is already registered." },
          },
          { status: 409 },
        );
      }
      const code = verificationCode();
      await db.$transaction([
        db.apiToken.updateMany({
          where: {
            userId: user.id,
            kind: "EMAIL_VERIFICATION",
            usedAt: null,
          },
          data: { usedAt: new Date() },
        }),
        db.user.update({
          where: { id: user.id },
          data: { email: parsed.data.email, emailVerifiedAt: null },
        }),
        db.apiToken.create({
          data: {
            userId: user.id,
            tokenHash: tokenHash(code),
            kind: "EMAIL_VERIFICATION",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        }),
      ]);
      await sendVerificationCodeEmail(parsed.data.email, code);
      return NextResponse.json({
        success: true,
        message: "Email updated. A new code has been sent.",
        email: parsed.data.email,
      });
    } catch {
      return safe("Unable to update your email.", 500);
    }
  }

  if (action === "resend-verification") {
    const token = request.cookies.get(sessionCookie)?.value;
    if (!token) return safe("Please sign in again.", 401);
    try {
      const session = await verifySession(token);
      const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
      if (user.emailVerifiedAt) return NextResponse.json({ success: true });
      const code = verificationCode();
      await db.apiToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(code),
          kind: "EMAIL_VERIFICATION",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      await sendVerificationCodeEmail(user.email, code);
      return NextResponse.json({ success: true });
    } catch {
      return safe("Unable to send a new verification code.", 500);
    }
  }
  if (action === "forgot-password") {
    const parsed = z.object({ email: z.string().email() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: true });
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const raw = randomBytes(32).toString("hex");
      await db.apiToken.create({
        data: {
          userId: user.id,
          tokenHash: tokenHash(raw),
          kind: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      await sendAuthEmail(
        user.email,
        "Reset your Servio password",
        "Reset your password",
        `${process.env.APP_URL}/reset-password?token=${raw}`,
        "Reset password",
      );
    }
    return NextResponse.json({ success: true });
  }
  if (action === "verify-email") {
    const parsed = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(body);
    const token = request.cookies.get(sessionCookie)?.value;
    if (!parsed.success || !token) return safe("Enter the 6-digit verification code.");
    try {
      const session = await verifySession(token);
      const verification = await db.apiToken.findFirst({
        where: {
          userId: session.userId,
          tokenHash: tokenHash(parsed.data.code),
          kind: "EMAIL_VERIFICATION",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!verification) return safe("That verification code is invalid or has expired.");
      await db.$transaction([
        db.apiToken.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
        db.user.update({ where: { id: session.userId }, data: { emailVerifiedAt: new Date() } }),
      ]);
      return NextResponse.json({
        success: true,
        redirect: session.role === "CLIENT" ? "/client-profile" : "/professional/setup",
      });
    } catch {
      return safe("Unable to verify your email.", 500);
    }
  }
  if (action === "reset-password") {
    const parsed = z
      .object({
        token: z.string().min(32),
        password: action === "reset-password" ? z.string().min(8) : z.undefined().optional(),
      })
      .safeParse(body);
    if (!parsed.success) return safe("Invalid or expired link.");
    const token = await db.apiToken.findFirst({
      where: {
        tokenHash: tokenHash(parsed.data.token),
        kind: "PASSWORD_RESET",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!token) return safe("Invalid or expired link.");
    await db.$transaction([
      db.apiToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      db.user.update({
        where: { id: token.userId },
        data: { passwordHash: await bcrypt.hash(parsed.data.password!, 12) },
      }),
    ]);
    return NextResponse.json({ success: true });
  }
  return safe("Not found", 404);
}
