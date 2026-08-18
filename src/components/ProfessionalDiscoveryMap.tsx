"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Tooltip, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { BadgeCheck, MapPin, Star } from "lucide-react";
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
    if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

function SelectedPointFocus({ point }: { point?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], 12, { duration: 0.75 });
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
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />
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
              <Tooltip direction="right" offset={[12, -14]} opacity={1}>
                <div className="w-56 space-y-1.5 whitespace-normal break-words p-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{professional.name}</span>
                    {professional.verified && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{professional.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {professional.rating.toFixed(1)}
                      <span className="font-normal text-muted-foreground">
                        ({professional.reviewCount})
                      </span>
                    </span>
                    {professional.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {professional.location}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {professional.hourlyRate === null
                      ? "Contact for rate"
                      : `₹${professional.hourlyRate}/hr`}
                  </p>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
