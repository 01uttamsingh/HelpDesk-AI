/*
  Warnings:

  - The `category` column on the `tickets` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST');

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "category",
ADD COLUMN     "category" "TicketCategory";

-- CreateIndex
CREATE INDEX "tickets_category_idx" ON "tickets"("category");
