import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { createRealtimeServer } from '../../src/server';
import { prisma } from '../../lib/prisma';
import {createTestAgent} from '../integration/db.helpers'
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/socket.event.types';

let httpServer: ReturnType<typeof createRealtimeServer>['httpServer'];
let baseUrl: string;

function connectClient(role: 'AGENT' | 'CUSTOMER' | 'MANAGER', userId: string) {
  return ioClient(baseUrl, {
    auth: { token: 'test-token', role, userId },
    transports: ['websocket'],
    forceNew: true,
  }) as ClientSocket<ServerToClientEvents, ClientToServerEvents>;
}

function waitFor<T = any>(socket: ClientSocket<any, any>, event: string, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for "${event}"`));
    }, timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

beforeAll(async () => {
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.agent.deleteMany();
  const created = createRealtimeServer();
  httpServer = created.httpServer;
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  await new Promise((r) => setTimeout(r, 500));
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.agent.deleteMany();
});

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 500));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await prisma.$disconnect();
}, 45000);

describe('chat socket — concurrency', () => {
  it('does not double-assign when two chat:new events arrive simultaneously with one free slot', async () => {
    const agent = await createTestAgent({ capacity: 1 });
    const agentSocket = connectClient('AGENT', agent.id);
    const customerA = connectClient('CUSTOMER', `race-a-${agent.id}`);
    const customerB = connectClient('CUSTOMER', `race-b-${agent.id}`);
    try {
      await waitFor(agentSocket, 'connect');
      await Promise.all([waitFor(customerA, 'connect'), waitFor(customerB, 'connect')]);

      const outcomeA = Promise.race([
        waitFor<any>(customerA, 'chat:assigned').then((p) => ({ type: 'assigned', payload: p })),
        waitFor<any>(customerA, 'chat:queued').then((p) => ({ type: 'queued', payload: p })),
      ]);
      const outcomeB = Promise.race([
        waitFor<any>(customerB, 'chat:assigned').then((p) => ({ type: 'assigned', payload: p })),
        waitFor<any>(customerB, 'chat:queued').then((p) => ({ type: 'queued', payload: p })),
      ]);

      customerA.emit('chat:new', { customerId: `race-a-${agent.id}` });
      customerB.emit('chat:new', { customerId: `race-b-${agent.id}` });

      const [resultA, resultB] = await Promise.all([outcomeA, outcomeB]);
      const assignedCount = [resultA, resultB].filter((r) => r.type === 'assigned').length;
      expect(assignedCount).toBe(1);

      const dbAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
      expect(dbAgent.activeChatCount).toBe(1);
    } finally {
      agentSocket.disconnect();
      customerA.disconnect();
      customerB.disconnect();
    }
  });

  it('sum(activeChatCount) matches count of active chats under load through sockets', async () => {
    const agents = await Promise.all([1, 2, 1, 3, 2].map((capacity) => createTestAgent({ capacity })));
    const customers = Array.from({ length: 20 }, (_, i) => connectClient('CUSTOMER', `load-${i}-${Date.now()}`));

    try {
      await Promise.all(customers.map((c) => waitFor(c, 'connect')));

      const outcomes = customers.map((c) =>
        Promise.race([
          waitFor<any>(c, 'chat:assigned').then((p) => ({ type: 'assigned', payload: p })),
          waitFor<any>(c, 'chat:queued').then((p) => ({ type: 'queued', payload: p })),
        ])
      );

      customers.forEach((c, i) => c.emit('chat:new', { customerId: `load-${i}` }));

      await Promise.all(outcomes);

      const dbAgents = await prisma.agent.findMany({ where: { id: { in: agents.map((a) => a.id) } } });
      const sumActiveChatCount = dbAgents.reduce((sum, a) => sum + a.activeChatCount, 0);

      const activeChatsInDb = await prisma.chat.count({
        where: { assignedAgentId: { in: agents.map((a) => a.id) }, status: 'ACTIVE' },
      });

      expect(sumActiveChatCount).toBe(activeChatsInDb);
    } finally {
      customers.forEach((c) => c.disconnect());
    }
  }, 20000);
});