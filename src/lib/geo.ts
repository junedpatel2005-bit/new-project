import { createHash } from "crypto";

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function getDistanceBoundingBox(lat: number, distanceKm: number) {
  const latDelta = distanceKm / 111.32;
  const latRad = (lat * Math.PI) / 180;
  const lngDelta = distanceKm / (111.32 * Math.cos(latRad));
  return { latDelta, lngDelta };
}

export function createDisplayPoint(id: number, lat: number, lng: number): LatLng | null {
  const salt = process.env.GEO_OBFUSCATION_SALT;
  if (!salt || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const digest = createHash("sha256").update(`${id}:${salt}`).digest();
  const bearing = (digest.readUInt16BE(0) / 0xffff) * 360;
  const distanceMeters = 1200 + (digest.readUInt16BE(2) / 0xffff) * 800;
  const distanceKm = distanceMeters / 1000;
  const bearingRad = (bearing * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(distanceKm / EARTH_RADIUS_KM) +
      Math.cos(φ1) * Math.sin(distanceKm / EARTH_RADIUS_KM) * Math.cos(bearingRad),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(distanceKm / EARTH_RADIUS_KM) * Math.cos(φ1),
      Math.cos(distanceKm / EARTH_RADIUS_KM) - Math.sin(φ1) * Math.sin(φ2),
    );
  return { lat: (φ2 * 180) / Math.PI, lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180 };
}
