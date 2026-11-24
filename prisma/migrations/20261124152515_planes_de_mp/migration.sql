-- CreateTable
CREATE TABLE "MpPlan" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "trialDays" INTEGER NOT NULL,
    "mpPlanId" TEXT NOT NULL,
    "initPoint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MpPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpPlan_mpPlanId_key" ON "MpPlan"("mpPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "MpPlan_plan_amount_trialDays_key" ON "MpPlan"("plan", "amount", "trialDays");
