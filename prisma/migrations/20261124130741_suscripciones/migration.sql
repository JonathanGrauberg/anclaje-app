-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "freeForever" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mpPreapprovalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "nextPaymentAt" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_mpPreapprovalId_key" ON "Subscription"("mpPreapprovalId");

-- CreateIndex
CREATE INDEX "Subscription_professionalId_createdAt_idx" ON "Subscription"("professionalId", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
