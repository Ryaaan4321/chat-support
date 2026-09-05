# Swish Desk - Real-Time High-Concurrency Customer Support Platform

Swish Desk is an enterprise customer support operations platform engineered for real-time bidirectional communication between customers and support agents. The platform handles concurrent chat allocation, queue management, agent shift monitoring, and session resolution with strong ACID consistency and zero race conditions.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Agent Assignment Engine](#agent-assignment-engine)
4. [Concurrency Challenges & Solutions](#concurrency-challenges--solutions)
5. [Backend Engineering Challenges & Fixes](#backend-engineering-challenges--fixes)
6. [Real-Time WebSocket Protocol](#real-time-websocket-protocol)
7. [Frontend Architecture & Role Protection](#frontend-architecture--role-protection)
8. [Database Schema](#database-schema)
9. [Local Setup & Running](#local-setup--running)
10. [Verification & Test Suites](#verification--test-suites)

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|                                                                               |
|   Customer Workspace            Agent Workspace            Supervisor Desk    |
|   (/customer)                   (/agent)                   (/manager)         |
|   - Real-time chat              - Active chat tabs         - Shift overview   |
|   - Queue position              - Canned replies           - Capacity stats   |
|   - Avatar preview              - Session resolution       - Agent monitoring |
+-----------------------+-------------------+-----------------------------------+
                        |                   |
                        | HTTP / WebSockets |
                        v                   v
+-------------------------------------------------------------------------------+
|                               SERVER TIER                                     |
|                                                                               |
|   Next.js Edge Proxy / Middleware (:3000)                                     |
|   - Role-based route guard via JWT cookies                                    |
|                                                                               |
|   Express & Socket.io Realtime Service (:4001)                                |
|   - JWT Authentication & Role Authorization                                   |
|   - Bidirectional Event Emitters (chat:new, chat:message, chat:closed)        |
|   - Dynamic Socket Room Orchestration (chat:id, agent:id, managers)           |
+---------------------------------------+---------------------------------------+
                                        |
                                        | Prisma ORM / Adapter-PG
                                        v
+-------------------------------------------------------------------------------+
|                               DATABASE TIER                                   |
|                                                                               |
|   PostgreSQL on Neon Cloud Serverless                                         |
|   - Row-Level Locking (SELECT ... FOR UPDATE SKIP LOCKED)                     |
|   - Atomic Transactions ($transaction)                                        |
|   - Tables: Agent, Chat, Message                                              |
+-------------------------------------------------------------------------------+
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Design**: React 19, Vanilla Tailwind CSS (Modern Light SaaS Aesthetic)
- **State Management**: Zustand (Local store with optimistic UI updates)
- **Real-Time Transport**: Socket.io Client (`websocket`, `polling` fallback)
- **Icons & Graphics**: Lucide React, Hand-drawn vector profile avatars

### Backend
- **Runtime**: Node.js v22
- **Server Framework**: Express 5
- **WebSocket Engine**: Socket.io 4
- **ORM & Database Client**: Prisma 7 with `@prisma/adapter-pg`
- **Database**: PostgreSQL on Neon Cloud
- **Security & Tokens**: JSON Web Tokens (JWT), crypto hashing
- **Testing**: Jest, ts-jest, custom Socket test harness

---

## Agent Assignment Engine

The agent assignment engine ensures incoming customer requests are routed to the best available agent instantly while honoring individual capacity limits.

### Assignment Rules
1. **Agent Eligibility**: An agent must have `shiftStatus = 'AVAILABLE'`. Agents who are `ON_BREAK`, `WRAP_UP`, `OFFLINE`, or `SHIFT_ENDED` never receive new chats.
2. **Capacity Enforcement**: An agent's current load must satisfy `activeChatCount < chatCapacity`.
3. **Least-Loaded Priority**: Among all eligible agents, the system prioritizes the agent with the lowest `activeChatCount` (`ORDER BY activeChatCount ASC`).
4. **FIFO Waiting Queue**: When all agents are at maximum capacity or offline, incoming requests enter a `WAITING` queue ordered chronologically by `queuedAt ASC`.

### Automatic Reassignment on Free-Up
When an agent resolves an active chat:
1. The active session transitions to `CLOSED` and the agent's `activeChatCount` is decremented.
2. `onAgentFreedUp(agentId)` triggers immediately.
3. If any chat exists in the `WAITING` queue, the oldest queued chat is claimed atomically for that agent without waiting for the next polling cycle.

---

## Concurrency Challenges & Solutions

High-volume customer support systems face race conditions, deadlocks, and over-allocation when multiple requests hit the server concurrently.

### 1. The Double-Claim Problem (Race Condition)
- **Scenario**: Two customer requests arrive at the exact same millisecond. If two worker threads query available agents simultaneously, both could find Agent A with 1 free slot, increment Agent A's count twice, and exceed Agent A's allowed capacity.
- **Solution**: Row-level locking using PostgreSQL `FOR UPDATE SKIP LOCKED` inside an atomic transaction:
  ```sql
  SELECT id
  FROM "Agent"
  WHERE "shiftStatus" = 'AVAILABLE'
    AND "activeChatCount" < "chatCapacity"
  ORDER BY "activeChatCount" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  ```
- **Why `SKIP LOCKED`**: Standard `FOR UPDATE` causes competing transactions to queue and wait on the locked row, leading to latency spikes and potential deadlocks. With `SKIP LOCKED`, if Transaction 1 locks Agent A, Transaction 2 skips Agent A immediately and locks Agent B.

### 2. Deadlock Avoidance in Queue Reassignment
- **Scenario**: Thread 1 holds a lock on a Chat and tries to lock an Agent. Thread 2 holds a lock on the Agent and tries to lock a Chat.
- **Solution**: Strict lock acquisition ordering. In `claimChatForAgent`, the agent row is locked first (`FOR UPDATE`), followed by claiming the oldest waiting chat (`FOR UPDATE SKIP LOCKED`):
  ```sql
  SELECT id, "activeChatCount", "chatCapacity"
  FROM "Agent"
  WHERE id = $1
  FOR UPDATE;

  SELECT id
  FROM "Chat"
  WHERE status = 'WAITING'
  ORDER BY "queuedAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;
  ```

### 3. Transient Lock Contention & Jittered Exponential Backoff
- **Scenario**: When sudden traffic bursts occur, multiple assignment attempts might collide within the database transaction window.
- **Solution**: A retry loop with randomized jitter in `assignment.service.ts`:
  ```typescript
  const ASSIGNMENT_RETRY_ATTEMPTS = 3;
  const ASSIGNMENT_RETRY_BASE_DELAY_MS = 30;

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function jitteredDelay(attempt: number) {
    const base = ASSIGNMENT_RETRY_BASE_DELAY_MS * (attempt + 1);
    const jitter = Math.random() * base * 0.5;
    return delay(base + jitter);
  }

  export async function onNewChat(chatId: string) {
    for (let attempt = 0; attempt <= ASSIGNMENT_RETRY_ATTEMPTS; attempt++) {
      const result = await claimAgentForChat(chatId);
      if (result) return result;
      if (attempt < ASSIGNMENT_RETRY_ATTEMPTS) {
        await jitteredDelay(attempt);
      }
    }
    return null;
  }
  ```

### 4. Background Sweeper Maintenance
- **Stale Agent Sweeper**: Automatically marks agents as `OFFLINE` if no heartbeat is received within 45 seconds (`sweepStaleAgents`).
- **Waiting Queue Sweeper**: Periodically sweeps any unassigned waiting chats every 10 seconds to recover from any edge-case network dropouts (`sweepWaitingChats`).


## Real-Time WebSocket Protocol

All real-time communication runs over Socket.io with typed event contracts defined in `types/socket.event.types.ts`.

### Client to Server Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `chat:new` | `{ customerId: string }` | Customer requests a new support session |
| `chat:message` | `{ chatId, senderType, text }` | Customer or Agent sends a message |
| `chat:closed` | `{ chatId: string }` | Agent resolves and closes a chat session |
| `agent:status_changed` | `{ agentId, shiftStatus }` | Agent updates their operational shift status |
| `chat:rejoin` | `{ chatId: string }` | Client reconnects to an ongoing session |

### Server to Client Events
| Event | Payload | Description |
| :--- | :--- | :--- |
| `chat:assigned` | `{ chatId, customerId, agentId, agentName, assignedAt }` | Broadcast to both agent and customer rooms upon match |
| `chat:queued` | `{ chatId, position }` | Notifies customer of their queue status |
| `chat:message` | `{ chatId, senderType, text, sentAt }` | Broadcasts new message to room `chat:${chatId}` |
| `chat:closed` | `{ chatId, agentId, closedAt }` | Broadcasts session closure to room `chat:${chatId}` |
| `chat:sync` | `{ chatId, status, agentId, messages }` | Full state sync on session reconnection |
| `agent:status_changed` | `{ agentId, shiftStatus }` | Broadcasts agent status changes to managers |

---

## Frontend Architecture & Role Protection

### Route Guard Middleware (`frontend/middleware.ts`)
Next.js Edge Middleware inspects cookies (`swish_auth_token` and `swish_user_role`) before rendering routes:
- `/agent/*`: Accessible only to users with role `AGENT` or `MANAGER`.
- `/manager/*`: Accessible only to users with role `MANAGER`.
- `/customer/*`: Accessible only to users with role `CUSTOMER`.
- `/login`: Redirects authenticated users directly to their designated dashboard.
- Unauthenticated requests are redirected to `/login?redirect={pathname}`.

### Responsive Design Principles
- **Aesthetic**: Clean light SaaS theme utilizing pure white backgrounds (`#FFFFFF`), light slate surface cards (`#F8FAFC`), crisp borders (`#E2E8F0`), and primary blue interactive accents (`#2563EB`).
- **Zero Bleed Layout**: Uses `min-h-dvh` and constrained flex columns to eliminate mobile layout overflow.
- **Compact Mobile Headers**: On mobile devices, status badges collapse into pulsating green indicators, and the resolve action simplifies to a compact "Close" button.

---

## Database Schema

Prisma Schema (`prisma/schema.prisma`):

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

model Agent {
  id                   String      @id @default(uuid())
  name                 String
  email                String      @unique
  managerId            String?
  shiftStatus          ShiftStatus @default(OFFLINE)
  breakStartedAt       DateTime?
  breakDurationMinutes Int?
  chatCapacity         Int         @default(2)
  activeChatCount      Int         @default(0)
  lastSeenAt           DateTime?
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  chats                Chat[]
}

model Chat {
  id              String     @id @default(uuid())
  customerId      String
  status          ChatStatus @default(WAITING)
  assignedAgentId String?
  agent           Agent?     @relation(fields: [assignedAgentId], references: [id])
  queuedAt        DateTime   @default(now())
  assignedAt      DateTime?
  closedAt        DateTime?
  messages        Message[]
}

model Message {
  id         String     @id @default(uuid())
  chatId     String
  chat       Chat       @relation(fields: [chatId], references: [id])
  senderType SenderType
  text       String
  sentAt     DateTime   @default(now())
}

enum ShiftStatus {
  OFFLINE
  AVAILABLE
  ON_BREAK
  WRAP_UP
  SHIFT_ENDED
}

enum ChatStatus {
  WAITING
  ACTIVE
  CLOSED
}

enum SenderType {
  AGENT
  CUSTOMER
}
```

---

## Local Setup & Running

### Prerequisites
- Node.js v20+ or v22+
- PostgreSQL database (or Neon Serverless account)

### 1. Backend Setup
```bash
cd backend
npm install
```

Configure `backend/.env`:
```ini
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"
JWT_SECRET="your-jwt-secret-key"
MANAGER_SECRET_KEY="swish-manager-super-secret-2026"
SOCKET_PORT=4001
CLIENT_ORIGIN="http://localhost:3000"
```

Push Prisma schema to database:
```bash
npx prisma db push
```

Start backend development server:
```bash
npm run dev
```
*(Server listens on port 4001 with hot-reloading)*

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Configure `frontend/.env.local`:
```ini
NEXT_PUBLIC_API_URL="http://localhost:4001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4001"
```

Start frontend development server:
```bash
npm run dev
```
*(Runs on http://localhost:3000)*

---

## Verification & Test Suites

### Automated Unit Tests
Run the backend test suite:
```bash
cd backend
npm test
```
**Results**:
- `tests/unit/agent.socket.test.ts` (Passed)
- `tests/unit/assignment.service.test.ts` (Passed)
- `tests/unit/auth.test.ts` (Passed)
- `tests/unit/chat.socket.test.ts` (Passed)
- `tests/unit/errors.test.ts` (Passed)
- Total: **39 of 39 tests passing**.

### Static Type Checking
```bash
# In backend/
npx tsc --noEmit

# In frontend/
npx tsc --noEmit
```
Both exit with code `0` (zero type errors).

### Production Build Validation
```bash
cd frontend
npm run build
```
Builds and optimizes all static routes, edge middleware, and dynamic client components without error.

### Live End-to-End Socket Verification
Execute the automated bidirectional integration test:
```bash
cd backend
npx tsx tests/test-live-e2e.ts
```
**Output**:
```text
AGENT_CONNECTED
CUSTOMER_CONNECTED
AGENT_AVAILABLE
CUSTOMER_ASSIGNED: <chat-id> <agent-name>
AGENT_RECEIVED_MSG: Hello agent! Need help with my order.
CUSTOMER_RECEIVED_REPLY: Hello! I am happy to help with your order.
CUSTOMER_CHAT_CLOSED: <chat-id>
VERIFICATION_COMPLETE_SUCCESS
```
