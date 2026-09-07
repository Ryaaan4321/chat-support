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
  id?: string;
  clientTempId?: string;
  chatId: string;
  senderType: 'AGENT' | 'CUSTOMER';
  messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
  text: string;
  imageUrl?: string;
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
export interface AgentCapacityChangedPayload {
  agentId: string;
  chatCapacity: number;
}
export interface ChatSyncPayload {
  chatId: string;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED';
  agentId: string | null;
  agentName?: string;
  messages: Array<{
    id?: string;
    clientTempId?: string;
    senderType: 'AGENT' | 'CUSTOMER';
    messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
    text: string;
    imageUrl?: string;
    sentAt: string;
  }>;
}
export interface AgentPerformanceUpdatedPayload {
  agentId: string;
  totalLateReplies: number;
  avgFirstResponseSeconds: number | null;
  lastFirstResponseSeconds?: number | null;
}

export interface AgentShiftUpdatedPayload {
  agentId: string;
  shiftStatus: 'OFFLINE' | 'AVAILABLE' | 'ON_BREAK' | 'WRAP_UP' | 'SHIFT_ENDED';
  activeShiftSeconds: number;
  totalBreakSeconds: number;
  shiftStartedAt?: string | null;
}

export interface ChatSlaBreachPayload {
  chatId: string;
  customerId: string;
  agentId?: string | null;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED';
  waitingSeconds: number;
  breached: boolean;
}

export interface ServerToClientEvents {
  'chat:assigned': (payload: ChatAssignedPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'chat:closed': (payload: ChatClosedPayload) => void;
  'chat:queued': (payload: { chatId: string; position: number }) => void;
  'chat:sync': (payload: ChatSyncPayload) => void;
  'chat:rejoin_failed': (payload: { chatId: string }) => void;
  'agent:status_changed': (payload: AgentStatusChangedPayload) => void;
  'agent:capacity_changed': (payload: AgentCapacityChangedPayload) => void;
  'agent:performance_updated': (payload: AgentPerformanceUpdatedPayload) => void;
  'agent:shift_updated': (payload: AgentShiftUpdatedPayload) => void;
  'chat:sla_breach': (payload: ChatSlaBreachPayload) => void;
}
export interface ClientToServerEvents {
  'chat:new': (payload: ChatNewPayload) => void;
  'chat:rejoin': (payload: { chatId: string }) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'chat:closed': (payload: { chatId: string }) => void;
  'agent:status_changed': (payload: AgentStatusChangedPayload) => void;
  'agent:capacity_changed': (payload: AgentCapacityChangedPayload) => void;
}
export interface InterServerEvents {
  ping: () => void;
}
export interface SocketData {
  role: 'AGENT' | 'CUSTOMER' | 'MANAGER';
  userId: string; 
}