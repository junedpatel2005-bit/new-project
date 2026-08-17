"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { ProfessionalDiscoveryResult } from "@/lib/types/professional-discovery";

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-lg">📍</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const fallbackCenter: [number, number] = [37.7749, -122.4194];

function FollowPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) map.setView(fallbackCenter, 9, { animate: false });
    else if (points.length === 1) map.setView(points[0] ?? fallbackCenter, 10, { animate: false });
    else map.fitBounds(points, { padding: [20, 20], animate: false });
  }, [points, map]);
  return null;
}

export default function ProfessionalsPreviewMap({
  professionals,
}: {
  professionals: ProfessionalDiscoveryResult[];
}) {
  const pinned = professionals
    .map((professional) => ({ id: professional.id, point: professional.displayPoint }))
    .filter(
      (entry): entry is { id: string; point: { lat: number; lng: number } } =>
        entry.point !== undefined,
    );
  const points = pinned.map((entry) => [entry.point.lat, entry.point.lng] as [number, number]);

  return (
    <div className="pointer-events-none h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={points[0] ?? fallbackCenter}
        zoom={9}
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
        <FollowPoints points={points} />
        {pinned.map((entry) => (
          <Marker key={entry.id} position={[entry.point.lat, entry.point.lng]} icon={markerIcon} />
        ))}
      </MapContainer>
    </div>
  );
}
