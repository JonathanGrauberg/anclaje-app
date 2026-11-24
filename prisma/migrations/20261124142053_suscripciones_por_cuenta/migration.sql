-- Cada suscripción guarda de qué cuenta de MP es; las previas (de prueba) quedan con "".
ALTER TABLE "Subscription" ADD COLUMN "account" TEXT NOT NULL DEFAULT '';
