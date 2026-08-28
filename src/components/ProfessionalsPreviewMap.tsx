"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useRef } from "react";
import type { ProfessionalDiscoveryResult } from "@/lib/types/professional-discovery";

const fallbackCenter = { lat: 37.7749, lng: -122.4194 };

function isMapsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_ENABLED !== "false";
}

export default function ProfessionalsPreviewMap({
  professionals,
}: {
  professionals: ProfessionalDiscoveryResult[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const pinned = professionals
    .map((professional) => ({ id: professional.id, point: professional.displayPoint }))
    .filter(
      (entry): entry is { id: string; point: { lat: number; lng: number } } => entry.point !== undefined,
    );
  const points = pinned.map((entry) => entry.point);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length === 0) {
      map.setCenter(fallbackCenter);
      map.setZoom(9);
      return;
    }
    if (points.length === 1) {
      const first = points[0];
      if (first) {
        map.setCenter(first);
        map.setZoom(10);
      }
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds);
  }, [points]);

  if (!isMapsEnabled()) {
    return (
      <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-muted text-sm text-muted-foreground">
        Map preview is unavailable.
      </div>
    );
  }

  return (
    <div className="pointer-events-none h-full w-full overflow-hidden rounded-xl">
      <LoadScript googleMapsApiKey={apiKey} loadingElement={<div className="h-full w-full animate-pulse bg-muted" />}>
        <GoogleMap
          onLoad={(map) => {
            mapRef.current = map;
          }}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={points[0] ?? fallbackCenter}
          zoom={9}
          options={{
            disableDefaultUI: true,
            clickableIcons: false,
            gestureHandling: "none",
            zoomControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            keyboardShortcuts: false,
          }}
        >
          {pinned.map((entry) => (
            <Marker key={entry.id} position={entry.point} />
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}