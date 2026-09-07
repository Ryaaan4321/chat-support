import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.event.types';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = 'https://chat-support-dips.onrender.com';

let activeSocket: TypedSocket | null = null;
let activeAuthKey: string | null = null;

export function createSocketClient(auth: SocketData & { token?: string }): TypedSocket {
  const authKey = `${auth.role}:${auth.userId}`;
  if (activeSocket && activeAuthKey === authKey && activeSocket.connected) {
    return activeSocket;
  }

  if (activeSocket) {
    activeSocket.disconnect();
  }

  const cleanSocketUrl = (SOCKET_URL || '').replace(/\/+$/, '');
  activeSocket = io(cleanSocketUrl, {
    auth: {
      token: auth.token || '',
      role: auth.role,
      userId: auth.userId,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  activeAuthKey = authKey;
  return activeSocket;
}

export function getActiveSocket(): TypedSocket | null {
  return activeSocket;
}

export function disconnectActiveSocket(): void {
  if (activeSocket) {
    activeSocket.disconnect();
    activeSocket = null;
    activeAuthKey = null;
  }
}
