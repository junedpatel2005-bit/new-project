import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/generated/prisma/client";
import { db } from "./db";

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) throw new Error("AUTH_SECRET is required.");
const secret = new TextEncoder().encode(authSecret);
export const sessionCookie = "servio_session";
export type Session = { userId: number; role: UserRole; emailVerifiedAt?: Date | null };
export async function createSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}
export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret);
  const userId = Number(payload.userId);
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Invalid session user.");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, emailVerifiedAt: true },
  });
  if (!user || !user.isActive) throw new Error("Inactive session user.");
  return {
    userId: user.id,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function requireAuthenticatedUser(token: string) {
  return verifySession(token);
}

export async function requireVerifiedUser(token: string) {
  const session = await verifySession(token);
  if (!session.emailVerifiedAt) throw new Error("Email verification required.");
  return session;
}
export const sessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
