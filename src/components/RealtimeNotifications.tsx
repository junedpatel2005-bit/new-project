"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

type RealtimeNotification = {
  id?: number;
  type: string;
  title: string;
  description: string;
  href?: string;
  createdAt?: string;
  readAt?: string | null;
};

export function RealtimeNotifications() {
  const [userId, setUserId] = useState<number | null>(null);
  const seenNotifications = useRef(new Set<string>());
  const notificationsInitialized = useRef(false);

  const showNotification = useCallback((notification: RealtimeNotification) => {
    toast(notification.title, {
      description: notification.description,
      action: notification.href
        ? { label: "Open", onClick: () => window.location.assign(notification.href!) }
        : undefined,
    });
    window.dispatchEvent(new CustomEvent("servio:notification"));
  }, []);

  const notificationKey = (notification: RealtimeNotification) =>
    [notification.type, notification.title, notification.description, notification.href].join("|");

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { id?: number | string } }) =>
        setUserId(data.user?.id ? Number(data.user.id) : null),
      )
      .catch(() => setUserId(null));

    const loadMissed = async (showNew = false) => {
      try {
        const response = await fetch("/api/portal/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const notifications = (await response.json()) as RealtimeNotification[];
        for (const notification of notifications) {
          const key =
            notification.id != null ? `id:${notification.id}` : notificationKey(notification);
          const isNew = !seenNotifications.current.has(key);
          seenNotifications.current.add(key);
          if (showNew && isNew && !notification.readAt) {
            showNotification(notification);
          }
        }
        // Historical unread notifications belong in the inbox and badge. They
        // are added to the seen set but are not replayed on the initial load.
        notificationsInitialized.current = true;
        window.dispatchEvent(new CustomEvent("servio:notification"));
      } catch {
        // The inbox remains available if the background refresh is unavailable.
      }
    };

    void loadMissed();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && notificationsInitialized.current) {
        void loadMissed(true);
      }
    }, 15000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadMissed();
    };
    const onFocus = () => void loadMissed(true);
    window.addEventListener("focus", onFocus);
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
      const key = notification.id != null ? `id:${notification.id}` : notificationKey(notification);
      if (seenNotifications.current.has(key)) return;
      seenNotifications.current.add(key);
      showNotification(notification);
    };
    const onMessage = (message: { receiverId?: number }) => {
      if (message.receiverId !== userId) return;
      window.dispatchEvent(new CustomEvent("servio:message"));
    };
    const onProject = (payload?: unknown) => {
      window.dispatchEvent(new CustomEvent("servio:project-update", { detail: payload }));
    };
    const onProposal = (payload?: unknown) => {
      window.dispatchEvent(new CustomEvent("servio:proposal", { detail: payload }));
      window.dispatchEvent(new CustomEvent("servio:notification"));
    };
    socket.on("notification:new", onNotification);
    socket.on("message:new", onMessage);
    socket.on("project:updated", onProject);
    socket.on("proposal:new", onProposal);
    return () => {
      socket.off("notification:new", onNotification);
      socket.off("message:new", onMessage);
      socket.off("project:updated", onProject);
      socket.off("proposal:new", onProposal);
      socket.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [showNotification, userId]);

  return null;
}
