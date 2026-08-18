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
  const [searchStatus, setSearchStatus] = useState("");
  const [pinStatus, setPinStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  useEffect(() => {
    if (value.trim().length < 3) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      setSearchStatus("");
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const d = (await r.json()) as { results?: Result[]; error?: string };
        setResults(d.results ?? []);
        setSearchStatus(d.error ?? "");
      } catch (error) {
        setResults([]);
        setSearchStatus(
          error instanceof Error && error.name === "AbortError"
            ? "Address search timed out. You can still enter an address manually."
            : "Address search is unavailable. You can still enter an address manually.",
        );
      } finally {
        clearTimeout(timeout);
        setSearching(false);
        setSearched(true);
      }
    }, 650);
    return () => clearTimeout(t);
  }, [value]);
  async function resolve(lat: number, lon: number) {
    setPoint([lat, lon]);
    onCoordinatesChange?.(lat, lon);
    setPinStatus("Finding address…");
    try {
      const r = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      const d = (await r.json()) as { results?: Result[]; error?: string };
      if (d.results?.[0]) {
        onChange(d.results[0].address);
        setPinStatus("");
      } else setPinStatus(d.error ?? "Address not found for that point.");
    } catch {
      setPinStatus("Could not look up that location. You can still enter an address manually.");
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
      {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
      {!searching && results.length > 0 && (
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
                  setSearched(false);
                  setSearchStatus("");
                }}
              >
                {item.address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searching && searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {searchStatus ||
            "No matches found. You can drop a pin on the map or enter the address manually."}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Click or drag the pin on the map to set the exact job location.
      </p>
      <LeafletMap point={point} onPointChange={resolve} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => void resolve(p.coords.latitude, p.coords.longitude),
              () => setPinStatus("Location permission was not granted."),
            )
          }
        >
          Use my current location
        </Button>
        {pinStatus && <span className="text-sm text-muted-foreground">{pinStatus}</span>}
      </div>
      <p className="text-xs text-muted-foreground">© OpenStreetMap contributors</p>
    </div>
  );
}
