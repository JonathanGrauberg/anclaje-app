/*
  Warnings:

  - You are about to drop the column `bodyZones` on the `EmotionEntryItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmotionEntry" ADD COLUMN     "bodyZones" TEXT[];

-- AlterTable
ALTER TABLE "EmotionEntryItem" DROP COLUMN "bodyZones";
