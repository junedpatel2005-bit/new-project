"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Tooltip, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { MapPin, Star } from "lucide-react";

type MapJob = {
  id: number;
  title: string;
  category?: string | null;
  status?: string;
  locationAddress: string | null;
  locationLat: number;
  locationLng: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  hourlyRate?: number | null;
  timingType?: string | null;
  clientName?: string | null;
  clientRating?: number;
  distanceKm?: number | null;
};

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="text-2xl">📍</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function budgetLabel(job: MapJob) {
  if (job.timingType === "HOURLY") {
    return job.hourlyRate == null ? "Rate not set" : `₹${job.hourlyRate.toLocaleString()}/hr`;
  }
  if (job.budgetMin == null && job.budgetMax == null) return "Budget on request";
  return `₹${job.budgetMin?.toLocaleString() ?? "—"} – ₹${job.budgetMax?.toLocaleString() ?? "—"}`;
}

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
    <MapContainer
      center={center}
      zoom={6}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full z-0"
    >
      <ZoomControl position="bottomright" />
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
          <Tooltip direction="right" offset={[12, -14]} opacity={1}>
            <div className="w-60 space-y-1.5 whitespace-normal break-words p-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {job.category ?? "General"}
                </span>
                {job.status ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {job.status}
                  </span>
                ) : null}
              </div>
              <p className="font-semibold text-foreground">{job.title}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {job.locationAddress ?? "Remote"}
                {job.distanceKm != null && ` · ${job.distanceKm.toFixed(1)} km away`}
              </div>
              {job.clientName ? (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{job.clientName}</span>
                  {job.clientRating != null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {job.clientRating.toFixed(1)}
                    </span>
                  )}
                </div>
              ) : null}
              <p className="text-sm font-semibold text-foreground">{budgetLabel(job)}</p>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
