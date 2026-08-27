import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

async function main() {
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.agent.deleteMany();
  logger.info('test branch cleared');
  await prisma.$disconnect();
}

main();