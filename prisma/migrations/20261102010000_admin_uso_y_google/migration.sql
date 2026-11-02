-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "licenseJurisdiction" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_licenseJurisdiction_licenseNumber_key" ON "ProfessionalProfile"("licenseJurisdiction", "licenseNumber");


-- Las cuentas profesionales existentes las dio de alta el admin: quedan verificadas.
UPDATE "ProfessionalProfile" SET "verifiedAt" = "createdAt" WHERE "verifiedAt" IS NULL;
