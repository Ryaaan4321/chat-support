import { prisma } from '../../lib/prisma';

export function calculateLatencySeconds(earlier: Date | string, later: Date | string = new Date()): number {
  const t1 = new Date(earlier).getTime();
  const t2 = new Date(later).getTime();
  return Math.max(0, Math.round((t2 - t1) / 1000));
}

export function isLateReply(deltaSeconds: number, thresholdSeconds: number = 120): boolean {
  return deltaSeconds > thresholdSeconds;
}

export function computeRunningAverage(currentAvg: number | null, newSample: number, totalSamples: number): number {
  if (currentAvg === null || totalSamples <= 1) {
    return newSample;
  }
  return Math.round(((currentAvg * (totalSamples - 1)) + newSample) / totalSamples);
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function processAgentMessageMetrics(chatId: string, agentId: string, messageSentAt: Date = new Date()) {
  if (!prisma.chat || typeof prisma.chat.findUnique !== 'function') {
    return null;
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { agent: true },
    });

    if (!chat) return null;

    let firstResponseSeconds: number | null = chat.firstResponseSeconds;
    let isFirstResponse = false;
    if (!chat.firstResponseAt && chat.assignedAt) {
      firstResponseSeconds = calculateLatencySeconds(chat.assignedAt, messageSentAt);
      isFirstResponse = true;
    }

    let deltaSeconds: number | null = null;
    let isLate = false;
    if (chat.lastCustomerMessageAt) {
      const customerTime = new Date(chat.lastCustomerMessageAt);
      if (!chat.lastAgentReplyAt || new Date(chat.lastAgentReplyAt) < customerTime) {
        deltaSeconds = calculateLatencySeconds(customerTime, messageSentAt);
        if (isLateReply(deltaSeconds)) {
          isLate = true;
        }
      }
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        firstResponseAt: chat.firstResponseAt || (isFirstResponse ? messageSentAt : undefined),
        firstResponseSeconds: firstResponseSeconds ?? undefined,
        lateReplyCount: isLate ? { increment: 1 } : undefined,
        lastAgentReplyAt: messageSentAt,
        slaBreached: false,
      },
    });

    let updatedAgent = chat.agent;
    if (chat.assignedAgentId && prisma.agent && typeof prisma.agent.update === 'function') {
      const agent = chat.agent || (typeof prisma.agent.findUnique === 'function' ? await prisma.agent.findUnique({ where: { id: chat.assignedAgentId } }) : null);
      if (agent) {
        let nextAvg = agent.avgFirstResponseSeconds;
        if (isFirstResponse && firstResponseSeconds !== null && typeof prisma.chat.count === 'function') {
          const finishedCount = await prisma.chat.count({
            where: { assignedAgentId: agent.id, firstResponseAt: { not: null } },
          });
          nextAvg = computeRunningAverage(agent.avgFirstResponseSeconds, firstResponseSeconds, finishedCount);
        }

        updatedAgent = await prisma.agent.update({
          where: { id: agent.id },
          data: {
            totalLateReplies: isLate ? { increment: 1 } : undefined,
            avgFirstResponseSeconds: nextAvg,
          },
        });
      }
    }

    return {
      chat: updatedChat,
      agent: updatedAgent,
      firstResponseSeconds,
      isLate,
      deltaSeconds,
    };
  } catch {
    return null;
  }
}

export async function processCustomerMessageMetrics(chatId: string, messageSentAt: Date = new Date()) {
  if (!prisma.chat || typeof prisma.chat.update !== 'function') {
    return null;
  }
  try {
    return await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastCustomerMessageAt: messageSentAt,
      },
    });
  } catch {
    return null;
  }
}

export async function updateAgentShiftStatus(agentId: string, nextStatus: 'OFFLINE' | 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'SHIFT_ENDED') {
  if (!prisma.agent || typeof prisma.agent.update !== 'function') {
    return null;
  }

  let agent: any = null;
  if (typeof prisma.agent.findUnique === 'function') {
    try {
      agent = await prisma.agent.findUnique({ where: { id: agentId } });
    } catch {}
  }

  if (!agent) {
    return await prisma.agent.update({
      where: { id: agentId },
      data: { shiftStatus: nextStatus },
    });
  }

  const now = new Date();
  const today = getTodayDateString();
  const isNewDay = agent.shiftDate !== today;

  let activeShiftSeconds = isNewDay ? 0 : agent.activeShiftSeconds;
  let totalBreakSeconds = isNewDay ? 0 : agent.totalBreakSeconds;

  const prevStatus = agent.shiftStatus;
  const elapsed = Math.max(0, Math.round((now.getTime() - new Date(agent.updatedAt).getTime()) / 1000));

  if (!isNewDay && elapsed > 0 && elapsed < 86400) {
    if (prevStatus === 'AVAILABLE' || prevStatus === 'WRAP_UP') {
      activeShiftSeconds += elapsed;
    } else if (prevStatus === 'ON_BREAK') {
      totalBreakSeconds += elapsed;
    }
  }

  let shiftStartedAt = agent.shiftStartedAt;
  if (isNewDay || !shiftStartedAt) {
    if (nextStatus === 'AVAILABLE') {
      shiftStartedAt = now;
    }
  }

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: {
      shiftStatus: nextStatus,
      shiftDate: today,
      shiftStartedAt,
      activeShiftSeconds,
      totalBreakSeconds,
      breakStartedAt: nextStatus === 'ON_BREAK' ? now : null,
    },
  });

  return updated;
}

export async function checkSlaBreaches() {
  const threshold = new Date(Date.now() - 120_000);

  const waitingBreaches = await prisma.chat.findMany({
    where: {
      status: 'WAITING',
      queuedAt: { lt: threshold },
    },
    select: {
      id: true,
      customerId: true,
      assignedAgentId: true,
      status: true,
      queuedAt: true,
    },
  });

  const activeBreaches = await prisma.chat.findMany({
    where: {
      status: 'ACTIVE',
      lastCustomerMessageAt: { lt: threshold },
    },
    select: {
      id: true,
      customerId: true,
      assignedAgentId: true,
      status: true,
      lastCustomerMessageAt: true,
      lastAgentReplyAt: true,
    },
  });

  const filteredActive = activeBreaches.filter((c) => {
    if (!c.lastCustomerMessageAt) return false;
    if (!c.lastAgentReplyAt) return true;
    return new Date(c.lastAgentReplyAt) < new Date(c.lastCustomerMessageAt);
  });

  const allBreaches = [
    ...waitingBreaches.map((w) => ({
      chatId: w.id,
      customerId: w.customerId,
      agentId: null,
      status: w.status,
      waitingSeconds: calculateLatencySeconds(w.queuedAt),
      breached: true,
    })),
    ...filteredActive.map((a) => ({
      chatId: a.id,
      customerId: a.customerId,
      agentId: a.assignedAgentId,
      status: a.status,
      waitingSeconds: calculateLatencySeconds(a.lastCustomerMessageAt!),
      breached: true,
    })),
  ];

  return allBreaches;
}
