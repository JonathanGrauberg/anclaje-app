-- CreateTable
CREATE TABLE "PatientFile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "titleEnc" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientFile_storageKey_key" ON "PatientFile"("storageKey");

-- CreateIndex
CREATE INDEX "PatientFile_professionalId_patientId_createdAt_idx" ON "PatientFile"("professionalId", "patientId", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientFile" ADD CONSTRAINT "PatientFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFile" ADD CONSTRAINT "PatientFile_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
