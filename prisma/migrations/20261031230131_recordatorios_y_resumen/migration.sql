-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "lastDigestAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReminderSettings" ADD COLUMN     "lastSentAt" TIMESTAMP(3);
