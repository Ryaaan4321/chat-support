# Swish Desk - Real-Time High-Concurrency Customer Support Platform

Swish Desk is an enterprise customer support operations platform engineered for real-time bidirectional communication between customers and support agents. The platform handles concurrent chat allocation, FIFO queue management, agent shift monitoring, multimedia messaging, slash-command verbiages, and supervisor telemetry with strong ACID consistency and zero race conditions.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Agent Assignment Engine](#agent-assignment-engine)
4. [Concurrency Control & ACID Guarantees](#concurrency-control--acid-guarantees)
5. [Real-Time WebSocket Protocol](#real-time-websocket-protocol)
6. [Multimedia Messaging & Voice Recording](#multimedia-messaging--voice-recording)
7. [Supervisor Manager Intelligence](#supervisor-manager-intelligence)
8. [Agent Productivity & Slash Commands](#agent-productivity--slash-commands)
9. [Database Schema](#database-schema)
10. [Frontend Modular Architecture](#frontend-modular-architecture)
11. [Local Setup & Running](#local-setup--running)
12. [Verification & Test Suites](#verification--test-suites)

---

## System Architecture

```text
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|                                                                               |
|   Customer Workspace            Agent Workspace            Supervisor Desk    |
|   (/customer)                   (/agent)                   (/manager)         |
|   - Real-time chat              - Multi-chat tabs          - Live leaderboard |
|   - FIFO queue wait counter     - Voice note recorder      - SLA breach alert |
|   - Voice notes / media         - Slash verbiages (/)      - First response s |
|   - Resolution status           - Inline resolution        - Capacity scaler  |
+-----------------------+-------------------+-----------------------------------+
                        |                   |
                        | HTTP / WebSockets |
                        v                   v
+-------------------------------------------------------------------------------+
|                               SERVER TIER                                     |
|                                                                               |
|   Next.js App Router Proxy (:3000)                                            |
|   - Role-based route guard via JWT cookies (AGENT / MANAGER / CUSTOMER)       |
|                                                                               |
|   Express & Socket.io Realtime Service (:4001)                                |
|   - JWT Authentication & Role Authorization                                   |
|   - Bidirectional Event Emitters (chat:message, chat:assigned, chat:closed)   |
|   - Dynamic Socket Room Orchestration (chat:id, agent:id, managers)           |
|   - Cloudinary Cryptographic Signature Generator                              |
+---------------------------------------+---------------------------------------+
                                        |
                                        | Prisma ORM / @prisma/adapter-pg
                                        v
+-------------------------------------------------------------------------------+
|                               DATABASE TIER                                   |
|                                                                               |
|   PostgreSQL on Neon Cloud Serverless                                         |
|   - Row-Level Locking (SELECT ... FOR UPDATE SKIP LOCKED)                     |
|   - Atomic Transactions ($transaction)                                        |
|   - Tables: Agent, Chat, Message, CannedResponse                              |
+-------------------------------------------------------------------------------+
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Styling**: React 19, Vanilla Tailwind CSS (Modern Light SaaS Aesthetic)
- **State Management**: Zustand (Modularized store slices with optimistic UI updates)
- **Real-Time Transport**: Socket.io Client (`websocket`, `polling` fallback)
- **Media Engine**: HTML5 `MediaRecorder`, Web Audio API, Cloudinary Signed Direct Upload
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js v22
- **Server Framework**: Express 5
- **WebSocket Engine**: Socket.io 4
- **ORM & Database Client**: Prisma 7 with `@prisma/adapter-pg`
- **Database**: PostgreSQL on Neon Cloud
- **Security & Tokens**: JSON Web Tokens (JWT), crypto SHA1 hashing for media upload signatures
- **Testing**: Jest, ts-jest, custom Socket test harness

---

## Agent Assignment Engine

The agent assignment engine ensures incoming customer requests are routed to the best available agent instantly while honoring individual concurrency capacity limits.

### Assignment Rules
1. **Agent Eligibility**: An agent must have `shiftStatus = 'AVAILABLE'`. Agents who are `ON_BREAK`, `WRAP_UP`, `OFFLINE`, or `SHIFT_ENDED` never receive new chats.
2. **Capacity Enforcement**: An agent's current load must satisfy `activeChatCount < chatCapacity` (capacity range: 1 to 4).
3. **Least-Loaded Priority**: Among all eligible agents, the system prioritizes the agent with the lowest `activeChatCount` (`ORDER BY activeChatCount ASC`).
4. **FIFO Waiting Queue**: When all agents are at maximum capacity or offline, incoming requests enter a `WAITING` queue ordered chronologically by `queuedAt ASC`.

### Automatic Reassignment on Free-Up
When an agent resolves an active chat:
1. The active session transitions to `CLOSED` and the agent's `activeChatCount` is decremented atomically.
2. `onAgentFreedUp(agentId)` triggers immediately.
3. If any chat exists in the `WAITING` queue, the oldest queued chat is claimed atomically for that agent without waiting for any polling cycle.

---

## Concurrency Control & ACID Guarantees

High-volume customer support systems face race conditions, deadlocks, and over-allocation when multiple requests hit the server concurrently.

### 1. The Double-Claim Problem (Race Condition)
- **Problem**: Two customer requests arrive at the exact same millisecond. If two worker threads query available agents simultaneously, both could find Agent A with 1 free slot, increment Agent A's count twice, and exceed Agent A's allowed capacity.
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
- **Problem**: Thread 1 holds a lock on a Chat and tries to lock an Agent. Thread 2 holds a lock on the Agent and tries to lock a Chat.
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
- **Problem**: During sudden traffic bursts, multiple assignment attempts might collide within the database transaction window.
- **Solution**: A retry loop with randomized jitter in `assignment.service.ts`:
  ```typescript
  const ASSIGNMENT_RETRY_ATTEMPTS = 3;
  const ASSIGNMENT_RETRY_BASE_DELAY_MS = 30;

  function jitteredDelay(attempt: number) {
    const base = ASSIGNMENT_RETRY_BASE_DELAY_MS * (attempt + 1);
    const jitter = Math.random() * base * 0.5;
    return delay(base + jitter);
  }
  ```

---

## Real-Time WebSocket Protocol

All state synchronization uses an event-driven Socket.io protocol organized into targeted rooms:
- `chat:${chatId}`: Customer and assigned agent.
- `agent:${agentId}`: Direct agent lifecycle signals.
- `managers`: Supervisors receiving live performance and queue telemetry.

| Event Name | Direction | Payload Description |
|---|---|---|
| `chat:new` | Client &rarr; Server | Customer requests a new session |
| `chat:queued` | Server &rarr; Client/Managers | Notifies room that chat entered FIFO waiting queue |
| `chat:assigned` | Server &rarr; Client/Agent/Managers | Customer matched with agent |
| `chat:message` | Bidirectional | Text or multimedia message (`TEXT`, `IMAGE`, `AUDIO`, `VIDEO`) |
| `chat:closed` | Client/Agent &rarr; Server | Session resolved; triggers immediate auto-reassignment |
| `chat:sla_breach` | Server &rarr; Managers | Alert emitted when customer message waits > 120s with no reply |
| `agent:status_changed`| Server &rarr; Managers | Live agent status shift transition (`AVAILABLE`, `ON_BREAK`, `WRAP_UP`, `OFFLINE`) |
| `agent:capacity_changed`| Server &rarr; Agent/Managers | Manager scales agent concurrency limit (1–4) live mid-shift |
| `agent:performance_updated`| Server &rarr; Managers | Updated `totalLateReplies` and `avgFirstResponseSeconds` |

---

## Multimedia Messaging & Voice Recording

Swish Desk supports rich media exchange with zero application server memory overhead.

### 1. Direct Cloudinary Signed Upload Flow
- Raw media bytes **never** stream through the Node.js Express server.
- The browser requests short-lived cryptographic parameters from `GET /api/chats/upload-signature`.
- The file is uploaded directly from the browser to Cloudinary's global CDN via XHR with real-time percentage progress tracking.
- Only the lightweight secure URL is delivered over WebSockets.
- **Offline / Local Fallback**: When running in demo mode without Cloudinary credentials, the upload engine automatically generates local `URL.createObjectURL(file)` objects so testing works immediately.

### 2. Supported Formats & Limits
| Media Type | Supported Extensions | Max File Size |
|---|---|---|
| **Images** | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | 10 MB |
| **Audio** | `.mp3`, `.wav`, `.ogg`, `.webm`, `.m4a` | 20 MB |
| **Video** | `.mp4`, `.webm`, `.mov` | 50 MB |

### 3. In-Browser High-Fidelity Voice Note Recorder
- Built directly into both Agent Desk and Customer workspaces via `voice-recorder.tsx`.
- Uses `navigator.mediaDevices.getUserMedia` with studio constraints (`echoCancellation: false`, `noiseSuppression: false`, `autoGainControl: false`) ensuring background music, instruments, and vocal nuances are preserved without AI speech-only filtering.
- Visual recording feedback: pulsing red recording indicator + live timer (`00:05`, `00:15`...).
- Built-in review player: listen to audio preview before sending, or discard.
- One-click send converts the recorded stream into a `.webm` audio attachment.

### 4. Inline Media Player Bubbles (`media-bubble.tsx`)
- **Audio Message**: Sleek audio player pill with play/pause, elapsed/total time, and interactive scrubber.
- **Chromium WebM Duration Fix**: Overcomes the known Chromium WebM duration bug (`audio.duration === Infinity`) using dual-layer recovery (seek EOF indexer + Web Audio `AudioContext.decodeAudioData` PCM parsing).
- **Video Message**: Responsive video card with controls, scrubber, and fullscreen toggle.
- **Image Message**: Thumbnail with hover expand badge and click-to-zoom lightbox modal.

---

## Supervisor Manager Intelligence

The manager dashboard (`/manager`) gives supervisors comprehensive visibility over live operations and agent performance:

### 1. Live Performance Leaderboard
- Displays all registered specialists in real time.
- **Status Badges**: Live shift status indicators (`AVAILABLE`, `ON_BREAK`, `WRAP_UP`, `OFFLINE`).
- **Late Replies Column**: Tracks how many times an agent took > 120 seconds to respond to a customer. Agents with late replies are highlighted with red warning badges.
- **First Response Time Column**: Average seconds between chat assignment and the agent's first message.
- **Shift Time Counter**: Live active time and break time counters updating every second.
- **Inline Concurrency Controls**: Plus/Minus buttons to scale an agent's capacity (1 to 4) live mid-shift. If capacity is reduced below active chat count, existing chats continue while new assignments are paused.
- **Load Percentage Bar**: Visual capacity saturation bar.

### 2. Active SLA Breach Alert System
- A high-visibility banner triggers whenever any customer has waited > 120 seconds for an agent reply.
- Shows customer ID, assigned agent name, and live waiting duration in seconds.
- Supervisors can dismiss individual breach alerts once addressed.

### 3. Drill-Down Inspection Drawer
- Clicking any agent's **Late Replies** or **First Response** metric opens a slide-out inspection drawer.
- **Filter Tabs**: View All Chats, Late Replies Only, or Slow First Responses (>60s).
- **Timeline Inspection**: Expand any conversation to inspect the entire chronological message timeline with late response flags highlighted.

---

## Agent Productivity & Slash Commands

To maximize agent throughput, the chat input includes an intelligent canned response system:

### 1. Slash Command Dropdown (`/`)
- Typing `/` inside the message textarea immediately triggers a floating dropdown of canned verbiages.
- Typing after `/` filters results dynamically (e.g. `/greet` or `/order`).
- **Keyboard Navigation**:
  - `ArrowUp` / `ArrowDown`: Highlight next/previous response.
  - `Enter` / `Tab`: Select the highlighted response.
  - `Escape`: Close the menu.
- **Caret-Position Insertion**: Injects the verbiage text precisely at the `/` cursor position rather than simply appending it to the end.

### 2. Database-Backed Canned Responses
- Supports global organization verbiages as well as agent-specific custom templates via the `CannedResponse` PostgreSQL table.

---

## Database Schema

```prisma
datasource db {
  provider = "postgresql"
}

model Agent {
  id                      String      @id @default(uuid())
  email                   String      @unique
  name                    String
  avatarUrl               String?
  shiftStatus             ShiftStatus @default(OFFLINE)
  chatCapacity            Int         @default(2)
  activeChatCount         Int         @default(0)
  totalLateReplies        Int         @default(0)
  avgFirstResponseSeconds Float?
  activeShiftSeconds      Int         @default(0)
  totalBreakSeconds       Int         @default(0)
  shiftStartedAt          DateTime?
  chats                   Chat[]
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt
}

model Chat {
  id                    String     @id @default(uuid())
  customerId            String
  agentId               String?
  agent                 Agent?     @relation(fields: [agentId], references: [id])
  status                ChatStatus @default(WAITING)
  queuedAt              DateTime   @default(now())
  assignedAt            DateTime?
  firstResponseAt       DateTime?
  firstResponseSeconds  Float?
  lateReplyCount        Int        @default(0)
  lastCustomerMessageAt DateTime?
  lastAgentReplyAt      DateTime?
  slaBreached           Boolean    @default(false)
  closedAt              DateTime?
  messages              Message[]
}

model Message {
  id          String      @id @default(uuid())
  chatId      String
  chat        Chat        @relation(fields: [chatId], references: [id])
  senderType  SenderType
  messageType MessageType @default(TEXT)
  text        String
  imageUrl    String?
  sentAt      DateTime    @default(now())
}

model CannedResponse {
  id        String   @id @default(uuid())
  shortcut  String
  title     String
  text      String
  category  String?  @default("General")
  agentId   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
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

enum MessageType {
  TEXT
  IMAGE
  AUDIO
  VIDEO
}
```

---

## Frontend Modular Architecture

The frontend is strictly decoupled into modular, single-responsibility slices and sub-components:

### 1. Zustand Store Modules (`frontend/lib/desk/`)
- [`types.ts`](file:///c:/Users/aryan/Desktop/css/frontend/lib/desk/types.ts): All TypeScript contracts (`AgentProfile`, `Chat`, `Message`, `DeskState`).
- [`agent-session.ts`](file:///c:/Users/aryan/Desktop/css/frontend/lib/desk/agent-session.ts): Agent socket listeners (`chat:assigned`, `chat:message`, `chat:closed`, `agent:capacity_changed`).
- [`manager-session.ts`](file:///c:/Users/aryan/Desktop/css/frontend/lib/desk/manager-session.ts): Supervisor socket listeners (`agent:performance_updated`, `chat:sla_breach`, `agent:shift_updated`).
- [`chat-actions.ts`](file:///c:/Users/aryan/Desktop/css/frontend/lib/desk/chat-actions.ts): User-initiated actions (`sendMessage`, `closeChat`, `updateAgentCapacity`, `dismissSlaBreach`).
- [`desk-store.ts`](file:///c:/Users/aryan/Desktop/css/frontend/lib/desk-store.ts): Concise ~65-line store orchestrator and selector hooks.

### 2. Supervisor Sub-Components (`frontend/components/desk/manager/`)
- [`types.ts`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/types.ts): `PerformanceChat`, `DrillFilterType`, and `formatDuration`.
- [`sla-breach-alert.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/sla-breach-alert.tsx): Real-time SLA breach alert banner.
- [`metrics-cards.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/metrics-cards.tsx): 4 metric tiles (Queue Depth, Active Agents, Slot Concurrency, Late Replies).
- [`agent-performance-table.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/agent-performance-table.tsx): Leaderboard table with inline capacity buttons and drill-down inspection.
- [`queue-table.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/queue-table.tsx): Live FIFO waiting queue with real-time wait duration timers.
- [`drill-down-modal.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager/drill-down-modal.tsx): Slide-out drawer with chat timeline inspection.
- [`manager-board.tsx`](file:///c:/Users/aryan/Desktop/css/frontend/components/desk/manager-board.tsx): Clean ~126-line orchestrator component.

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
JWT_SECRET="swish-jwt-secret-2026"
MANAGER_SECRET_KEY="swish-manager-super-secret-2026"
SOCKET_PORT=4001
CLIENT_ORIGIN="http://localhost:3000"

# Optional Cloudinary credentials (demo fallback active if omitted)
CLOUDINARY_CLOUD_NAME="demo"
CLOUDINARY_API_KEY="demo-key"
CLOUDINARY_API_SECRET="demo-secret"
```

Apply database migrations:
```bash
node scripts/migrate.js
npx prisma generate
```

Start the backend server:
```bash
npm run dev
```
*(Runs on port 4001 with hot reloading)*

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

Start the frontend development server:
```bash
npm run dev
```
*(Runs on http://localhost:3000)*

### 3. Ready-to-Use Workspaces
- **Agent Desk**: `http://localhost:3000/agent`
- **Customer Portal**: `http://localhost:3000/customer`
- **Manager Dashboard**: `http://localhost:3000/manager`

---

## Verification & Test Suites

### Automated Unit Tests
Run the comprehensive backend test suite:
```bash
cd backend
npm test
```
**Test Results (75/75 passing)**:
- `tests/unit/chat.socket.test.ts` (Text, Image, Audio voice note, and Video socket broadcasts)
- `tests/unit/agent.socket.test.ts` (Shift status, capacity scaling, logout transitions)
- `tests/unit/assignment.service.test.ts` (SKIP LOCKED concurrency, FIFO queue assignment)
- `tests/unit/performance.test.ts` (SLA breach detection, first response metrics)
- `tests/unit/slash-command.test.ts` (Canned responses filtering and selection)
- `tests/unit/text-insertion.test.ts` (Caret-position verbiage injection)
- `tests/unit/cloudinary-signature.test.ts` (HMAC SHA1 cryptographic signing)
- `tests/unit/auth.test.ts` (JWT role verification and password hashing)
- `tests/unit/errors.test.ts` (Centralized error handling and status mapping)

### TypeScript Compilation Checks
```bash
# In backend/
npx tsc --noEmit

# In frontend/
npx tsc --noEmit
```
Both exit with code `0` (zero compilation errors).

---

## Production Readiness Checklist
- [x] ACID PostgreSQL Concurrency Control (`FOR UPDATE SKIP LOCKED`)
- [x] Zero Race Conditions in Agent Allocation
- [x] WebSocket Reconnection & Sync Resilience
- [x] Direct Signed Cloudinary Media Uploads (Zero Express Server Memory Strain)
- [x] In-Browser Voice Note Recording with Studio Fidelity
- [x] Inline Audio & Video Players with Chromium WebM Duration Fix
- [x] SLA Breach Alerts (>120s Customer Wait)
- [x] Supervisor Manager Performance Leaderboard & Chat Timeline Inspection
- [x] Slash Command Verbiages with Keyboard Navigation
- [x] Modularized Zustand Store & Decomposed React Components
- [x] 100% Passing Test Suite (75/75 tests across 9 test suites)
