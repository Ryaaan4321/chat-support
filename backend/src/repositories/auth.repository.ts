import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

export async function findAgentByEmail(email: string) {
  try {
    return await prisma.agent.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  } catch (err) {
    throw AppError.database('Failed to lookup agent by email', { email }, err);
  }
}

export async function findAgentById(id: string) {
  try {
    return await prisma.agent.findUnique({
      where: { id },
    });
  } catch (err) {
    throw AppError.database('Failed to lookup agent by id', { id }, err);
  }
}

export async function listAgents() {
  try {
    return await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    throw AppError.database('Failed to list agents', undefined, err);
  }
}

export async function createAgent(data: {
  name: string;
  email: string;
  chatCapacity?: number;
}) {
  try {
    return await prisma.agent.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        chatCapacity: data.chatCapacity ?? 2,
        shiftStatus: 'AVAILABLE',
      },
    });
  } catch (err) {
    throw AppError.database('Failed to create agent', { email: data.email }, err);
  }
}

