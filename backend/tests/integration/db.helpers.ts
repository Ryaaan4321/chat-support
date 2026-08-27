import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';

type ShiftStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'SHIFT_ENDED';

export async function createTestAgent(overrides: {
  capacity?: number;
  activeChatCount?: number;
  shiftStatus?: ShiftStatus;
} = {}) {
  return prisma.agent.create({
    data: {
      name: `Test Agent ${randomUUID().slice(0, 8)}`,
      email: `agent-${randomUUID()}@test.local`,
      chatCapacity: overrides.capacity ?? 2,
      activeChatCount: overrides.activeChatCount ?? 0,
      shiftStatus: overrides.shiftStatus ?? 'AVAILABLE',
      lastSeenAt: new Date(),
    },
  });
}

export async function createTestChat(customerId: string) {
  return prisma.chat.create({ data: { customerId } });
}

export async function cleanupTestData(agentIds: string[], chatIds: string[]) {
  if (chatIds.length) {
    await prisma.message.deleteMany({ where: { chatId: { in: chatIds } } });
    await prisma.chat.deleteMany({ where: { id: { in: chatIds } } });
  }
  if (agentIds.length) {
    await prisma.agent.deleteMany({ where: { id: { in: agentIds } } });
  }
}