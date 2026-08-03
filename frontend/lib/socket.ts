"use client";

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000";

export const SOCKET_EVENTS = {
  MACHINE_UPDATE: "machine_update",
  ALARM_UPDATE: "alarm_update",
  PRODUCTION_UPDATE: "production_update",
  DASHBOARD_UPDATE: "dashboard_update",
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

let socket: Socket | undefined;
let socketToken: string | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    socketToken = token ?? null;
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: socketToken ? { token: socketToken } : undefined,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = undefined;
  socketToken = null;
}
