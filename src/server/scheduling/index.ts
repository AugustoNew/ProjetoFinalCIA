import { AppointmentStatus, UserRole, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTimeLocal } from "@/lib/time-zone";
import { generateAvailableSlots } from "./slots";

export type GetAvailableSlotsOptions = {
  providerId: string;
  serviceId: string;
  date: string;
  minimumNoticeHours?: number;
  slotIntervalMinutes?: number;
};

export type IsSlotAvailableOptions = Omit<GetAvailableSlotsOptions, "date"> & {
  startsAt: Date;
};

type SchedulingClient = Pick<
  Prisma.TransactionClient,
  "user" | "service" | "availability" | "appointment" | "timeOff"
>;

function getDateStart(date: string) {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(date);
  if (!match || Number(match[1]) < 1900) {
    throw new RangeError("Informe uma data no formato AAAA-MM-DD.");
  }

  const dateStart = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(dateStart.getTime()) ||
    dateStart.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError("Informe uma data no formato AAAA-MM-DD.");
  }

  return dateStart;
}

function getUtcSearchRange(date: string) {
  const dateStart = getDateStart(date);

  // The range covers the same local calendar day in every supported time zone.
  return {
    startsAt: new Date(dateStart.getTime() - 36 * 60 * 60 * 1000),
    endsAt: new Date(dateStart.getTime() + 60 * 60 * 60 * 1000),
  };
}

async function loadAvailableSlots(
  {
    providerId,
    serviceId,
    date,
    minimumNoticeHours,
    slotIntervalMinutes,
  }: GetAvailableSlotsOptions,
  client: SchedulingClient = prisma,
) {
  const provider = await client.user.findFirst({
    where: { id: providerId, role: UserRole.PROVIDER },
    select: { id: true, timeZone: true },
  });
  if (!provider) {
    return [];
  }

  const service = await client.service.findFirst({
    where: { id: serviceId, providerId: provider.id, active: true },
    select: { durationMinutes: true },
  });
  if (!service) {
    return [];
  }

  const dayOfWeek = getDateStart(date).getUTCDay();
  const availability = await client.availability.findMany({
    where: { providerId: provider.id, dayOfWeek },
    select: { dayOfWeek: true, startTime: true, endTime: true },
  });
  if (availability.length === 0) {
    return [];
  }

  const range = getUtcSearchRange(date);
  const [appointments, timeOffs] = await Promise.all([
    client.appointment.findMany({
      where: {
        providerId: provider.id,
        status: { not: AppointmentStatus.CANCELLED },
        startsAt: { lte: range.endsAt },
        endsAt: { gte: range.startsAt },
      },
      select: { startsAt: true, endsAt: true, status: true },
    }),
    client.timeOff.findMany({
      where: {
        providerId: provider.id,
        startsAt: { lte: range.endsAt },
        endsAt: { gte: range.startsAt },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return generateAvailableSlots({
    date,
    timeZone: provider.timeZone,
    serviceDurationMinutes: service.durationMinutes,
    availability,
    appointments,
    timeOffs,
    minimumNoticeHours,
    slotIntervalMinutes,
  });
}

export async function getAvailableSlots(
  options: GetAvailableSlotsOptions,
): Promise<Date[]> {
  return loadAvailableSlots(options);
}

export async function isSlotAvailable(
  {
    providerId,
    serviceId,
    startsAt,
    minimumNoticeHours,
    slotIntervalMinutes,
  }: IsSlotAvailableOptions,
  client: SchedulingClient = prisma,
): Promise<boolean> {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
    return false;
  }

  const provider = await client.user.findFirst({
    where: { id: providerId, role: UserRole.PROVIDER },
    select: { timeZone: true },
  });
  if (!provider) {
    return false;
  }

  const localDate = formatDateTimeLocal(startsAt, provider.timeZone).slice(
    0,
    10,
  );
  const availableSlots = await loadAvailableSlots(
    {
      providerId,
      serviceId,
      date: localDate,
      minimumNoticeHours,
      slotIntervalMinutes,
    },
    client,
  );

  return availableSlots.some((slot) => slot.getTime() === startsAt.getTime());
}

export { generateAvailableSlots } from "./slots";
export type { SlotGenerationInput } from "./slots";
