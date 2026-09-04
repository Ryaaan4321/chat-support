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
export interface UserProfileResponse {
  user: {
    id: string;
    role: 'AGENT' | 'MANAGER' | 'CUSTOMER';
    name?: string;
    email?: string;
    shiftStatus?: ShiftStatus;
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
