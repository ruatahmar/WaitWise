/*
  Warnings:

  - You are about to drop the column `maxServing` on the `Queue` table. All the data in the column will be lost.
  - Made the column `turnExpiryMinutes` on table `Queue` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Queue" DROP COLUMN "maxServing",
ADD COLUMN     "serviceSlots" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "turnExpiryMinutes" SET NOT NULL,
ALTER COLUMN "turnExpiryMinutes" SET DEFAULT 5;
