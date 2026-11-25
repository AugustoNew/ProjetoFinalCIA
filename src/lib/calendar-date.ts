import { formatDateTimeLocal } from "@/lib/time-zone";

const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const millisecondsPerHour = 60 * 60 * 1000;

export function isCalendarDate(value: string) {
  const match = calendarDatePattern.exec(value);
  if (!match || Number(match[1]) < 1900) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addCalendarDays(value: string, days: number) {
  if (!isCalendarDate(value) || !Number.isInteger(days)) {
    throw new RangeError("Data ou intervalo inválido.");
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCalendarWeekStart(value: string) {
  if (!isCalendarDate(value)) {
    throw new RangeError("Informe uma data válida.");
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  const dayOfWeek = date.getUTCDay();
  return addCalendarDays(value, dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
}

export function getCalendarMonthRange(value: string) {
  if (!isCalendarDate(value)) {
    throw new RangeError("Informe uma data válida.");
  }

  const date = new Date(`${value}T12:00:00.000Z`);
  const firstDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12),
  );
  const firstDayNextMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 12),
  );

  return {
    start: firstDay.toISOString().slice(0, 10),
    end: firstDayNextMonth.toISOString().slice(0, 10),
  };
}

export function getUtcCalendarEnvelope(startDate: string, endDate: string) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
    throw new RangeError("Informe datas válidas.");
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  return {
    startsAt: new Date(start.getTime() - 36 * millisecondsPerHour),
    endsAt: new Date(end.getTime() + 36 * millisecondsPerHour),
  };
}

export function getLocalCalendarDate(date: Date, timeZone: string) {
  return formatDateTimeLocal(date, timeZone).slice(0, 10);
}

export function formatCalendarDate(
  value: string,
  options?: { weekday?: boolean },
) {
  if (!isCalendarDate(value)) {
    throw new RangeError("Informe uma data válida.");
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(options?.weekday ? { weekday: "long" as const } : {}),
  }).format(new Date(`${value}T12:00:00.000Z`));
}
