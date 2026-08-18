"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-lg">📍</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const worldFallbackCenter: [number, number] = [20, 0];

function FollowPoints({
  points,
  fallback,
}: {
  points: [number, number][];
  fallback: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) map.setView(fallback, 4, { animate: false });
    else if (points.length === 1) map.setView(points[0] ?? fallback, 9, { animate: false });
    else map.fitBounds(points, { padding: [20, 20], animate: false });
  }, [points, fallback, map]);
  return null;
}

export default function JobsPreviewMap({
  points,
  fallbackCenter,
}: {
  points: [number, number][];
  fallbackCenter?: [number, number];
}) {
  const center = fallbackCenter ?? worldFallbackCenter;

  return (
    <div className="pointer-events-none h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={points[0] ?? center}
        zoom={points.length ? 9 : 4}
        zoomAnimation={false}
        markerZoomAnimation={false}
        fadeAnimation={false}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FollowPoints points={points} fallback={center} />
        {points.map((point, index) => (
          <Marker key={`${point[0]}-${point[1]}-${index}`} position={point} icon={markerIcon} />
        ))}
      </MapContainer>
    </div>
  );
}
