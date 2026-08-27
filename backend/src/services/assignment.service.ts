import { claimAgentForChat, claimChatForAgent } from "../repositories/agent.repositories";

const ASSIGNMENT_RETRY_ATTEMPTS = 3;
const ASSIGNMENT_RETRY_BASE_DELAY_MS = 30;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function jitteredDelay(attempt: number) {
  const base = ASSIGNMENT_RETRY_BASE_DELAY_MS * (attempt + 1);
  const jitter = Math.random() * base * 0.5;
  return delay(base + jitter);
}
export async function onNewChat(chatId: string) {
  for (let attempt = 0; attempt <= ASSIGNMENT_RETRY_ATTEMPTS; attempt++) {
    const result = await claimAgentForChat(chatId);
    if (result) return result;
    if (attempt < ASSIGNMENT_RETRY_ATTEMPTS) {
      await jitteredDelay(attempt);
    }
  }
  return null;
}

export async function onAgentFreedUp(agentId: string) {
  return claimChatForAgent(agentId);
}