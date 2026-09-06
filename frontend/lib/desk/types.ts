import {
  AgentInfo,
  ChatItem,
  ShiftStatus,
  ChatSlaBreachPayload,
} from '../../types/socket.event.types';

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  team: string;
  initials: string;
  shiftStatus: ShiftStatus;
  chatCapacity: number;
  activeChatCount: number;
  avatarUrl?: string;
}

export interface CustomerObj {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  [key: string]: any;
}

export interface Message {
  id?: string;
  clientTempId?: string;
  senderType: 'AGENT' | 'CUSTOMER' | string;
  messageType?: 'TEXT' | 'IMAGE';
  text: string;
  imageUrl?: string;
  sentAt: string;
  [key: string]: any;
}

export interface Chat {
  id: string;
  customerId?: string;
  customer?: CustomerObj | string | any;
  customerAvatar?: string | null;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED' | string;
  assignedAgentId?: string | null;
  queuedAt?: string;
  assignedAt?: string | null;
  messages: Message[];
  unreadCount?: number;
  unread?: number;
  [key: string]: any;
}

export interface DeskState {
  me: AgentProfile;
  agents: AgentInfo[];
  chats: Chat[];
  queuedChats: Chat[];
  queue: Chat[];
  slaBreaches: ChatSlaBreachPayload[];
  selectedChatId: string | null;
  mobileShowThread: boolean;
  filterStatus: string;
  isConnected: boolean;
  socketInitialized: boolean;
  isHydrating: boolean;

  initSocketSession: (agentData?: Partial<AgentProfile>) => Promise<void>;
  initManagerSession: () => Promise<void>;
  setMeStatus: (status: ShiftStatus) => void;
  setStatus: (status: ShiftStatus) => void;
  selectChat: (chatId: string | null) => void;
  setMobileShowThread: (show: boolean) => void;
  setFilterStatus: (filter: string) => void;
  setIsConnected: (connected: boolean) => void;

  sendMessage: (chatId: string, text: string, imageUrl?: string) => void;
  closeChat: (chatId: string) => void;
  updateAgentCapacity: (agentId: string, capacity: number) => void;
  syncChatAssigned: (chatId: string, agentId: string, customerId?: string) => void;
  syncChatQueued: (chat: Chat | ChatItem) => void;
  dismissSlaBreach: (chatId: string) => void;

  [key: string]: any;
}

export type StoreSet = (
  partial: Partial<DeskState> | ((state: DeskState) => Partial<DeskState>)
) => void;
export type StoreGet = () => DeskState;
