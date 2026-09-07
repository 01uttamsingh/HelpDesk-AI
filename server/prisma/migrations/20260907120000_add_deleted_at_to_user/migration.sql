-- AlterTable
ALTER TABLE "user" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");
