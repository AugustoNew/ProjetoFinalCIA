import { AppointmentStatus, Prisma, UserRole } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { PublicBookingInput } from "@/lib/booking-validation";
import { isSlotAvailable } from "@/server/scheduling";

export class PublicBookingError extends Error {
  constructor(
    public readonly code:
      "PROVIDER_NOT_FOUND" | "SERVICE_UNAVAILABLE" | "SLOT_UNAVAILABLE",
  ) {
    super(code);
  }
}

export async function createPublicBooking(input: PublicBookingInput) {
  return prisma.$transaction(async (transaction) => {
    // The no-op write locks the provider row before checking slots, serializing concurrent bookings.
    const lockedRows = await transaction.$executeRaw`
      UPDATE "User"
      SET "timeZone" = "timeZone"
      WHERE "slug" = ${input.slug}
    `;

    if (lockedRows === 0) {
      throw new PublicBookingError("PROVIDER_NOT_FOUND");
    }

    const provider = await transaction.user.findFirst({
      where: { slug: input.slug, role: UserRole.PROVIDER },
      select: { id: true },
    });
    if (!provider) {
      throw new PublicBookingError("PROVIDER_NOT_FOUND");
    }

    const service = await transaction.service.findFirst({
      where: {
        id: input.serviceId,
        providerId: provider.id,
        active: true,
      },
      select: { id: true, durationMinutes: true },
    });
    if (!service) {
      throw new PublicBookingError("SERVICE_UNAVAILABLE");
    }

    const available = await isSlotAvailable(
      {
        providerId: provider.id,
        serviceId: service.id,
        startsAt: input.startsAt,
      },
      transaction,
    );
    if (!available) {
      throw new PublicBookingError("SLOT_UNAVAILABLE");
    }

    const endsAt = new Date(
      input.startsAt.getTime() + service.durationMinutes * 60_000,
    );

    return transaction.appointment.create({
      data: {
        providerId: provider.id,
        serviceId: service.id,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        startsAt: input.startsAt,
        endsAt,
        status: AppointmentStatus.PENDING,
        cancelToken: randomBytes(32).toString("base64url"),
      },
      select: {
        id: true,
        cancelToken: true,
        startsAt: true,
        endsAt: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
        provider: {
          select: { slug: true, name: true, timeZone: true },
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
  });
}

export function isBookingRace(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}
