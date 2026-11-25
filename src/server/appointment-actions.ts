"use server";

import { AppointmentStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const appointmentActionSchema = z.object({
  appointmentId: z.string().trim().min(1).max(100),
  status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]),
});

type AppointmentActionResult =
  { success: true; message: string } | { success: false; message: string };

export async function updateAppointmentStatus(
  appointmentId: unknown,
  status: unknown,
): Promise<AppointmentActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true },
  });
  if (!provider) {
    return { success: false, message: "Prestador não encontrado." };
  }

  const parsedInput = appointmentActionSchema.safeParse({
    appointmentId,
    status,
  });
  if (!parsedInput.success) {
    return { success: false, message: "Ação de agendamento inválida." };
  }

  const currentStatus =
    parsedInput.data.status === "CONFIRMED"
      ? AppointmentStatus.PENDING
      : parsedInput.data.status === "CANCELLED"
        ? {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          }
        : AppointmentStatus.CONFIRMED;

  const result = await prisma.appointment.updateMany({
    where: {
      id: parsedInput.data.appointmentId,
      providerId: provider.id,
      status: currentStatus,
    },
    data: { status: parsedInput.data.status },
  });

  if (result.count === 0) {
    return {
      success: false,
      message:
        "O agendamento não foi encontrado ou seu status já foi alterado.",
    };
  }

  revalidatePath("/painel/agenda");
  revalidatePath("/painel");

  const messages = {
    CONFIRMED: "Agendamento confirmado.",
    CANCELLED: "Agendamento cancelado.",
    COMPLETED: "Agendamento marcado como concluído.",
  } as const;

  return { success: true, message: messages[parsedInput.data.status] };
}
