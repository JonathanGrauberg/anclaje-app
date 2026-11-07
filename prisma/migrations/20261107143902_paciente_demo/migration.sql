-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "demoCreatedAt" TIMESTAMP(3);
