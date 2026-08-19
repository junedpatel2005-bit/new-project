"use client";

import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer } from "react-leaflet";

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-2xl">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export default function ProfessionalLocationMap({
  point,
}: {
  point: { lat: number; lng: number };
}) {
  return (
    <div className="isolate h-64 w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[point.lat, point.lng]}
        zoom={12}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[point.lat, point.lng]}
          radius={1200}
          pathOptions={{ color: "#2563eb", fillOpacity: 0.12 }}
        />
        <Marker position={[point.lat, point.lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
