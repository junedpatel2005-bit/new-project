"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { ProfessionalDiscoveryResult } from "@/lib/types/professional-discovery";

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-lg">📍</div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

export default function ProfessionalsPreviewMap({
  professionals,
}: {
  professionals: ProfessionalDiscoveryResult[];
}) {
  const points = professionals
    .map((professional) => professional.displayPoint)
    .filter((point): point is { lat: number; lng: number } => Boolean(point));
  const center = points[0] ?? { lat: 37.7749, lng: -122.4194 };
  const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <div className="pointer-events-none h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={points.length > 1 ? 5 : 9}
        bounds={bounds.length > 1 ? bounds : undefined}
        boundsOptions={{ padding: [20, 20] }}
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
        {points.map((point, index) => (
          <Marker key={index} position={[point.lat, point.lng]} icon={markerIcon} />
        ))}
      </MapContainer>
    </div>
  );
}
