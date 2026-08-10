"use client";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
const markerIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:28px">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});
function Recenter({ point }: { point: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(point, 15);
  }, [map, point]);
  return null;
}
function Clicker({ onPointChange }: { onPointChange: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPointChange(e.latlng.lat, e.latlng.lng) });
  return null;
}
export default function LeafletAddressMap({
  point,
  onPointChange,
}: {
  point: [number, number];
  onPointChange: (lat: number, lon: number) => void;
}) {
  return (
    <MapContainer center={point} zoom={5} scrollWheelZoom className="h-64 w-full rounded-lg border">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter point={point} />
      <Clicker onPointChange={onPointChange} />
      <Marker
        position={point}
        icon={markerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = e.target.getLatLng();
            onPointChange(p.lat, p.lng);
          },
        }}
      />
    </MapContainer>
  );
}
