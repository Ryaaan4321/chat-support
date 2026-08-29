import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/socket.event.types';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';

export function createSocketClient(auth: SocketData & { token?: string }): TypedSocket {
  return io(SOCKET_URL, {
    auth: {
      token: auth.token ?? 'demo-token',
      role: auth.role,
      userId: auth.userId,
    },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}
