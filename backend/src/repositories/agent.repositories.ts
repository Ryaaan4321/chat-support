import { prisma } from '../../lib/prisma';
import { AgentIdRow, AgentCapacityRow, ChatIdRow } from '../../types/agent.types';

export async function claimAgentForChat(chatId: string) {
  return prisma.$transaction(async (tx) => {
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
  }, { maxWait: 10000, timeout: 10000 }
  );
}
export async function claimChatForAgent(agentId: string) {
  return prisma.$transaction(async (tx) => {
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
  }, { maxWait: 10000, timeout: 10000 }
  );
}

export async function closeChatAndRelease(chatId: string) {
  return prisma.$transaction(async (tx) => {
    const chat = await tx.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new Error(`Chat ${chatId} not found`);
    if (chat.status === 'CLOSED') {
      return { chat, agentId: chat.assignedAgentId };
    }
    const closedChat = await tx.chat.update({
      where: { id: chatId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    let agentId: string | null = null;
    if (chat.assignedAgentId) {
      agentId = chat.assignedAgentId;
      await tx.agent.updateMany({
        where: { id: chat.assignedAgentId, activeChatCount: { gt: 0 } },
        data: { activeChatCount: { decrement: 1 } },
      });
    }
    return { chat: closedChat, agentId };
  });
}


