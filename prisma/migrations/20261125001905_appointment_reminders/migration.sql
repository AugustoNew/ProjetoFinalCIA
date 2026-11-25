-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "reminderClaimedAt" DATETIME;
ALTER TABLE "Appointment" ADD COLUMN "reminderSentAt" DATETIME;

-- CreateIndex
CREATE INDEX "Appointment_status_startsAt_reminderSentAt_idx" ON "Appointment"("status", "startsAt", "reminderSentAt");
