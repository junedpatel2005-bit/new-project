"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useRef } from "react";

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "16rem",
};

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export default function GoogleAddressMap({
  point,
  onPointChange,
}: {
  point: [number, number];
  onPointChange: (lat: number, lon: number) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const enabled = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_ENABLED !== "false";
  const pointChangeRef = useRef(onPointChange);

  useEffect(() => {
    pointChangeRef.current = onPointChange;
  }, [onPointChange]);

  if (!apiKey || !enabled) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        Map preview is unavailable because Google Maps is not configured.
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={libraries} loadingElement={<div className="h-64 w-full animate-pulse rounded-lg bg-muted" />}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: point[0], lng: point[1] }}
        zoom={point ? 12 : 5}
        onClick={(event) => {
          if (event.latLng) {
            pointChangeRef.current(event.latLng.lat(), event.latLng.lng());
          }
        }}
      >
        <Marker
          position={{ lat: point[0], lng: point[1] }}
          draggable
          onDragEnd={(event) => {
            if (event.latLng) {
              pointChangeRef.current(event.latLng.lat(), event.latLng.lng());
            }
          }}
        />
      </GoogleMap>
    </LoadScript>
  );
}