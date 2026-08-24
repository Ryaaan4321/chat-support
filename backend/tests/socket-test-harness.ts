import { describe, it, expect,afterEach,jest } from '@jest/globals';
type Handler = (...args: any[]) => any;

export function makeFakeSocket(data: { role: string; userId: string }) {
  const handlers: Record<string, Handler> = {};
  const socket = {
    id: 'fake-socket-id',
    data,
    on: jest.fn((event: string, handler: Handler) => {
      handlers[event] = handler;
    }),
    join: jest.fn(),
    emit: jest.fn(),
  };
  return { socket, handlers };
}
export function makeFakeIo() {
  const toEmitters: Record<string, { emit: jest.Mock }> = {};
  const inRooms: Record<string, { socketsJoin: jest.Mock }> = {};
  const io = {
    to: jest.fn((room: string) => {
      if (!toEmitters[room]) toEmitters[room] = { emit: jest.fn() };
      return toEmitters[room];
    }),
    in: jest.fn((room: string) => {
      if (!inRooms[room]) inRooms[room] = { socketsJoin: jest.fn() };
      return inRooms[room];
    }),
  };
  return { io, toEmitters, inRooms };
}