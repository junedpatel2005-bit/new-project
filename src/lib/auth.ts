import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/generated/prisma/client";

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) throw new Error("AUTH_SECRET is required.");
const secret = new TextEncoder().encode(authSecret);
export const sessionCookie = "servio_session";
export type Session = { userId: number; role: UserRole };
export async function createSession(session: Session) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}
export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return { userId: Number(payload.userId), role: payload.role as UserRole };
}
export const sessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};
