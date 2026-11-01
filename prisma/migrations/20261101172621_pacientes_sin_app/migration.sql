-- AlterTable
ALTER TABLE "CareLink" ALTER COLUMN "consentVersion" DROP NOT NULL,
ALTER COLUMN "consentAcceptedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "patientId" TEXT;

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "contactEnc" TEXT,
ADD COLUMN     "managedById" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
