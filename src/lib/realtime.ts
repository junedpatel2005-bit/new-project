import "server-only";

export type RealtimeNotification = {
  type: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

type RealtimeServer = {
  to(room: string): { emit(event: "notification:new", payload: RealtimeNotification): void };
};

declare global {
  var __servioIo: RealtimeServer | undefined;
}

export function emitRealtimeNotification(
  userIds: number[],
  notification: Omit<RealtimeNotification, "createdAt">,
) {
  const io = globalThis.__servioIo;
  if (!io) return;
  const payload = { ...notification, createdAt: new Date().toISOString() };
  for (const userId of userIds) io.to(`user:${userId}`).emit("notification:new", payload);
}
