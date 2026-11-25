import { NextResponse } from "next/server";
import { z } from "zod";
import { sendRescheduleEmails } from "@/server/email/notifications";
import { checkRateLimit } from "@/server/rate-limit";
import {
  PublicRescheduleError,
  reschedulePublicAppointment,
} from "@/server/public-rescheduling";

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const rescheduleSchema = z
  .object({
    cancelToken: z.string().regex(cancelTokenPattern),
    startsAt: z
      .string()
      .datetime({ offset: true, message: "Selecione um horário válido." })
      .transform((value) => new Date(value)),
  })
  .strict();

const rescheduleLimit = 5;
const rescheduleWindowMs = 15 * 60 * 1000;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `public-reschedule:${getClientIp(request)}`,
    limit: rescheduleLimit,
    windowMs: rescheduleWindowMs,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler os dados enviados." },
      { status: 400 },
    );
  }

  const parsedInput = rescheduleSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error:
          parsedInput.error.issues[0]?.message ??
          "Confira os dados do reagendamento.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await reschedulePublicAppointment(parsedInput.data);
    await sendRescheduleEmails(
      result.appointment,
      result.previousStartsAt,
      result.previousEndsAt,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PublicRescheduleError) {
      const responses = {
        APPOINTMENT_NOT_FOUND: {
          error: "Agendamento não encontrado.",
          status: 404,
        },
        APPOINTMENT_UNAVAILABLE: {
          error: "Este agendamento não pode mais ser reagendado.",
          status: 409,
        },
        NOTICE_WINDOW: {
          error:
            "O prazo mínimo para cancelar ou reagendar este agendamento já passou.",
          status: 409,
        },
        SAME_TIME: {
          error: "Escolha um horário diferente do atual.",
          status: 400,
        },
        SLOT_UNAVAILABLE: {
          error:
            "Este horário acabou de ficar indisponível. Escolha outro horário.",
          status: 409,
        },
        APPOINTMENT_CHANGED: {
          error:
            "O agendamento foi alterado em outra solicitação. Atualize a página e tente novamente.",
          status: 409,
        },
      } as const;
      const response = responses[error.code];
      return NextResponse.json(
        { error: response.error },
        { status: response.status },
      );
    }

    throw error;
  }
}
