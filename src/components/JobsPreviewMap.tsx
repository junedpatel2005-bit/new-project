"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useMemo, useRef } from "react";

const worldFallbackCenter = { lat: 20, lng: 0 };

function isMapsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_ENABLED !== "false";
}

export default function JobsPreviewMap({
  points,
  fallbackCenter,
}: {
  points: [number, number][];
  fallbackCenter?: [number, number];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const center = useMemo(() => {
    if (fallbackCenter) return { lat: fallbackCenter[0], lng: fallbackCenter[1] };
    if (points[0]) return { lat: points[0][0], lng: points[0][1] };
    return worldFallbackCenter;
  }, [points, fallbackCenter]);

  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (points.length === 0) {
      map.setCenter(center);
      map.setZoom(4);
      return;
    }
    if (points.length === 1) {
      const first = points[0];
      if (first) {
        map.setCenter({ lat: first[0], lng: first[1] });
        map.setZoom(9);
      }
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds);
  }, [points, center]);

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
          center={center}
          zoom={points.length ? (points.length === 1 ? 9 : 4) : 4}
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
          {points.map((point, index) => (
            <Marker key={`${point[0]}-${point[1]}-${index}`} position={{ lat: point[0], lng: point[1] }} />
          ))}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}