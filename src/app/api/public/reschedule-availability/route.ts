import { AppointmentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { isCalendarDate } from "@/lib/calendar-date";
import { meetsCancellationNotice } from "@/lib/cancellation-policy";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/server/scheduling";

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const cancelToken = searchParams.get("token");
  const date = searchParams.get("date");
  if (
    !cancelToken ||
    !cancelTokenPattern.test(cancelToken) ||
    !date ||
    !isCalendarDate(date)
  ) {
    return NextResponse.json(
      { error: "Informe um link de agendamento e uma data válidos." },
      { status: 400 },
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken },
    select: {
      id: true,
      providerId: true,
      serviceId: true,
      startsAt: true,
      status: true,
      provider: {
        select: { minimumCancellationNoticeHours: true },
      },
    },
  });
  if (!appointment) {
    return NextResponse.json(
      { error: "Agendamento não encontrado." },
      { status: 404 },
    );
  }

  if (
    appointment.status !== AppointmentStatus.PENDING &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    return NextResponse.json(
      { error: "Este agendamento não pode mais ser reagendado." },
      { status: 409 },
    );
  }

  if (
    !meetsCancellationNotice(
      appointment.startsAt,
      appointment.provider.minimumCancellationNoticeHours,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "O prazo mínimo para cancelar ou reagendar este agendamento já passou.",
      },
      { status: 409 },
    );
  }

  const slots = await getAvailableSlots({
    providerId: appointment.providerId,
    serviceId: appointment.serviceId,
    date,
    excludeAppointmentId: appointment.id,
  });

  return NextResponse.json(
    {
      slots: slots
        .filter((slot) => slot.getTime() !== appointment.startsAt.getTime())
        .map((slot) => slot.toISOString()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
