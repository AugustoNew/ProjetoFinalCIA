import { redirect } from "next/navigation";
import { AgendaManager } from "@/components/appointments/agenda-manager";
import {
  addCalendarDays,
  getCalendarWeekStart,
  getLocalCalendarDate,
  getUtcCalendarEnvelope,
  isCalendarDate,
} from "@/lib/calendar-date";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const instant = false;

const appointmentStatuses = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
] as const;

type SearchParams = Promise<{
  date?: string | string[];
  view?: string | string[];
  status?: string | string[];
}>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: "PROVIDER" },
    select: { id: true, timeZone: true },
  });
  if (!provider) {
    redirect("/login");
  }

  const query = await searchParams;
  const today = getLocalCalendarDate(new Date(), provider.timeZone);
  const requestedDate = firstValue(query.date);
  const date =
    requestedDate && isCalendarDate(requestedDate) ? requestedDate : today;
  const requestedView = firstValue(query.view);
  const view = requestedView === "week" ? "week" : "day";
  const requestedStatus = firstValue(query.status);
  const status = appointmentStatuses.find(
    (appointmentStatus) => appointmentStatus === requestedStatus,
  );
  const selectedStatus = status ?? "ALL";
  const rangeStart = view === "week" ? getCalendarWeekStart(date) : date;
  const rangeEnd = addCalendarDays(rangeStart, view === "week" ? 7 : 1);
  const dateRange = getUtcCalendarEnvelope(rangeStart, rangeEnd);

  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      startsAt: {
        gte: dateRange.startsAt,
        lt: dateRange.endsAt,
      },
      ...(selectedStatus === "ALL" ? {} : { status: selectedStatus }),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      status: true,
      service: {
        select: {
          name: true,
          durationMinutes: true,
          priceCents: true,
        },
      },
    },
  });

  const dates = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
    addCalendarDays(rangeStart, index),
  );
  const days = dates.map((day) => ({
    date: day,
    appointments: appointments
      .filter(
        (appointment) =>
          getLocalCalendarDate(appointment.startsAt, provider.timeZone) === day,
      )
      .map((appointment) => ({
        ...appointment,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
      })),
  }));

  return (
    <AgendaManager
      date={date}
      days={days}
      status={selectedStatus}
      timeZone={provider.timeZone}
      view={view}
      weekStart={rangeStart}
    />
  );
}
