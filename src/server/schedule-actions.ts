"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  timeOffIdSchema,
  timeOffSchema,
  timeZoneSchema,
  weeklyAvailabilitySchema,
} from "@/lib/schedule-validation";
import { localDateTimeToUtc } from "@/lib/time-zone";

type ScheduleActionResult =
  { success: true; message: string } | { success: false; message: string };

async function getProvider() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true, timeZone: true },
  });
}

function getValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Confira os dados informados.";
}

function refreshSchedule() {
  revalidatePath("/painel/horarios");
}

export async function saveWeeklyAvailability(
  input: unknown,
): Promise<ScheduleActionResult> {
  const provider = await getProvider();
  if (!provider) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedInput = weeklyAvailabilitySchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      message: getValidationMessage(parsedInput.error),
    };
  }

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { providerId: provider.id } }),
    prisma.availability.createMany({
      data: parsedInput.data.map((interval) => ({
        ...interval,
        providerId: provider.id,
      })),
    }),
  ]);

  refreshSchedule();
  return { success: true, message: "Disponibilidade semanal salva." };
}

export async function updateProviderTimeZone(
  input: unknown,
): Promise<ScheduleActionResult> {
  const provider = await getProvider();
  if (!provider) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedTimeZone = timeZoneSchema.safeParse(input);
  if (!parsedTimeZone.success) {
    return {
      success: false,
      message: getValidationMessage(parsedTimeZone.error),
    };
  }

  await prisma.user.updateMany({
    where: { id: provider.id, role: UserRole.PROVIDER },
    data: { timeZone: parsedTimeZone.data },
  });

  refreshSchedule();
  return { success: true, message: "Fuso horário atualizado." };
}

export async function createTimeOff(
  input: unknown,
): Promise<ScheduleActionResult> {
  const provider = await getProvider();
  if (!provider) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedInput = timeOffSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      success: false,
      message: getValidationMessage(parsedInput.error),
    };
  }

  let startsAt: Date;
  let endsAt: Date;
  try {
    startsAt = localDateTimeToUtc(
      parsedInput.data.startsAtLocal,
      provider.timeZone,
    );
    endsAt = localDateTimeToUtc(
      parsedInput.data.endsAtLocal,
      provider.timeZone,
    );
  } catch (error) {
    if (error instanceof RangeError) {
      return { success: false, message: error.message };
    }

    throw error;
  }

  if (startsAt >= endsAt) {
    return {
      success: false,
      message: "O início deve ser anterior ao fim no fuso selecionado.",
    };
  }

  await prisma.timeOff.create({
    data: {
      providerId: provider.id,
      startsAt,
      endsAt,
      reason: parsedInput.data.reason,
    },
  });

  refreshSchedule();
  return { success: true, message: "Folga cadastrada com sucesso." };
}

export async function deleteTimeOff(
  input: unknown,
): Promise<ScheduleActionResult> {
  const provider = await getProvider();
  if (!provider) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedId = timeOffIdSchema.safeParse(input);
  if (!parsedId.success) {
    return { success: false, message: "Bloqueio não encontrado." };
  }

  const result = await prisma.timeOff.deleteMany({
    where: { id: parsedId.data, providerId: provider.id },
  });
  if (result.count === 0) {
    return { success: false, message: "Bloqueio não encontrado." };
  }

  refreshSchedule();
  return { success: true, message: "Folga removida." };
}
