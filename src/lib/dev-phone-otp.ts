import "server-only";
import { randomBytes } from "crypto";
import { jwtVerify, SignJWT } from "jose";

const phoneVerificationCookie = "servio_phone_verification";
const proofLifetimeSeconds = 10 * 60;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

function normalisePhone(phone: string) {
  return phone.trim();
}

export async function createPhoneVerificationProof(phone: string) {
  return new SignJWT({ phone: normalisePhone(phone), purpose: "client-signup-phone" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomBytes(16).toString("hex"))
    .setExpirationTime(`${proofLifetimeSeconds}s`)
    .sign(secret);
}

export async function hasValidPhoneVerificationProof(token: string | undefined, phone: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (
      payload.purpose === "client-signup-phone" &&
      payload.phone === normalisePhone(phone) &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

export const phoneProofCookie = phoneVerificationCookie;
export const phoneProofCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: proofLifetimeSeconds,
};
