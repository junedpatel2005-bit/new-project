"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

type RealtimeNotification = {
  type: string;
  title: string;
  description: string;
  href?: string;
};

export function RealtimeNotifications() {
  const shownIds = useRef(new Set<number>());
  const [userId, setUserId] = useState<number | null>(null);

  const showNotification = useCallback((notification: RealtimeNotification) => {
    toast(notification.title, {
      description: notification.description,
      action: notification.href
        ? { label: "Open", onClick: () => window.location.assign(notification.href!) }
        : undefined,
    });
    window.dispatchEvent(new CustomEvent("servio:notification"));
  }, []);

  useEffect(() => {
    void fetch("/api/v1/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { id?: number | string } }) =>
        setUserId(data.user?.id ? Number(data.user.id) : null),
      )
      .catch(() => setUserId(null));

    const loadMissed = async () => {
      try {
        const response = await fetch("/api/v1/portal/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const notifications = (await response.json()) as (RealtimeNotification & {
          id: number;
          readAt: string | null;
        })[];
        for (const notification of notifications.filter((item) => !item.readAt)) {
          if (shownIds.current.has(notification.id)) continue;
          shownIds.current.add(notification.id);
          showNotification(notification);
        }
        window.dispatchEvent(new CustomEvent("servio:notification"));
      } catch {
        // The inbox remains available if the background refresh is unavailable.
      }
    };

    void loadMissed();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadMissed();
    };
    window.addEventListener("focus", loadMissed);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const socket = io({
      path: "/api/realtime",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    const onNotification = (notification: RealtimeNotification) => {
      showNotification(notification);
    };
    const onMessage = (message: { receiverId?: number }) => {
      if (message.receiverId !== userId) return;
      window.dispatchEvent(new CustomEvent("servio:message"));
    };
    socket.on("notification:new", onNotification);
    socket.on("message:new", onMessage);
    return () => {
      socket.off("notification:new", onNotification);
      socket.off("message:new", onMessage);
      socket.disconnect();
      window.removeEventListener("focus", loadMissed);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [showNotification, userId]);

  return null;
}
