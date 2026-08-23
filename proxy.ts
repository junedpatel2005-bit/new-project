import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie, verifySession } from "@/lib/auth";
import { db } from "@/lib/db";

function isTrustedStateChangingRequest(request: NextRequest) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  if (origin === request.nextUrl.origin) return true;

  const appUrl = process.env.APP_URL;
  return appUrl ? origin === appUrl : false;
}

function isAuthenticatedPage(pathname: string) {
  const protectedPrefixes = [
    "/dashboard",
    "/discover",
    "/messages",
    "/my-jobs",
    "/post-job",
    "/reports",
    "/earnings",
    "/notifications",
    "/professional",
    "/professional-profile",
    "/professional-home/dashboard",
    "/client-profile",
    "/my-info",
    "/project",
  ];

  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Adds a correlation id that API handlers can include in structured server logs
 * and clients can provide when reporting a failed request.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !isTrustedStateChangingRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  // Every /admin/* page (besides the login screen itself) requires an ADMIN session.
  // Individual admin pages render as client components with no server-side guard of
  // their own, so this is the only place that stops a signed-out visitor from loading
  // the admin shell directly.
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    request.nextUrl.pathname !== "/admin/login"
  ) {
    const token = request.cookies.get(sessionCookie)?.value;
    let authorized = false;
    if (token) {
      try {
        authorized = (await verifySession(token)).role === "ADMIN";
      } catch {
        authorized = false;
      }
    }
    if (!authorized) return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Do this check at the edge before protected pages render. This prevents a
  // copied authenticated URL from loading a client shell in a browser that has
  // no valid session cookie.
  const pathname = request.nextUrl.pathname;
  if (!request.nextUrl.pathname.startsWith("/api/") && isAuthenticatedPage(pathname)) {
    const token = request.cookies.get(sessionCookie)?.value;
    let authorized = false;
    if (token) {
      try {
        await verifySession(token);
        authorized = true;
      } catch {
        authorized = false;
      }
    }
    if (!authorized) return NextResponse.redirect(new URL("/login", request.url));
  }

  // Keep authenticated but unverified clients/professionals in the email
  // verification flow, including when they open a page in a new tab.
  const verificationExempt = [
    "/login",
    "/signup",
    "/verify",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!pathname.startsWith("/api/") && !verificationExempt && !pathname.startsWith("/admin")) {
    const token = request.cookies.get(sessionCookie)?.value;
    if (token) {
      try {
        const session = await verifySession(token);
        if (session.role !== "ADMIN") {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { emailVerifiedAt: true, isActive: true },
          });
          if (!user?.isActive) return NextResponse.redirect(new URL("/login", request.url));
          if (!user.emailVerifiedAt) return NextResponse.redirect(new URL("/verify", request.url));
        }
      } catch {
        // Invalid sessions are handled by the destination page/API.
      }
    }
  }

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
