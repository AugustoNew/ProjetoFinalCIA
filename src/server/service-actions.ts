"use server";

import { AppointmentStatus, Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serviceDataSchema, serviceIdSchema } from "@/lib/service-validation";

type ServiceActionResult =
  { success: true; message: string } | { success: false; message: string };

async function getProviderId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true },
  });

  return provider?.id ?? null;
}

function getValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Confira os dados informados.";
}

function refreshServices() {
  revalidatePath("/painel/servicos");
}

export async function createService(
  input: unknown,
): Promise<ServiceActionResult> {
  const providerId = await getProviderId();
  if (!providerId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedInput = serviceDataSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, message: getValidationMessage(parsedInput.error) };
  }

  await prisma.service.create({
    data: { ...parsedInput.data, providerId },
  });

  refreshServices();
  return { success: true, message: "Serviço criado com sucesso." };
}

export async function updateService(
  serviceId: unknown,
  input: unknown,
): Promise<ServiceActionResult> {
  const providerId = await getProviderId();
  if (!providerId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedId = serviceIdSchema.safeParse(serviceId);
  if (!parsedId.success) {
    return { success: false, message: "Serviço não encontrado." };
  }

  const parsedInput = serviceDataSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, message: getValidationMessage(parsedInput.error) };
  }

  const result = await prisma.service.updateMany({
    where: { id: parsedId.data, providerId },
    data: parsedInput.data,
  });

  if (result.count === 0) {
    return { success: false, message: "Serviço não encontrado." };
  }

  refreshServices();
  return { success: true, message: "Serviço atualizado com sucesso." };
}

export async function setServiceActive(
  serviceId: unknown,
  active: unknown,
): Promise<ServiceActionResult> {
  const providerId = await getProviderId();
  if (!providerId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedId = serviceIdSchema.safeParse(serviceId);
  if (!parsedId.success || typeof active !== "boolean") {
    return { success: false, message: "Não foi possível atualizar o serviço." };
  }

  const result = await prisma.service.updateMany({
    where: { id: parsedId.data, providerId },
    data: { active },
  });

  if (result.count === 0) {
    return { success: false, message: "Serviço não encontrado." };
  }

  refreshServices();
  return {
    success: true,
    message: active ? "Serviço ativado." : "Serviço desativado.",
  };
}

export async function deleteService(
  serviceId: unknown,
): Promise<ServiceActionResult> {
  const providerId = await getProviderId();
  if (!providerId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedId = serviceIdSchema.safeParse(serviceId);
  if (!parsedId.success) {
    return { success: false, message: "Serviço não encontrado." };
  }

  const serviceWhere = { id: parsedId.data, providerId };
  const service = await prisma.service.findFirst({
    where: serviceWhere,
    select: { id: true },
  });

  if (!service) {
    return { success: false, message: "Serviço não encontrado." };
  }

  const futureAppointment = await prisma.appointment.findFirst({
    where: {
      serviceId: service.id,
      providerId,
      startsAt: { gte: new Date() },
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
      },
    },
    select: { id: true },
  });

  if (futureAppointment) {
    return {
      success: false,
      message:
        "Este serviço tem agendamentos futuros. Desative-o para impedir novos agendamentos sem perder os existentes.",
    };
  }

  try {
    await prisma.service.deleteMany({ where: serviceWhere });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message:
          "Este serviço possui agendamentos no histórico. Desative-o para preservar esses registros.",
      };
    }

    throw error;
  }

  refreshServices();
  return { success: true, message: "Serviço excluído com sucesso." };
}
