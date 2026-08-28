"use client";

import { Circle, GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useMemo } from "react";

function isMapsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) && process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_ENABLED !== "false";
}

export default function ProfessionalLocationMap({
  point,
}: {
  point: { lat: number; lng: number };
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const center = useMemo(() => ({ lat: point.lat, lng: point.lng }), [point.lat, point.lng]);

  if (!isMapsEnabled()) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
        Map preview is unavailable.
      </div>
    );
  }

  return (
    <div className="isolate h-64 w-full overflow-hidden rounded-xl border border-border">
      <LoadScript googleMapsApiKey={apiKey} loadingElement={<div className="h-64 w-full animate-pulse bg-muted" />}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={12}
          options={{
            disableDefaultUI: true,
            clickableIcons: false,
            scrollwheel: false,
            zoomControl: false,
          }}
        >
          <Circle center={center} radius={1200} options={{ strokeColor: "#2563eb", fillOpacity: 0.12 }} />
          <Marker position={center} />
        </GoogleMap>
      </LoadScript>
    </div>
  );
}