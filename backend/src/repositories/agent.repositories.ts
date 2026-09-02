import { prisma } from '../../lib/prisma';
import { AgentIdRow, AgentCapacityRow, ChatIdRow } from '../../types/agent.types';

export async function claimAgentForChat(chatId: string) {
  try {
    /*
    understanding what is happening in the below query:
    we are locking the row because 
     -- suppose there are two chats want to claim for the agent with name chat-a 
        and chat-b and if we are not locking them up and not using SKIP than they will
        wait untill this transaction completes or fails which can create the deadlock.
        hence that's what it prevents if there is a chat-a that has already LOCK the row
        than chat-b will SKIP the row and will try to find the next available agent.
    */
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
