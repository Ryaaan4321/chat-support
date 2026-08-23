import { prisma } from '../../lib/prisma';
import { claimAgentForChat, claimChatForAgent } from '../../repositories/agent.repositories';
import { describe, it, expect,afterEach,jest,afterAll } from '@jest/globals';
describe('assignment engine — concurrency', () => {
  afterEach(async () => {
    await prisma.chat.deleteMany();
    await prisma.agent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('does not double-assign when two chats arrive simultaneously with one free slot', async () => {
    const agent = await prisma.agent.create({
      data: {
        name: 'Race Agent',
        email: 'race1@test.com',
        shiftStatus: 'AVAILABLE',
        chatCapacity: 1,
        activeChatCount: 0,
      },
    });
    const chat1 = await prisma.chat.create({ data: { customerId: 'r1', status: 'WAITING' } });
    const chat2 = await prisma.chat.create({ data: { customerId: 'r2', status: 'WAITING' } });
    const [result1, result2] = await Promise.all([
      claimAgentForChat(chat1.id),
      claimAgentForChat(chat2.id),
    ]);

    const assignedCount = [result1, result2].filter(
      (r) => r?.assignedAgentId === agent.id
    ).length;

    expect(assignedCount).toBe(1); 
    const dbAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
    const activeChatsInDb = await prisma.chat.count({
      where: { assignedAgentId: agent.id, status: 'ACTIVE' },
    });
    expect(dbAgent?.activeChatCount).toBe(activeChatsInDb);
  }, 15000);

  it('load test: 20 concurrent chats across 5 agents never oversubscribes capacity', async () => {
    const agents = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.agent.create({
          data: {
            name: `Load Agent ${i}`,
            email: `load${i}@test.com`,
            shiftStatus: 'AVAILABLE',
            chatCapacity: 2,
            activeChatCount: 0,
          },
        })
      )
    );
    const chats = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        prisma.chat.create({ data: { customerId: `load-c${i}`, status: 'WAITING' } })
      )
    );
    await Promise.all(chats.map((chat) => claimAgentForChat(chat.id)));

    const activeChats = await prisma.chat.count({ where: { status: 'ACTIVE' } });
    expect(activeChats).toBe(10);
    for (const agent of agents) {
      const dbAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
      const realCount = await prisma.chat.count({
        where: { assignedAgentId: agent.id, status: 'ACTIVE' },
      });
      expect(dbAgent?.activeChatCount).toBe(realCount);
      expect(dbAgent?.activeChatCount).toBeLessThanOrEqual(2);
    }
  }, 20000);
});