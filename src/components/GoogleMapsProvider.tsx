"use client";

import { createContext, useContext, useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

export const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

type GoogleMapsContextValue = { isLoaded: boolean; isConfigured: boolean };

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  isConfigured: false,
});

export function isGoogleMapsConfigured(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) &&
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_ENABLED !== "false"
  );
}

function GoogleMapsScriptLoader({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const value = useMemo(() => ({ isLoaded, isConfigured: true }), [isLoaded]);
  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
}

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  if (!isGoogleMapsConfigured()) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, isConfigured: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }
  return <GoogleMapsScriptLoader>{children}</GoogleMapsScriptLoader>;
}

export function useGoogleMaps(): GoogleMapsContextValue {
  return useContext(GoogleMapsContext);
}
