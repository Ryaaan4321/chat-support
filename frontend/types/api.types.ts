import { AgentInfo, ShiftStatus } from './socket.event.types';

export interface LoginAgentRequest {
  email: string;
  password?: string;
}
export interface LoginAgentResponse {
  token: string;
  agent: AgentInfo;
}
export interface LoginManagerRequest {
  email: string;
  password?: string;
}
export interface LoginManagerResponse {
  token: string;
  manager: {
    id: string;
    name: string;
    email: string;
    role: 'MANAGER';
  };
}
export interface CustomerSessionRequest {
  customerId: string;
}
export interface CustomerSessionResponse {
  token: string;
  customerId: string;
}
export interface AgentsListResponse {
  agents: AgentInfo[];
}
export interface SignupRequest {
  name: string;
  email: string;
  role: 'AGENT' | 'MANAGER' | 'CUSTOMER';
  avatarUrl?: string;
  chatCapacity?: number;
}
export interface SignupResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'AGENT' | 'MANAGER' | 'CUSTOMER';
    avatarUrl?: string;
    shiftStatus?: ShiftStatus;
    chatCapacity?: number;
    activeChatCount?: number;
  };
}
export interface UserProfileResponse {
  user: {
    id: string;
    role: 'AGENT' | 'MANAGER' | 'CUSTOMER';
    name?: string;
    email?: string;
    avatarUrl?: string;
    shiftStatus?: ShiftStatus;
    chatCapacity?: number;
    activeChatCount?: number;
  };
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}
export interface ApiErrorResponse {
  error: string;
  code?: string;
  message?: string;
  statusCode?: number;
}
export interface ChatMessage {
  id?: string;
  chatId?: string;
  senderType: 'AGENT' | 'CUSTOMER';
  text: string;
  sentAt: string;
}
export interface ActiveChatResponse {
  chats: Array<{
    id: string;
    customerId: string;
    status: 'WAITING' | 'ACTIVE' | 'CLOSED';
    assignedAgentId?: string | null;
    queuedAt: string;
    assignedAt?: string | null;
    messages: ChatMessage[];
  }>;
}
export interface SingleChatResponse {
  chat: {
    id: string;
    customerId: string;
    status: 'WAITING' | 'ACTIVE' | 'CLOSED';
    assignedAgentId?: string | null;
    queuedAt: string;
    assignedAt?: string | null;
    messages: ChatMessage[];
    agent?: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}
