import { z } from "zod";
import { isSupportedTimeZone } from "@/lib/time-zone";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const localDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d$/;

function isValidLocalDateTime(value: string) {
  const match = localDateTimePattern.exec(value);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Informe um fuso horário.")
  .max(100, "O fuso horário é muito longo.")
  .refine(isSupportedTimeZone, "Informe um fuso IANA válido.");

export const cancellationNoticeHoursSchema = z
  .number()
  .int("A antecedência deve ser informada em horas inteiras.")
  .min(0, "A antecedência não pode ser negativa.")
  .max(720, "A antecedência máxima é de 720 horas.");

export const weeklyAvailabilitySchema = z
  .array(
    z
      .object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(timePattern, "Informe horários válidos."),
        endTime: z.string().regex(timePattern, "Informe horários válidos."),
      })
      .strict(),
  )
  .max(56, "Cada dia pode ter no máximo 8 intervalos.")
  .superRefine((intervals, context) => {
    const intervalsByDay = new Map<number, typeof intervals>();

    intervals.forEach((interval, index) => {
      if (interval.startTime >= interval.endTime) {
        context.addIssue({
          code: "custom",
          message: "O início do intervalo deve ser anterior ao fim.",
          path: [index, "endTime"],
        });
      }

      const dayIntervals = intervalsByDay.get(interval.dayOfWeek) ?? [];
      if (dayIntervals.length >= 8) {
        context.addIssue({
          code: "custom",
          message: "Cada dia pode ter no máximo 8 intervalos.",
          path: [index, "startTime"],
        });
      }

      for (const existing of dayIntervals) {
        if (
          interval.startTime < existing.endTime &&
          existing.startTime < interval.endTime
        ) {
          context.addIssue({
            code: "custom",
            message: "Os intervalos do mesmo dia não podem se sobrepor.",
            path: [index, "startTime"],
          });
          break;
        }
      }

      dayIntervals.push(interval);
      intervalsByDay.set(interval.dayOfWeek, dayIntervals);
    });
  });

export const timeOffSchema = z
  .object({
    startsAtLocal: z
      .string()
      .refine(isValidLocalDateTime, "Informe uma data e hora inicial válidas."),
    endsAtLocal: z
      .string()
      .refine(isValidLocalDateTime, "Informe uma data e hora final válidas."),
    reason: z
      .string()
      .trim()
      .min(2, "Informe um motivo para a folga.")
      .max(200, "O motivo deve ter no máximo 200 caracteres."),
  })
  .superRefine((timeOff, context) => {
    if (timeOff.startsAtLocal >= timeOff.endsAtLocal) {
      context.addIssue({
        code: "custom",
        message: "O início deve ser anterior ao fim.",
        path: ["endsAtLocal"],
      });
    }
  });

export const timeOffIdSchema = z.string().trim().min(1).max(100);

export type WeeklyAvailabilityInput = z.infer<typeof weeklyAvailabilitySchema>;
export type TimeOffInput = z.infer<typeof timeOffSchema>;
