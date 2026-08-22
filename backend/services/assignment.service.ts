import { claimAgentForChat,claimChatForAgent } from "../repositories/agent.repositories";

export async function onNewChat(chatId:string){
    return claimAgentForChat(chatId);
}
export async function onAgentFreedUp(chatId:string){
    return claimChatForAgent(chatId);
}