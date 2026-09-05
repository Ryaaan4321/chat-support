export interface ChatNewPayload {
  customerId: string;
}
export interface ChatAssignedPayload {
  chatId: string;
  customerId?: string;
  agentId: string;
  agentName?: string;
  assignedAt: string; 
}
export interface ChatMessagePayload {
  chatId: string;
  senderType: 'AGENT' | 'CUSTOMER';
  text: string;
  sentAt: string;
}
export interface ChatClosedPayload {
  chatId: string;
  agentId: string | null;
  closedAt: string;
}
export interface AgentStatusChangedPayload {
  agentId: string;
  shiftStatus: 'OFFLINE' | 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'SHIFT_ENDED';
}
export interface ChatSyncPayload {
  chatId: string;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED';
  agentId: string | null;
  messages: Array<{
    senderType: 'AGENT' | 'CUSTOMER';
    text: string;
    sentAt: string;
  }>;
}
export interface ServerToClientEvents {
  'chat:assigned': (payload: ChatAssignedPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'chat:closed': (payload: ChatClosedPayload) => void;
  'chat:queued': (payload: { chatId: string; position: number }) => void;
  'chat:sync': (payload: ChatSyncPayload) => void;
  'chat:rejoin_failed': (payload: { chatId: string }) => void;
  'agent:status_changed': (payload: AgentStatusChangedPayload) => void;
}
export interface ClientToServerEvents {
  'chat:new': (payload: ChatNewPayload) => void;
  'chat:rejoin': (payload: { chatId: string }) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'chat:closed': (payload: { chatId: string }) => void;
  'agent:status_changed': (payload: AgentStatusChangedPayload) => void;
}
export interface InterServerEvents {
  ping: () => void;
}
export interface SocketData {
  role: 'AGENT' | 'CUSTOMER' | 'MANAGER';
  userId: string; 
}