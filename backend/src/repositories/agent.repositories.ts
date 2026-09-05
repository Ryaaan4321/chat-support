import { prisma } from '../../lib/prisma';
import { AgentIdRow, AgentCapacityRow, ChatIdRow } from '../../types/agent.types';

export async function claimAgentForChat(chatId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const [agent] = await tx.$queryRaw<AgentIdRow[]>`
          SELECT id
          FROM "Agent"
          WHERE "shiftStatus" = 'AVAILABLE'
            AND "activeChatCount" < "chatCapacity"
          ORDER BY "activeChatCount" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `;
        if (!agent) return null;
        await tx.agent.update({
          where: { id: agent.id },
          data: { activeChatCount: { increment: 1 } },
        });
        return tx.chat.update({
          where: { id: chatId },
          data: {
            assignedAgentId: agent.id,
            status: 'ACTIVE',
            assignedAt: new Date(),
          },
        });
      },
      { maxWait: 10000, timeout: 10000 }
    );
  } catch (err: any) {
    if (err.code === 'P2025') return null;
    throw err;
  }
}

export async function claimChatForAgent(agentId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const [agentRow] = await tx.$queryRaw<AgentCapacityRow[]>`
          SELECT id, "activeChatCount", "chatCapacity"
          FROM "Agent"
          WHERE id = ${agentId}
          FOR UPDATE
        `;
        if (!agentRow || agentRow.activeChatCount >= agentRow.chatCapacity) {
          return null;
        }
        const [chatRow] = await tx.$queryRaw<ChatIdRow[]>`
          SELECT id
          FROM "Chat"
          WHERE status = 'WAITING'
          ORDER BY "queuedAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `;
        if (!chatRow) return null;
        await tx.agent.update({
          where: { id: agentId },
          data: { activeChatCount: { increment: 1 } },
        });
        return tx.chat.update({
          where: { id: chatRow.id },
          data: {
            assignedAgentId: agentId,
            status: 'ACTIVE',
            assignedAt: new Date(),
          },
        });
      },
      { maxWait: 10000, timeout: 10000 }
    );
  } catch (err: any) {
    if (err.code === 'P2025') return null;
    throw err;
  }
}

export async function closeChatAndRelease(chatId: string): Promise<{ agentId: string | null }> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const chat = await tx.chat.findUnique({
          where: { id: chatId },
        });

        if (!chat || chat.status === 'CLOSED') {
          return { agentId: null };
        }

        await tx.chat.update({
          where: { id: chatId },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
          },
        });

        if (chat.assignedAgentId && chat.status === 'ACTIVE') {
          await tx.agent.update({
            where: { id: chat.assignedAgentId },
            data: { activeChatCount: { decrement: 1 } },
          });
          return { agentId: chat.assignedAgentId };
        }

        return { agentId: null };
      },
      { maxWait: 10000, timeout: 10000 }
    );
  } catch (err: any) {
    if (err.code === 'P2025') return { agentId: null };
    throw err;
  }
}

export async function updateAgentCapacity(agentId: string, chatCapacity: number) {
  const clamped = Math.max(1, Math.min(10, chatCapacity));
  return await prisma.agent.update({
    where: { id: agentId },
    data: { chatCapacity: clamped },
  });
}

export async function reconcileAgentActiveChatCount(agentId?: string) {
  try {
    if (agentId) {
      const activeCount = await prisma.chat.count({
        where: { assignedAgentId: agentId, status: 'ACTIVE' },
      });
      await prisma.agent.update({
        where: { id: agentId },
        data: { activeChatCount: activeCount },
      });
      return activeCount;
    }
    const agents = await prisma.agent.findMany({ select: { id: true } });
    for (const agent of agents) {
      const activeCount = await prisma.chat.count({
        where: { assignedAgentId: agent.id, status: 'ACTIVE' },
      });
      await prisma.agent.update({
        where: { id: agent.id },
        data: { activeChatCount: activeCount },
      });
    }
  } catch {}
}

