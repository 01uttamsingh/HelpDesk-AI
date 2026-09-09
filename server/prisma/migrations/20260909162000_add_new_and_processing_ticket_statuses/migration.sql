-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'NEW';
ALTER TYPE "TicketStatus" ADD VALUE 'PROCESSING';

-- DropIndex
DROP INDEX IF EXISTS "tickets_ai_resolving_idx";

-- DropIndex
DROP INDEX IF EXISTS "tickets_auto_resolved_idx";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "ai_resolving",
DROP COLUMN IF EXISTS "auto_resolved",
ALTER COLUMN "status" SET DEFAULT 'NEW';
