"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

type MapJob = {
  id: number;
  title: string;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
};

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
      {jobs.map((job) => {
        const lat = job.locationLat ?? 43.7;
        const lng = job.locationLng ?? -79.38;
        return (
          <Marker
            key={job.id}
            position={[lat, lng]}
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
        );
      })}
    </MapContainer>
  );
}
