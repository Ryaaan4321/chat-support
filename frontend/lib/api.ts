import {
  LoginAgentRequest,
  LoginAgentResponse,
  LoginManagerRequest,
  LoginManagerResponse,
  CustomerSessionRequest,
  CustomerSessionResponse,
  AgentsListResponse,
  UserProfileResponse,
  HealthCheckResponse,
  ApiErrorResponse,
  SignupRequest,
  SignupResponse,
  ActiveChatResponse,
  SingleChatResponse,
} from '../types/api.types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const TOKEN_KEY = 'swish_auth_token';
const ROLE_KEY = 'swish_user_role';

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setStoredToken(token: string): void {
  setStoredAuth(token);
}

export function setStoredAuth(token: string, role?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `swish_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    document.cookie = `swish_user_role=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
  }
}

export function clearStoredToken(): void {
  clearStoredAuth();
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  document.cookie = 'swish_auth_token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'swish_user_role=; path=/; max-age=0; SameSite=Lax';
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: Partial<ApiErrorResponse> = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    throw new ApiError(
      errorData.message || errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.code
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: async (): Promise<HealthCheckResponse> => {
    return request<HealthCheckResponse>('/api/health', { method: 'GET' });
  },

  auth: {
    signup: async (data: SignupRequest): Promise<SignupResponse> => {
      const res = await request<SignupResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) {
        setStoredAuth(res.token, res.user.role);
      }
      return res;
    },

    loginAgent: async (data: LoginAgentRequest): Promise<LoginAgentResponse> => {
      const res = await request<LoginAgentResponse>('/api/auth/agent/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) {
        setStoredAuth(res.token, 'AGENT');
      }
      return res;
    },

    loginManager: async (data: LoginManagerRequest): Promise<LoginManagerResponse> => {
      const res = await request<LoginManagerResponse>('/api/auth/manager/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) {
        setStoredAuth(res.token, 'MANAGER');
      }
      return res;
    },

    createCustomerSession: async (
      data: CustomerSessionRequest
    ): Promise<CustomerSessionResponse> => {
      const res = await request<CustomerSessionResponse>('/api/auth/customer/session', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.token) {
        setStoredAuth(res.token, 'CUSTOMER');
      }
      return res;
    },

    getAgents: async (): Promise<AgentsListResponse> => {
      return request<AgentsListResponse>('/api/auth/agents', { method: 'GET' });
    },

    getMe: async (): Promise<UserProfileResponse> => {
      return request<UserProfileResponse>('/api/auth/me', { method: 'GET' });
    },

    logout: (): void => {
      clearStoredAuth();
    },
  },

  chats: {
    getMyActive: async (): Promise<ActiveChatResponse> => {
      return request<ActiveChatResponse>('/api/chats/my-active', { method: 'GET' });
    },

    getChat: async (chatId: string): Promise<SingleChatResponse> => {
      return request<SingleChatResponse>(`/api/chats/${chatId}`, { method: 'GET' });
    },

    getQueue: async (): Promise<{ queue: any[] }> => {
      return request<{ queue: any[] }>('/api/chats/queue', { method: 'GET' });
    },
  },
};
