import { isSupportedTimeZone, localDateTimeToUtc } from "../../lib/time-zone";

type AvailabilityInterval = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type BusyInterval = {
  startsAt: Date;
  endsAt: Date;
  status?: string;
};

export type SlotGenerationInput = {
  date: string;
  timeZone: string;
  serviceDurationMinutes: number;
  availability: AvailabilityInterval[];
  appointments: BusyInterval[];
  timeOffs: BusyInterval[];
  now?: Date;
  minimumNoticeHours?: number;
  slotIntervalMinutes?: number;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minuteInMilliseconds = 60_000;

function parseDate(date: string) {
  const match = datePattern.exec(date);
  if (!match) {
    throw new RangeError("A data deve estar no formato AAAA-MM-DD.");
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  result.setUTCHours(12, 0, 0, 0);

  if (
    year < 1900 ||
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  ) {
    throw new RangeError("Informe uma data válida.");
  }

  return { year, month, day, dayOfWeek: result.getUTCDay() };
}

function parseTime(value: string) {
  const match = timePattern.exec(value);
  if (!match) {
    throw new RangeError(`Horário semanal inválido: ${value}.`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const remainder = String(minutes % 60).padStart(2, "0");
  return `${hours}:${remainder}`;
}

function validateConfiguration({
  timeZone,
  serviceDurationMinutes,
  minimumNoticeHours,
  slotIntervalMinutes,
  now,
}: {
  timeZone: string;
  serviceDurationMinutes: number;
  minimumNoticeHours: number;
  slotIntervalMinutes: number;
  now: Date;
}) {
  if (!isSupportedTimeZone(timeZone)) {
    throw new RangeError("O fuso horário do prestador é inválido.");
  }
  if (
    !Number.isInteger(serviceDurationMinutes) ||
    serviceDurationMinutes <= 0
  ) {
    throw new RangeError("A duração do serviço deve ser maior que zero.");
  }
  if (!Number.isFinite(minimumNoticeHours) || minimumNoticeHours < 0) {
    throw new RangeError(
      "A antecedência mínima deve ser maior ou igual a zero.",
    );
  }
  if (!Number.isInteger(slotIntervalMinutes) || slotIntervalMinutes <= 0) {
    throw new RangeError("O intervalo entre horários deve ser maior que zero.");
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("A data atual informada é inválida.");
  }
}

function overlaps(startsAt: Date, endsAt: Date, busyIntervals: BusyInterval[]) {
  return busyIntervals.some(
    (busy) =>
      startsAt < busy.endsAt &&
      busy.startsAt < endsAt &&
      busy.status !== "CANCELLED",
  );
}

export function generateAvailableSlots({
  date,
  timeZone,
  serviceDurationMinutes,
  availability,
  appointments,
  timeOffs,
  now = new Date(),
  minimumNoticeHours = 2,
  slotIntervalMinutes = 15,
}: SlotGenerationInput): Date[] {
  validateConfiguration({
    timeZone,
    serviceDurationMinutes,
    minimumNoticeHours,
    slotIntervalMinutes,
    now,
  });

  const { year, month, day, dayOfWeek } = parseDate(date);
  const localDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const minimumStart =
    now.getTime() + minimumNoticeHours * 60 * minuteInMilliseconds;
  const slotLength = serviceDurationMinutes * minuteInMilliseconds;
  const slots = new Map<number, Date>();

  for (const interval of availability) {
    if (interval.dayOfWeek !== dayOfWeek) {
      continue;
    }

    const intervalStartMinutes = parseTime(interval.startTime);
    const intervalEndMinutes = parseTime(interval.endTime);
    if (intervalStartMinutes >= intervalEndMinutes) {
      throw new RangeError(
        "O início da disponibilidade deve ser anterior ao fim.",
      );
    }

    let intervalStartsAt: Date;
    let intervalEndsAt: Date;
    try {
      intervalStartsAt = localDateTimeToUtc(
        `${localDate}T${formatTime(intervalStartMinutes)}`,
        timeZone,
      );
      intervalEndsAt = localDateTimeToUtc(
        `${localDate}T${formatTime(intervalEndMinutes)}`,
        timeZone,
      );
    } catch (error) {
      if (error instanceof RangeError) {
        continue;
      }

      throw error;
    }

    for (
      let startMinutes = intervalStartMinutes;
      startMinutes < intervalEndMinutes;
      startMinutes += slotIntervalMinutes
    ) {
      let startsAt: Date;
      try {
        startsAt = localDateTimeToUtc(
          `${localDate}T${formatTime(startMinutes)}`,
          timeZone,
        );
      } catch (error) {
        if (error instanceof RangeError) {
          continue;
        }

        throw error;
      }

      const endsAt = new Date(startsAt.getTime() + slotLength);
      if (
        startsAt < intervalStartsAt ||
        endsAt > intervalEndsAt ||
        startsAt.getTime() < minimumStart ||
        overlaps(startsAt, endsAt, appointments) ||
        overlaps(startsAt, endsAt, timeOffs)
      ) {
        continue;
      }

      slots.set(startsAt.getTime(), startsAt);
    }
  }

  return Array.from(slots.values()).sort(
    (left, right) => left.getTime() - right.getTime(),
  );
}
