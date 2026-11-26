-- CreateEnum
CREATE TYPE "AppointmentRequestStatus" AS ENUM ('UNCONFIRMED', 'NEW', 'CONTACTED', 'ACCEPTED');

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "acceptsRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "approaches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "coverage" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "inPerson" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "photoKey" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "publicPhone" TEXT,
ADD COLUMN     "publicProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "whatsapp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "nameEnc" TEXT NOT NULL,
    "emailEnc" TEXT NOT NULL,
    "phoneEnc" TEXT,
    "messageEnc" TEXT,
    "modality" "AppointmentModality",
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "tokenHash" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentRequest_tokenHash_key" ON "AppointmentRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "AppointmentRequest_professionalId_status_idx" ON "AppointmentRequest"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_slug_key" ON "ProfessionalProfile"("slug");

-- AddForeignKey
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
