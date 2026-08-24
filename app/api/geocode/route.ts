import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const userKey = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

export async function GET(request: NextRequest) {
  if (!rateLimit(`geocode:${userKey(request)}`, 20, 60_000))
    return NextResponse.json({ error: "Please wait before searching again." }, { status: 429 });
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  if (!query && (!lat || !lon)) return NextResponse.json({ results: [] });
  const url = query
    ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}&email=support@servio.app`
    : `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat!)}&lon=${encodeURIComponent(lon!)}&email=support@servio.app`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Servio/1.0 (address picker; support@servio.app)" },
      next: { revalidate: 0 },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Geocoding service unavailable");
    const data = (await response.json()) as
      | Array<{
          display_name: string;
          lat: string;
          lon: string;
          address?: Record<string, string>;
        }>
      | { display_name: string; lat: string; lon: string; address?: Record<string, string> };
    const results = Array.isArray(data) ? data : [data];
    return NextResponse.json({
      results: results.map((item) => ({
        address: item.display_name,
        lat: Number(item.lat),
        lon: Number(item.lon),
        state: item.address?.state ?? null,
        district: item.address?.state_district ?? item.address?.district ?? null,
      })),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Address search timed out. Please try again or enter the address manually."
          : "Address search is unavailable. You can still enter an address manually.",
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
