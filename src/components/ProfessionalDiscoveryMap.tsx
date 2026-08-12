"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { ProfessionalDiscoveryResult } from "@/lib/types/professional-discovery";

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-2xl">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function FitBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length === 0) return;
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

function SelectedPointFocus({ point }: { point?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.flyTo([point.lat, point.lng], 12, { duration: 0.75 });
  }, [point, map]);
  return null;
}

export default function ProfessionalDiscoveryMap({
  professionals,
  selectedPoint,
}: {
  professionals: ProfessionalDiscoveryResult[];
  selectedPoint?: { lat: number; lng: number };
}) {
  const points = professionals
    .map((professional) => professional.displayPoint)
    .filter((point): point is { lat: number; lng: number } => Boolean(point));

  const initialPoint = points[0] ?? { lat: 37.7749, lng: -122.4194 };
  const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border">
      <MapContainer
        center={[initialPoint.lat, initialPoint.lng]}
        zoom={points.length > 0 ? 6 : 3}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {selectedPoint ? (
          <SelectedPointFocus point={selectedPoint} />
        ) : (
          bounds.length > 0 && <FitBounds bounds={bounds} />
        )}
        {professionals.map((professional) => {
          const point = professional.displayPoint;
          if (!point) return null;
          return (
            <Marker key={professional.id} position={[point.lat, point.lng]} icon={markerIcon}>
              <Popup>
                <div className="max-w-xs">
                  <strong>{professional.name}</strong>
                  <div className="text-sm text-muted-foreground">{professional.title}</div>
                  {professional.location && <div className="text-sm">{professional.location}</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
