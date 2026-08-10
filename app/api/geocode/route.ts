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
    ? `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`
    : `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat!)}&lon=${encodeURIComponent(lon!)}`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Servio/1.0 (address picker)" },
      next: { revalidate: 0 },
    });
    if (!response.ok) throw new Error("Geocoding service unavailable");
    const data = (await response.json()) as
      | Array<{ display_name: string; lat: string; lon: string }>
      | { display_name: string; lat: string; lon: string };
    const results = Array.isArray(data) ? data : [data];
    return NextResponse.json({
      results: results.map((item) => ({
        address: item.display_name,
        lat: Number(item.lat),
        lon: Number(item.lon),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Address search is unavailable. You can still enter an address manually." },
      { status: 503 },
    );
  }
}
