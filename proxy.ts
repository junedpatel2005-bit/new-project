import { NextResponse, type NextRequest } from "next/server";

function isTrustedStateChangingRequest(request: NextRequest) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const appUrl = process.env.APP_URL;
  return appUrl ? origin === appUrl : origin === request.nextUrl.origin;
}

/**
 * Adds a correlation id that API handlers can include in structured server logs
 * and clients can provide when reporting a failed request.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !isTrustedStateChangingRequest(request)) {
    return NextResponse.json(
      { error: { code: "CSRF_REJECTED", message: "Request origin is not allowed." } },
      { status: 403 },
    );
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
