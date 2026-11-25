import { AppointmentStatus } from "@prisma/client";
import { meetsCancellationNotice } from "@/lib/cancellation-policy";
import { prisma } from "@/lib/prisma";
import { isSlotAvailable } from "@/server/scheduling";

export class PublicRescheduleError extends Error {
  constructor(
    public readonly code:
      | "APPOINTMENT_NOT_FOUND"
      | "APPOINTMENT_UNAVAILABLE"
      | "NOTICE_WINDOW"
      | "SAME_TIME"
      | "SLOT_UNAVAILABLE"
      | "APPOINTMENT_CHANGED",
  ) {
    super(code);
  }
}

type RescheduleInput = {
  cancelToken: string;
  startsAt: Date;
};

export async function reschedulePublicAppointment(input: RescheduleInput) {
  return prisma.$transaction(async (transaction) => {
    const appointmentReference = await transaction.appointment.findUnique({
      where: { cancelToken: input.cancelToken },
      select: { providerId: true },
    });
    if (!appointmentReference) {
      throw new PublicRescheduleError("APPOINTMENT_NOT_FOUND");
    }

    const lockedProvider = await transaction.$executeRaw`
      UPDATE "User"
      SET "timeZone" = "timeZone"
      WHERE "id" = ${appointmentReference.providerId}
    `;
    if (lockedProvider === 0) {
      throw new PublicRescheduleError("APPOINTMENT_NOT_FOUND");
    }

    const appointment = await transaction.appointment.findUnique({
      where: { cancelToken: input.cancelToken },
      select: {
        id: true,
        providerId: true,
        serviceId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        cancelToken: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
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
      throw new PublicRescheduleError("APPOINTMENT_NOT_FOUND");
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new PublicRescheduleError("APPOINTMENT_UNAVAILABLE");
    }

    if (
      !meetsCancellationNotice(
        appointment.startsAt,
        appointment.provider.minimumCancellationNoticeHours,
      )
    ) {
      throw new PublicRescheduleError("NOTICE_WINDOW");
    }

    if (input.startsAt.getTime() === appointment.startsAt.getTime()) {
      throw new PublicRescheduleError("SAME_TIME");
    }

    const available = await isSlotAvailable(
      {
        providerId: appointment.providerId,
        serviceId: appointment.serviceId,
        startsAt: input.startsAt,
        excludeAppointmentId: appointment.id,
      },
      transaction,
    );
    if (!available) {
      throw new PublicRescheduleError("SLOT_UNAVAILABLE");
    }

    const endsAt = new Date(
      input.startsAt.getTime() + appointment.service.durationMinutes * 60_000,
    );
    const update = await transaction.appointment.updateMany({
      where: {
        id: appointment.id,
        cancelToken: input.cancelToken,
        status: appointment.status,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
      },
      data: {
        startsAt: input.startsAt,
        endsAt,
        reminderSentAt: null,
        reminderClaimedAt: null,
      },
    });
    if (update.count === 0) {
      throw new PublicRescheduleError("APPOINTMENT_CHANGED");
    }

    return {
      appointment: { ...appointment, startsAt: input.startsAt, endsAt },
      previousStartsAt: appointment.startsAt,
      previousEndsAt: appointment.endsAt,
    };
  });
}
