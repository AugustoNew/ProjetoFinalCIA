type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function parseLocalDateTime(value: string): LocalDateTimeParts {
  const match = localDateTimePattern.exec(value);
  if (!match) {
    throw new RangeError("Informe uma data e hora válidas.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const parts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, 0, 0);

  if (
    parts.year < 1900 ||
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() !== parts.month - 1 ||
    date.getUTCDate() !== parts.day ||
    parts.hour > 23 ||
    parts.minute > 59
  ) {
    throw new RangeError("Informe uma data e hora válidas.");
  }

  return parts;
}

function createWallClockDate(parts: LocalDateTimeParts) {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, 0, 0);
  return date;
}

function getZonedParts(date: Date, timeZone: string): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.get(type);
    if (value === undefined) {
      throw new RangeError(`Não foi possível ler a parte ${type} da data.`);
    }

    return value;
  };

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  return (
    createWallClockDate(getZonedParts(date, timeZone)).getTime() -
    date.getTime()
  );
}

export function isSupportedTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function localDateTimeToUtc(value: string, timeZone: string) {
  const localParts = parseLocalDateTime(value);
  const wallClockDate = createWallClockDate(localParts);
  const wallClockTimestamp = wallClockDate.getTime();
  const offsets = new Set<number>();

  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = new Date(wallClockTimestamp + hours * 60 * 60 * 1000);
    offsets.add(getTimeZoneOffset(sample, timeZone));
  }

  const matchingInstants = new Set<number>();
  for (const offset of offsets) {
    const candidate = new Date(wallClockTimestamp - offset);
    if (sameParts(getZonedParts(candidate, timeZone), localParts)) {
      matchingInstants.add(candidate.getTime());
    }
  }

  if (matchingInstants.size === 0) {
    throw new RangeError(
      "Esse horário local não existe por causa da mudança de horário de verão.",
    );
  }

  if (matchingInstants.size > 1) {
    throw new RangeError(
      "Esse horário local é ambíguo por causa da mudança de horário de verão. Escolha outro.",
    );
  }

  const instant = Array.from(matchingInstants)[0];
  if (instant === undefined) {
    throw new RangeError("Não foi possível converter a data para UTC.");
  }

  return new Date(instant);
}

export function formatDateTimeLocal(date: Date | string, timeZone: string) {
  const parts = getZonedParts(new Date(date), timeZone);
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function formatDateTime(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}
