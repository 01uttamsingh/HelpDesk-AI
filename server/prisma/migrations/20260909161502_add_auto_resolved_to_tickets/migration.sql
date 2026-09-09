-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "ai_resolving" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_resolved" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tickets_auto_resolved_idx" ON "tickets"("auto_resolved");

-- CreateIndex
CREATE INDEX "tickets_ai_resolving_idx" ON "tickets"("ai_resolving");
