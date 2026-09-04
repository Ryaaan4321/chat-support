export type ShiftStatus =
  | 'OFFLINE'
  | 'AVAILABLE'
  | 'ON_BREAK'
  | 'WRAP_UP'
  | 'SHIFT_ENDED';

export type ChatStatus = 'WAITING' | 'ACTIVE' | 'CLOSED';

export type SenderType = 'AGENT' | 'CUSTOMER';

export interface ChatNewPayload {
  customerId: string;
}

export interface ChatAssignedPayload {
  chatId: string;
  agentId: string;
  assignedAt: string;
}

export interface ChatMessagePayload {
  chatId: string;
  senderType: SenderType;
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
  shiftStatus: ShiftStatus;
}

export interface ChatSyncPayload {
  chatId: string;
  status: ChatStatus;
  agentId: string | null;
  messages: Array<{
    senderType: SenderType;
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

export interface SocketData {
  role: 'AGENT' | 'CUSTOMER' | 'MANAGER';
  userId: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  email: string;
  shiftStatus: ShiftStatus;
  chatCapacity: number;
  activeChatCount: number;
  lastSeenAt?: string | null;
}

export interface ChatItem {
  id: string;
  customerId: string;
  status: ChatStatus;
  assignedAgentId?: string | null;
  queuedAt?: string;
  assignedAt?: string | null;
  messages: Array<{
    senderType: SenderType;
    text: string;
    sentAt: string;
  }>;
  unreadCount?: number;
}
