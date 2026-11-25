import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicSlugForm } from "@/components/profile/public-slug-form";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  addCalendarDays,
  getCalendarMonthRange,
  getLocalCalendarDate,
  getUtcCalendarEnvelope,
} from "@/lib/calendar-date";

export const instant = false;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true, name: true, slug: true, timeZone: true },
  });
  if (!provider) {
    redirect("/login");
  }

  const now = new Date();
  const today = getLocalCalendarDate(now, provider.timeZone);
  const monthRange = getCalendarMonthRange(today);
  const upcomingLastDay = addCalendarDays(today, 7);
  const queryEnd =
    monthRange.end > addCalendarDays(upcomingLastDay, 1)
      ? monthRange.end
      : addCalendarDays(upcomingLastDay, 1);
  const queryRange = getUtcCalendarEnvelope(today, queryEnd);
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      startsAt: {
        gte: queryRange.startsAt,
        lt: queryRange.endsAt,
      },
    },
    select: { startsAt: true, status: true },
  });

  const nonCancelledAppointments = appointments.filter(
    (appointment) => appointment.status !== "CANCELLED",
  );
  const todayCount = nonCancelledAppointments.filter(
    (appointment) =>
      getLocalCalendarDate(appointment.startsAt, provider.timeZone) === today,
  ).length;
  const upcomingCount = appointments.filter((appointment) => {
    const appointmentDate = getLocalCalendarDate(
      appointment.startsAt,
      provider.timeZone,
    );
    return (
      appointment.startsAt > now &&
      appointmentDate >= today &&
      appointmentDate <= upcomingLastDay &&
      (appointment.status === "PENDING" || appointment.status === "CONFIRMED")
    );
  }).length;
  const monthCount = nonCancelledAppointments.filter((appointment) => {
    const appointmentDate = getLocalCalendarDate(
      appointment.startsAt,
      provider.timeZone,
    );
    return (
      appointmentDate >= monthRange.start && appointmentDate < monthRange.end
    );
  }).length;

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">
          Bem-vindo(a), {provider.name}!
        </h1>
        <p className="mt-2 text-zinc-600">
          Este é o seu painel de agendamentos.
        </p>
      </header>

      <section
        aria-label="Resumo dos agendamentos"
        className="grid gap-4 sm:grid-cols-3"
      >
        {[
          { label: "Agendamentos de hoje", value: todayCount },
          { label: "Próximos 7 dias", value: upcomingCount },
          { label: "Total do mês", value: monthCount },
        ].map((card) => (
          <article
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            key={card.label}
          >
            <p className="text-sm font-medium text-zinc-600">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-teal-900">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Seu link de agendamento
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Compartilhe seu endereço para que clientes agendem sem criar uma
          conta.
        </p>
        <PublicSlugForm slug={provider.slug ?? ""} />
        {provider.slug && (
          <Link
            className="mt-4 inline-flex text-sm font-semibold text-teal-800 hover:underline"
            href={`/p/${provider.slug}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir página pública
          </Link>
        )}
      </div>
    </section>
  );
}
