"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

const markerIcon = L.divIcon({
  className: "",
  html: '<div style="font-size:28px">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export default function LeafletAddressMap({
  point,
  onPointChange,
}: {
  point: [number, number];
  onPointChange: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pointChangeRef = useRef(onPointChange);
  const initialPointRef = useRef(point);

  useEffect(() => {
    pointChangeRef.current = onPointChange;
  }, [onPointChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const initialPoint = initialPointRef.current;
    const map = L.map(container, { scrollWheelZoom: true }).setView(initialPoint, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.marker(initialPoint, { draggable: true, icon: markerIcon }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      pointChangeRef.current(event.latlng.lat, event.latlng.lng);
    });
    marker.on("dragend", () => {
      const selectedPoint = marker.getLatLng();
      pointChangeRef.current(selectedPoint.lat, selectedPoint.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng(point);
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 12));
  }, [point]);

  return <div ref={containerRef} className="h-64 w-full rounded-lg border" />;
}
