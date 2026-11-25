import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendCancellationEmails } from "@/server/email/notifications";

const cancellableStatuses = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export async function cancelAppointmentAndNotify(
  where: Prisma.AppointmentWhereInput,
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
  if (!appointment) {
    return false;
  }

  const result = await prisma.appointment.updateMany({
    where: appointmentWhere,
    data: { status: AppointmentStatus.CANCELLED },
  });
  if (result.count === 0) {
    return false;
  }

  await sendCancellationEmails(appointment);
  return true;
}
