import { AgentInfo, ChatItem } from '../types/socket.event.types';

export const INITIAL_AGENTS: AgentInfo[] = [
  {
    id: 'agent-1',
    name: 'Sarah Connor',
    email: 'sarah.c@support.ops',
    shiftStatus: 'AVAILABLE',
    chatCapacity: 3,
    activeChatCount: 2,
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: 'agent-2',
    name: 'Alex Murphy',
    email: 'alex.m@support.ops',
    shiftStatus: 'AVAILABLE',
    chatCapacity: 2,
    activeChatCount: 1,
    lastSeenAt: new Date().toISOString(),
  },
  {
    id: 'agent-3',
    name: 'Elena Rostova',
    email: 'elena.r@support.ops',
    shiftStatus: 'ON_BREAK',
    chatCapacity: 4,
    activeChatCount: 0,
    lastSeenAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'agent-4',
    name: 'Marcus Vance',
    email: 'marcus.v@support.ops',
    shiftStatus: 'WRAP_UP',
    chatCapacity: 2,
    activeChatCount: 0,
    lastSeenAt: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'agent-5',
    name: 'Devon Lee',
    email: 'devon.l@support.ops',
    shiftStatus: 'OFFLINE',
    chatCapacity: 3,
    activeChatCount: 0,
    lastSeenAt: new Date(Date.now() - 600000).toISOString(),
  },
];

export const INITIAL_CHATS: ChatItem[] = [
  {
    id: 'chat-101',
    customerId: 'cust-emma-89',
    status: 'ACTIVE',
    assignedAgentId: 'agent-1',
    assignedAt: new Date(Date.now() - 180000).toISOString(),
    messages: [
      {
        senderType: 'CUSTOMER',
        text: 'Hi, I need help updating my billing card on file.',
        sentAt: new Date(Date.now() - 170000).toISOString(),
      },
      {
        senderType: 'AGENT',
        text: 'Hello Emma! I can certainly assist you with updating your card securely.',
        sentAt: new Date(Date.now() - 150000).toISOString(),
      },
      {
        senderType: 'CUSTOMER',
        text: 'Great, should I send the last 4 digits here?',
        sentAt: new Date(Date.now() - 120000).toISOString(),
      },
    ],
    unreadCount: 0,
  },
  {
    id: 'chat-102',
    customerId: 'cust-jordan-44',
    status: 'ACTIVE',
    assignedAgentId: 'agent-1',
    assignedAt: new Date(Date.now() - 90000).toISOString(),
    messages: [
      {
        senderType: 'CUSTOMER',
        text: 'My webhook endpoint is returning 504 gateway timeout.',
        sentAt: new Date(Date.now() - 85000).toISOString(),
      },
      {
        senderType: 'AGENT',
        text: 'Let me inspect our egress logs for your organization domain.',
        sentAt: new Date(Date.now() - 60000).toISOString(),
      },
    ],
    unreadCount: 1,
  },
  {
    id: 'chat-103',
    customerId: 'cust-liam-12',
    status: 'ACTIVE',
    assignedAgentId: 'agent-2',
    assignedAt: new Date(Date.now() - 45000).toISOString(),
    messages: [
      {
        senderType: 'CUSTOMER',
        text: 'How do I generate an API key for staging?',
        sentAt: new Date(Date.now() - 40000).toISOString(),
      },
    ],
    unreadCount: 0,
  },
];

export const INITIAL_QUEUED_CHATS: ChatItem[] = [
  {
    id: 'chat-q1',
    customerId: 'cust-claire-90',
    status: 'WAITING',
    queuedAt: new Date(Date.now() - 75000).toISOString(),
    messages: [
      {
        senderType: 'CUSTOMER',
        text: 'Need assistance with enterprise SSO setup.',
        sentAt: new Date(Date.now() - 75000).toISOString(),
      },
    ],
  },
  {
    id: 'chat-q2',
    customerId: 'cust-noah-55',
    status: 'WAITING',
    queuedAt: new Date(Date.now() - 35000).toISOString(),
    messages: [
      {
        senderType: 'CUSTOMER',
        text: 'Order #89211 shipment is delayed.',
        sentAt: new Date(Date.now() - 35000).toISOString(),
      },
    ],
  },
];
