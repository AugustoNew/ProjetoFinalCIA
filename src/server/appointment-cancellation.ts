import { AppointmentStatus, Prisma } from "@prisma/client";
import { meetsCancellationNotice } from "@/lib/cancellation-policy";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmails } from "@/server/email/notifications";

const cancellableStatuses = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export async function cancelAppointmentAndNotify(
  where: Prisma.AppointmentWhereInput,
  options: { respectMinimumNotice?: boolean } = {},
) {
  const appointmentWhere: Prisma.AppointmentWhereInput = {
    AND: [where, { status: { in: cancellableStatuses } }],
  };
  const appointment = await prisma.appointment.findFirst({
    where: appointmentWhere,
    select: {
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      cancelToken: true,
      provider: {
        select: {
          name: true,
          email: true,
          timeZone: true,
          minimumCancellationNoticeHours: true,
        },
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
  if (!appointment) {
    return "UNAVAILABLE" as const;
  }

  const now = new Date();
  const minimumNoticeHours =
    appointment.provider.minimumCancellationNoticeHours;
  if (
    options.respectMinimumNotice &&
    !meetsCancellationNotice(appointment.startsAt, minimumNoticeHours, now)
  ) {
    return "TOO_LATE" as const;
  }

  const updateConditions: Prisma.AppointmentWhereInput[] = [
    appointmentWhere,
    {
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
    },
  ];
  if (options.respectMinimumNotice) {
    updateConditions.push({
      startsAt: {
        gt: now,
        gte: new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000),
      },
    });
  }

  const result = await prisma.appointment.updateMany({
    where: { AND: updateConditions },
    data: { status: AppointmentStatus.CANCELLED },
  });
  if (result.count === 0) {
    return "UNAVAILABLE" as const;
  }

  await sendCancellationEmails(appointment);
  return "CANCELLED" as const;
}
