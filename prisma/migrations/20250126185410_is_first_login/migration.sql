/*
  Warnings:

  - You are about to drop the column `isFirstLogin` on the `Startup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Startup" DROP COLUMN "isFirstLogin";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isFirstLogin" BOOLEAN NOT NULL DEFAULT false;
