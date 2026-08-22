import { claimAgentForChat,claimChatForAgent } from "../repositories/agent.repositories";

export async function onNewChat(chatId:string){
    return claimAgentForChat(chatId);
}
export async function onAgentFreedUp(agentId:string){
    return claimChatForAgent(agentId);
}