import { describe, it, expect, beforeAll, afterAll,afterEach } from '@jest/globals';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import type { AddressInfo } from 'net';
import { createRealtimeServer } from '../../src/server';
import { prisma } from '../../lib/prisma';
import { createTestAgent, createTestChat, cleanupTestData } from './db.helpers';
import type { ClientToServerEvents, ServerToClientEvents } from '../../types/socket.event.types';

let httpServer: ReturnType<typeof createRealtimeServer>['httpServer'];
let baseUrl: string;

const agentIdsToCleanup: string[] = [];
const chatIdsToCleanup: string[] = [];

function connectClient(role: 'AGENT' | 'CUSTOMER' | 'MANAGER', userId: string) {
  return ioClient(baseUrl, {
    auth: { token: 'test-token', role, userId },
    transports: ['websocket'],
    forceNew: true,
  }) as ClientSocket<ServerToClientEvents, ClientToServerEvents>;
}

function waitFor<T = any>(socket: ClientSocket<any, any>, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeAll(async () => {
  const created = createRealtimeServer();
  httpServer = created.httpServer;
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});



afterEach(async () => {
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.agent.deleteMany();
  agentIdsToCleanup.length = 0;
  chatIdsToCleanup.length = 0;
});

afterAll(async () => {
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await cleanupTestData(agentIdsToCleanup, chatIdsToCleanup);
  await prisma.$disconnect();
}, 45000);

describe('chat socket — integration', () => {
  it('assigns a new chat immediately when a slot is free', async () => {
    const agent = await createTestAgent({ capacity: 1 });
    agentIdsToCleanup.push(agent.id);

    const agentSocket = connectClient('AGENT', agent.id);
    const customerId = `cust-${agent.id}`;
    const customerSocket = connectClient('CUSTOMER', customerId);
    await Promise.all([waitFor(agentSocket, 'connect'), waitFor(customerSocket, 'connect')]);

    const assignedOnCustomer = waitFor<any>(customerSocket, 'chat:assigned');
    const assignedOnAgent = waitFor<any>(agentSocket, 'chat:assigned');

    customerSocket.emit('chat:new', { customerId });

    const [customerPayload, agentPayload] = await Promise.all([assignedOnCustomer, assignedOnAgent]);
    chatIdsToCleanup.push(customerPayload.chatId);

    expect(customerPayload.agentId).toBe(agent.id);
    expect(agentPayload.chatId).toBe(customerPayload.chatId);

    const dbAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
    expect(dbAgent.activeChatCount).toBe(1);

    agentSocket.disconnect();
    customerSocket.disconnect();
  });

  it('queues a chat when no agent has a free slot', async () => {
    const agent = await createTestAgent({ capacity: 1, activeChatCount: 1 });
    agentIdsToCleanup.push(agent.id);

    const customerId = `cust-${agent.id}`;
    const customerSocket = connectClient('CUSTOMER', customerId);
    await waitFor(customerSocket, 'connect');

    const queued = waitFor<any>(customerSocket, 'chat:queued');
    customerSocket.emit('chat:new', { customerId });

    const payload = await queued;
    chatIdsToCleanup.push(payload.chatId);
    expect(payload.chatId).toBeDefined();

    customerSocket.disconnect();
  });

  it('resyncs an existing chat on chat:rejoin for the owning customer', async () => {
    const agent = await createTestAgent({ capacity: 2 });
    agentIdsToCleanup.push(agent.id);
    const customerId = `cust-${agent.id}`;
    const chat = await createTestChat(customerId);
    chatIdsToCleanup.push(chat.id);
    await prisma.message.create({
      data: { chatId: chat.id, senderType: 'CUSTOMER', text: 'hello' },
    });

    const customerSocket = connectClient('CUSTOMER', customerId);
    await waitFor(customerSocket, 'connect');

    const sync = waitFor<any>(customerSocket, 'chat:sync');
    customerSocket.emit('chat:rejoin', { chatId: chat.id });
    const payload = await sync;

    expect(payload.chatId).toBe(chat.id);
    expect(payload.messages).toHaveLength(1);
    expect(payload.messages[0].text).toBe('hello');

    customerSocket.disconnect();
  });

  it('rejects chat:rejoin when the socket does not own the chat', async () => {
    const agent = await createTestAgent({ capacity: 2 });
    agentIdsToCleanup.push(agent.id);
    const chat = await createTestChat(`cust-${agent.id}`);
    chatIdsToCleanup.push(chat.id);

    const impostorSocket = connectClient('CUSTOMER', 'someone-else');
    await waitFor(impostorSocket, 'connect');

    const failed = waitFor<any>(impostorSocket, 'chat:rejoin_failed');
    impostorSocket.emit('chat:rejoin', { chatId: chat.id });
    const payload = await failed;

    expect(payload.chatId).toBe(chat.id);

    impostorSocket.disconnect();
  });

  it('closing a chat frees the agent and pulls the next queued chat', async () => {
    const agent = await createTestAgent({ capacity: 1 });
    agentIdsToCleanup.push(agent.id);

    const agentSocket = connectClient('AGENT', agent.id);
    await waitFor(agentSocket, 'connect');

    const firstCustomerId = `cust-a-${agent.id}`;
    const firstCustomer = connectClient('CUSTOMER', firstCustomerId);
    await waitFor(firstCustomer, 'connect');
    const firstAssigned = waitFor<any>(firstCustomer, 'chat:assigned');
    firstCustomer.emit('chat:new', { customerId: firstCustomerId });
    const firstPayload = await firstAssigned;
    chatIdsToCleanup.push(firstPayload.chatId);

    const secondCustomerId = `cust-b-${agent.id}`;
    const secondCustomer = connectClient('CUSTOMER', secondCustomerId);
    await waitFor(secondCustomer, 'connect');
    const queued = waitFor<any>(secondCustomer, 'chat:queued');
    secondCustomer.emit('chat:new', { customerId: secondCustomerId });
    const queuedPayload = await queued;
    chatIdsToCleanup.push(queuedPayload.chatId);

    const reassigned = waitFor<any>(agentSocket, 'chat:assigned');
    firstCustomer.emit('chat:closed', { chatId: firstPayload.chatId });
    const reassignedPayload = await reassigned;

    expect(reassignedPayload.chatId).toBe(queuedPayload.chatId);
    expect(reassignedPayload.agentId).toBe(agent.id);

    const dbAgent = await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } });
    expect(dbAgent.activeChatCount).toBe(1);

    agentSocket.disconnect();
    firstCustomer.disconnect();
    secondCustomer.disconnect();
  });
});