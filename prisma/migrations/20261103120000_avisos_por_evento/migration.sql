-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "pushDayBeforeAt" TIMESTAMP(3),
ADD COLUMN     "pushSoonAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NotificationPrefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentDayBefore" BOOLEAN NOT NULL DEFAULT true,
    "appointmentSoon" BOOLEAN NOT NULL DEFAULT false,
    "appointmentChanges" BOOLEAN NOT NULL DEFAULT true,
    "feedback" BOOLEAN NOT NULL DEFAULT true,
    "assignments" BOOLEAN NOT NULL DEFAULT true,
    "patientCancelled" BOOLEAN NOT NULL DEFAULT true,
    "patientLinked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPrefs_userId_key" ON "NotificationPrefs"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPrefs" ADD CONSTRAINT "NotificationPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

