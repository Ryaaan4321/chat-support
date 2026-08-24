import { prisma } from '../../lib/prisma';
import { claimAgentForChat, claimChatForAgent } from '../../src/repositories/agent.repositories';
import { describe, it, expect,afterEach,jest,afterAll } from '@jest/globals';
describe('assignment engine — integration', () => {
  afterEach(async () => {
    await prisma.chat.deleteMany();
    await prisma.agent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('leaves chat WAITING when no agents are available', async () => {
    const chat = await prisma.chat.create({ data: { customerId: 'c1', status: 'WAITING' } });

    const result = await claimAgentForChat(chat.id);

    expect(result).toBeNull();
    const dbChat = await prisma.chat.findUnique({ where: { id: chat.id } });
    expect(dbChat?.status).toBe('WAITING');
  });

  it('does not select an agent already at capacity', async () => {
    await prisma.agent.create({
      data: { name: 'A1', email: 'a1@test.com', shiftStatus: 'AVAILABLE', chatCapacity: 1, activeChatCount: 1 },
    });
    const chat = await prisma.chat.create({ data: { customerId: 'c2', status: 'WAITING' } });

    const result = await claimAgentForChat(chat.id);

    expect(result).toBeNull();
  });

  it('assigns when an agent has a free slot', async () => {
    const agent = await prisma.agent.create({
      data: { name: 'A2', email: 'a2@test.com', shiftStatus: 'AVAILABLE', chatCapacity: 2, activeChatCount: 0 },
    });
    const chat = await prisma.chat.create({ data: { customerId: 'c3', status: 'WAITING' } });

    const result = await claimAgentForChat(chat.id);

    expect(result?.assignedAgentId).toBe(agent.id);
    const updatedAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
    expect(updatedAgent?.activeChatCount).toBe(1);
  });

  it('reflects capacity increase making an agent eligible again', async () => {
    const agent = await prisma.agent.create({
      data: { name: 'A3', email: 'a3@test.com', shiftStatus: 'AVAILABLE', chatCapacity: 1, activeChatCount: 1 },
    });
    const chat = await prisma.chat.create({ data: { customerId: 'c4', status: 'WAITING' } });
    expect(await claimAgentForChat(chat.id)).toBeNull();
    await prisma.agent.update({ where: { id: agent.id }, data: { chatCapacity: 2 } });

    const result = await claimAgentForChat(chat.id);
    expect(result?.assignedAgentId).toBe(agent.id);
  });
});