"use client";

import { Toaster } from "@/components/ui/sonner";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleMapsProvider>
      {children}
      <RealtimeNotifications />
      <Toaster position="bottom-right" closeButton richColors />
    </GoogleMapsProvider>
  );
}
