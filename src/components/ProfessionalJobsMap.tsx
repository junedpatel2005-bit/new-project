"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

type MapJob = {
  id: number;
  title: string;
  locationAddress: string | null;
  locationLat: number;
  locationLng: number;
};

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-2xl">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 6);
  }, [center, map]);

  return null;
}

export default function ProfessionalJobsMap({
  center,
  jobs,
  onSelectJob,
}: {
  center: [number, number];
  jobs: MapJob[];
  onSelectJob: (id: number) => void;
}) {
  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom className="h-full w-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterController center={center} />
      {jobs.map((job) => (
        <Marker
          key={job.id}
          position={[job.locationLat, job.locationLng]}
          icon={markerIcon}
          eventHandlers={{ click: () => onSelectJob(job.id) }}
        >
          <Popup>
            <div className="max-w-[220px]">
              <strong className="block text-sm">{job.title}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {job.locationAddress ?? "Remote"}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
