-- Los planes de MP quedan asociados a la cuenta (huella del access token).
DROP INDEX "MpPlan_plan_amount_trialDays_key";
ALTER TABLE "MpPlan" ADD COLUMN "account" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "MpPlan_account_plan_amount_trialDays_key" ON "MpPlan"("account", "plan", "amount", "trialDays");
