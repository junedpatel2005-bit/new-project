"use client";

import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";

export default function LeafletAddressMap({
  point,
  onPointChange,
}: {
  point: [number, number];
  onPointChange: (lat: number, lon: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const pointChangeRef = useRef(onPointChange);
  const initialPointRef = useRef(point);

  useEffect(() => {
    pointChangeRef.current = onPointChange;
  }, [onPointChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let disposed = false;
    void import("leaflet").then((leaflet) => {
      if (disposed || mapRef.current) return;

      const initialPoint = initialPointRef.current;
      const map = leaflet.map(container, { scrollWheelZoom: true }).setView(initialPoint, 5);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);
      const icon = leaflet.divIcon({
        className: "",
        html: '<div style="font-size:28px">📍</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const marker = leaflet.marker(initialPoint, { draggable: true, icon }).addTo(map);
      map.on("click", (event) => {
        marker.setLatLng(event.latlng);
        pointChangeRef.current(event.latlng.lat, event.latlng.lng);
      });
      marker.on("dragend", () => {
        const selectedPoint = marker.getLatLng();
        pointChangeRef.current(selectedPoint.lat, selectedPoint.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      disposed = true;
      markerRef.current = null;
      const map = mapRef.current;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng(point);
    mapRef.current.setView(point, Math.max(mapRef.current.getZoom(), 12));
  }, [point]);

  return <div ref={containerRef} className="h-64 w-full rounded-lg border" />;
}
