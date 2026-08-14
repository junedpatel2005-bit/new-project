"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const LeafletMap = dynamic(() => import("@/components/LeafletAddressMap"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
});
type Result = { address: string; lat: number; lon: number };
export function AddressMapPicker({
  id,
  value,
  onChange,
  onCoordinatesChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onCoordinatesChange?: (latitude: number, longitude: number) => void;
}) {
  const [results, setResults] = useState<Result[]>([]);
  const [point, setPoint] = useState<[number, number]>([20.5937, 78.9629]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/geocode?q=${encodeURIComponent(value)}`);
        const d = (await r.json()) as { results?: Result[]; error?: string };
        setResults(d.results ?? []);
        if (d.error) setStatus(d.error);
      } catch {
        setStatus("Address search is unavailable. You can still enter an address manually.");
      }
    }, 650);
    return () => clearTimeout(t);
  }, [value]);
  async function resolve(lat: number, lon: number) {
    setPoint([lat, lon]);
    onCoordinatesChange?.(lat, lon);
    setStatus("Finding address…");
    try {
      const r = await fetch(`/api/v1/geocode?lat=${lat}&lon=${lon}`);
      const d = (await r.json()) as { results?: Result[]; error?: string };
      if (d.results?.[0]) onChange(d.results[0].address);
      else setStatus(d.error ?? "Address not found.");
    } finally {
      setStatus("");
    }
  }
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={id}>Search or enter address</Label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start typing an address…"
          maxLength={300}
        />
      </div>
      {results.length > 0 && (
        <ul className="rounded-lg border bg-card">
          {results.map((item) => (
            <li key={`${item.lat}-${item.lon}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange(item.address);
                  setPoint([item.lat, item.lon]);
                  onCoordinatesChange?.(item.lat, item.lon);
                  setResults([]);
                }}
              >
                {item.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      <LeafletMap point={point} onPointChange={resolve} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => void resolve(p.coords.latitude, p.coords.longitude),
              () => setStatus("Location permission was not granted."),
            )
          }
        >
          Use my current location
        </Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>
      <p className="text-xs text-muted-foreground">© OpenStreetMap contributors</p>
    </div>
  );
}
