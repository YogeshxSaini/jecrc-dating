-- AlterTable (idempotent)
-- Use IF NOT EXISTS to avoid failure when the column already exists or migration partially applied
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
