import { timingSafeEqual } from "node:crypto";
import { AppointmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAppointmentReminderEmail } from "@/server/email/notifications";

const reminderWindowStartMs = (24 * 60 - 30) * 60 * 1000;
const reminderWindowEndMs = 24 * 60 * 60 * 1000;
const claimLeaseMs = 15 * 60 * 1000;
const batchSize = 100;

function isAuthorized(authorization: string | null, secret: string) {
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }

  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "[email:reminders] CRON_SECRET must be configured with at least 32 characters.",
    );
    return NextResponse.json(
      { error: "O endpoint de lembretes não está configurado." },
      { status: 500 },
    );
  }

  if (!isAuthorized(authorization, secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const now = new Date();
  const reminderStartsAt = new Date(now.getTime() + reminderWindowStartMs);
  const reminderEndsAt = new Date(now.getTime() + reminderWindowEndMs);
  const staleClaimBefore = new Date(now.getTime() - claimLeaseMs);
  const dueAppointments = await prisma.appointment.findMany({
    where: {
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      startsAt: { gte: reminderStartsAt, lt: reminderEndsAt },
      reminderSentAt: null,
      OR: [
        { reminderClaimedAt: null },
        { reminderClaimedAt: { lt: staleClaimBefore } },
      ],
    },
    orderBy: { startsAt: "asc" },
    take: batchSize,
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      cancelToken: true,
      provider: {
        select: { name: true, email: true, timeZone: true },
      },
      service: {
        select: {
          name: true,
          durationMinutes: true,
          priceCents: true,
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  for (const appointment of dueAppointments) {
    const claim = await prisma.appointment.updateMany({
      where: {
        id: appointment.id,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
        startsAt: { gte: reminderStartsAt, lt: reminderEndsAt },
        reminderSentAt: null,
        OR: [
          { reminderClaimedAt: null },
          { reminderClaimedAt: { lt: staleClaimBefore } },
        ],
      },
      data: { reminderClaimedAt: now },
    });
    if (claim.count === 0) {
      continue;
    }

    const emailSent = await sendAppointmentReminderEmail(appointment);
    if (emailSent) {
      const completed = await prisma.appointment.updateMany({
        where: {
          id: appointment.id,
          reminderSentAt: null,
          reminderClaimedAt: now,
        },
        data: { reminderSentAt: new Date(), reminderClaimedAt: null },
      });
      if (completed.count > 0) {
        sent += 1;
      } else {
        failed += 1;
        console.error(
          `[email:reminders] Could not mark reminder as sent for appointment ${appointment.id}.`,
        );
      }
    } else {
      failed += 1;
      await prisma.appointment.updateMany({
        where: { id: appointment.id, reminderClaimedAt: now },
        data: { reminderClaimedAt: null },
      });
    }
  }

  return NextResponse.json({
    processed: dueAppointments.length,
    sent,
    failed,
  });
}
