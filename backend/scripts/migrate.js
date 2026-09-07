const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageType') THEN
          CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO');
        ELSE
          BEGIN
            ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'AUDIO';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
          BEGIN
            ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'VIDEO';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
        END IF;
      END$$;

      ALTER TABLE "Message" 
      ADD COLUMN IF NOT EXISTS "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
      ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

      ALTER TABLE "Agent"
      ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

      CREATE TABLE IF NOT EXISTS "CannedResponse" (
        "id" TEXT NOT NULL,
        "shortcut" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "text" TEXT NOT NULL,
        "category" TEXT DEFAULT 'General',
        "agentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('Migration successfully applied!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
