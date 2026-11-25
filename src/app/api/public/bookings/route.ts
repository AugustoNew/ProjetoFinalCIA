import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { publicBookingSchema } from "@/lib/booking-validation";
import {
  createPublicBooking,
  isBookingRace,
  PublicBookingError,
} from "@/server/public-booking";
import { checkRateLimit } from "@/server/rate-limit";

const bookingLimit = 5;
const bookingWindowMs = 15 * 60 * 1000;

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp =
    request.headers.get("x-real-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    "unknown";
  const rateLimit = checkRateLimit({
    key: `public-booking:${clientIp}`,
    limit: bookingLimit,
    windowMs: bookingWindowMs,
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

  const parsedBooking = publicBookingSchema.safeParse(body);
  if (!parsedBooking.success) {
    return NextResponse.json(
      {
        error:
          parsedBooking.error.issues[0]?.message ??
          "Confira os dados do agendamento.",
      },
      { status: 400 },
    );
  }

  try {
    const appointment = await createPublicBooking(parsedBooking.data);
    return NextResponse.json(
      { cancelToken: appointment.cancelToken },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PublicBookingError) {
      if (error.code === "PROVIDER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Esta página de agendamento não está disponível." },
          { status: 404 },
        );
      }

      if (error.code === "SERVICE_UNAVAILABLE") {
        return NextResponse.json(
          { error: "Este serviço não está mais disponível." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Este horário acabou de ser reservado. Escolha outro horário disponível.",
        },
        { status: 409 },
      );
    }

    if (
      isBookingRace(error) ||
      (error instanceof Prisma.PrismaClientUnknownRequestError &&
        error.message.includes("SQLITE_BUSY"))
    ) {
      return NextResponse.json(
        {
          error:
            "Este horário acabou de ser reservado. Escolha outro horário disponível.",
        },
        { status: 409 },
      );
    }

    throw error;
  }
}
