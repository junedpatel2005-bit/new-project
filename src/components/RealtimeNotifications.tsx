"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

type RealtimeNotification = {
  type: string;
  title: string;
  description: string;
  href?: string;
};

export function RealtimeNotifications() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }
    const socket = io({
      path: "/api/realtime",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    const onNotification = (notification: RealtimeNotification) => {
      toast(notification.title, { description: notification.description });
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        const browserNotification = new Notification(notification.title, {
          body: notification.description,
          tag: notification.type,
        });
        browserNotification.onclick = () => {
          window.focus();
          if (notification.href) window.location.assign(notification.href);
          browserNotification.close();
        };
      }
      window.dispatchEvent(new CustomEvent("servio:notification"));
    };
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
      socket.disconnect();
    };
  }, []);

  return null;
}
