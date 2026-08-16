"use client";

import { Toaster } from "@/components/ui/sonner";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RealtimeNotifications />
      <Toaster position="bottom-right" closeButton richColors />
    </>
  );
}
