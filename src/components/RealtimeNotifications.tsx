"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

type RealtimeNotification = { title: string; description: string };

export function RealtimeNotifications() {
  useEffect(() => {
    const socket = io({ path: "/api/realtime", transports: ["websocket", "polling"] });
    const onNotification = (notification: RealtimeNotification) => {
      toast(notification.title, { description: notification.description });
      window.dispatchEvent(new CustomEvent("servio:notification"));
    };
    socket.on("notification:new", onNotification);
    return () => {
      socket.disconnect();
    };
  }, []);

  return null;
}
