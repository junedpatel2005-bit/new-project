"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

type RealtimeNotification = { title: string; description: string };

export function RealtimeNotifications() {
  useEffect(() => {
    const socket = io({
      path: "/api/realtime",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
    });
    const onNotification = (notification: RealtimeNotification) => {
      toast(notification.title, { description: notification.description });
      window.dispatchEvent(new CustomEvent("servio:notification"));
    };
    const onConnectError = () => {
      socket.disconnect();
    };
    socket.on("notification:new", onNotification);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);

  return null;
}
