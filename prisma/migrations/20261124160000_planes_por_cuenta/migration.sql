-- Los planes de MP quedan asociados a la cuenta (huella del access token).
-- Idempotente: antes tenía una fecha anterior a la creación de "MpPlan" (en producción ya corrió
-- con el nombre viejo, así que acá no hace nada).
DROP INDEX IF EXISTS "MpPlan_plan_amount_trialDays_key";
ALTER TABLE "MpPlan" ADD COLUMN IF NOT EXISTS "account" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS "MpPlan_account_plan_amount_trialDays_key" ON "MpPlan"("account", "plan", "amount", "trialDays");
