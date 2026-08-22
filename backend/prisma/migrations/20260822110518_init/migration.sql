-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'ON_BREAK', 'WRAP_UP', 'SHIFT_ENDED');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('WAITING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('AGENT', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "managerId" TEXT,
    "shiftStatus" "ShiftStatus" NOT NULL DEFAULT 'OFFLINE',
    "breakStartedAt" TIMESTAMP(3),
    "breakDurationMinutes" INTEGER,
    "chatCapacity" INTEGER NOT NULL DEFAULT 2,
    "activeChatCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'WAITING',
    "assignedAgentId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "text" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
