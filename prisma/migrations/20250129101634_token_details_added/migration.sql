/*
  Warnings:

  - You are about to drop the column `balance` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Account` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USDC');

-- DropIndex
DROP INDEX "Account_address_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "balance",
DROP COLUMN "currency";

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USDC',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" UUID NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenDetails" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "TokenDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenDetails_chainId_key" ON "TokenDetails"("chainId");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
