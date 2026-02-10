/*
  Warnings:

  - You are about to drop the column `turnExpiryMinutes` on the `Queue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "turnExpiryMinutes",
ADD COLUMN     "graceTime" INTEGER NOT NULL DEFAULT 5;
