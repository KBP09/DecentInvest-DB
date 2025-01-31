/*
  Warnings:

  - Added the required column `about` to the `CEOProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthday` to the `CEOProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ceoName` to the `CEOProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `about` to the `InvestorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthday` to the `InvestorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `investorName` to the `InvestorProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CEOProfile" ADD COLUMN     "about" TEXT NOT NULL,
ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ceoName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InvestorProfile" ADD COLUMN     "about" TEXT NOT NULL,
ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "investorName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT false;
