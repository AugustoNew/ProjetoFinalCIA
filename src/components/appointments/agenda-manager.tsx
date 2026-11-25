"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addCalendarDays, formatCalendarDate } from "@/lib/calendar-date";
import { formatDateTime, formatDateTimeLocal } from "@/lib/time-zone";
import { updateAppointmentStatus } from "@/server/appointment-actions";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
type AgendaView = "day" | "week";
type StatusFilter = AppointmentStatus | "ALL";

type AgendaAppointment = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  service: {
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
};

type AgendaDay = {
  date: string;
  appointments: AgendaAppointment[];
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const statusDetails: Record<
  AppointmentStatus,
  { label: string; badge: string; border: string }
> = {
  PENDING: {
    label: "Pendente",
    badge: "bg-amber-100 text-amber-900",
    border: "border-l-amber-500",
  },
  CONFIRMED: {
    label: "Confirmado",
    badge: "bg-teal-100 text-teal-900",
    border: "border-l-teal-700",
  },
  CANCELLED: {
    label: "Cancelado",
    badge: "bg-red-100 text-red-800",
    border: "border-l-red-500",
  },
  COMPLETED: {
    label: "Concluído",
    badge: "bg-blue-100 text-blue-900",
    border: "border-l-blue-600",
  },
};

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos os status" },
  { value: "PENDING", label: "Pendentes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "COMPLETED", label: "Concluídos" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function agendaHref(date: string, view: AgendaView, status: StatusFilter) {
  const searchParams = new URLSearchParams({ date, view, status });
  return `/painel/agenda?${searchParams.toString()}`;
}

function AppointmentCard({
  appointment,
  timeZone,
  isPending,
  onChangeStatus,
}: {
  appointment: AgendaAppointment;
  timeZone: string;
  isPending: boolean;
  onChangeStatus: (
    appointmentId: string,
    status: "CONFIRMED" | "CANCELLED" | "COMPLETED",
  ) => void;
}) {
  const presentation = statusDetails[appointment.status];

  return (
    <article
      className={`rounded-xl border border-zinc-200 border-l-4 ${presentation.border} bg-white p-4 shadow-sm`}
    >
      <details>
        <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">
              {formatDateTimeLocal(appointment.startsAt, timeZone).slice(11)}
              <span aria-hidden="true"> – </span>
              {formatDateTimeLocal(appointment.endsAt, timeZone).slice(11)}
            </p>
            <p className="mt-1 truncate text-sm text-zinc-700">
              {appointment.clientName}
              <span aria-hidden="true"> · </span>
              {appointment.service.name}
            </p>
          </div>
          <span
            className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${presentation.badge}`}
          >
            {presentation.label}
          </span>
        </summary>

        <dl className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Cliente
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {appointment.clientName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Serviço
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {appointment.service.name} · {appointment.service.durationMinutes}{" "}
              min ·{" "}
              {currencyFormatter.format(appointment.service.priceCents / 100)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              E-mail
            </dt>
            <dd className="mt-1 break-all text-sm text-zinc-800">
              <a
                className="underline decoration-zinc-300 underline-offset-2 hover:text-teal-800"
                href={`mailto:${appointment.clientEmail}`}
              >
                {appointment.clientEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Telefone
            </dt>
            <dd className="mt-1 text-sm text-zinc-800">
              <a
                className="underline decoration-zinc-300 underline-offset-2 hover:text-teal-800"
                href={`tel:${appointment.clientPhone}`}
              >
                {appointment.clientPhone}
              </a>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Horário
            </dt>
            <dd className="mt-1 text-sm text-zinc-800">
              {formatDateTime(appointment.startsAt, timeZone)}
              <span aria-hidden="true"> – </span>
              {formatDateTime(appointment.endsAt, timeZone)}
            </dd>
          </div>
        </dl>
      </details>

      {appointment.status !== "CANCELLED" &&
        appointment.status !== "COMPLETED" && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            {appointment.status === "PENDING" && (
              <button
                className="min-h-10 rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
                disabled={isPending}
                onClick={() => onChangeStatus(appointment.id, "CONFIRMED")}
                type="button"
              >
                Confirmar
              </button>
            )}
            {appointment.status === "CONFIRMED" && (
              <button
                className="min-h-10 rounded-lg bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
                disabled={isPending}
                onClick={() => onChangeStatus(appointment.id, "COMPLETED")}
                type="button"
              >
                Marcar como concluído
              </button>
            )}
            <button
              className="min-h-10 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={isPending}
              onClick={() => onChangeStatus(appointment.id, "CANCELLED")}
              type="button"
            >
              Cancelar
            </button>
          </div>
        )}
    </article>
  );
}

export function AgendaManager({
  date,
  view,
  status,
  weekStart,
  days,
  timeZone,
}: {
  date: string;
  view: AgendaView;
  status: StatusFilter;
  weekStart: string;
  days: AgendaDay[];
  timeZone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const rangeStart = view === "week" ? weekStart : date;
  const rangeEnd = addCalendarDays(rangeStart, view === "week" ? 6 : 0);
  const previousDate = addCalendarDays(date, view === "week" ? -7 : -1);
  const nextDate = addCalendarDays(date, view === "week" ? 7 : 1);
  const appointmentCount = days.reduce(
    (total, day) => total + day.appointments.length,
    0,
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function changeStatus(
    appointmentId: string,
    nextStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED",
  ) {
    startTransition(async () => {
      try {
        const result = await updateAppointmentStatus(appointmentId, nextStatus);
        setToast({
          type: result.success ? "success" : "error",
          message: result.message,
        });
        if (result.success) {
          router.refresh();
        }
      } catch {
        setToast({
          type: "error",
          message: "Não foi possível atualizar o agendamento. Tente novamente.",
        });
      }
    });
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Agenda</h1>
        <p className="mt-2 text-zinc-600">
          Consulte e gerencie seus agendamentos.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <form
            action="/painel/agenda"
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            method="get"
          >
            <input name="view" type="hidden" value={view} />
            <label className="grid gap-1 text-sm font-medium text-zinc-700">
              Data
              <input
                className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2"
                name="date"
                type="date"
                value={date}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-700">
              Status
              <select
                className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2"
                defaultValue={status}
                name="status"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
              type="submit"
            >
              Aplicar filtros
            </button>
          </form>

          <div
            aria-label="Tipo de visualização"
            className="flex rounded-lg border border-zinc-200 p-1"
            role="group"
          >
            {(["day", "week"] as const).map((nextView) => (
              <Link
                aria-current={view === nextView ? "page" : undefined}
                className={`min-h-9 rounded-md px-4 py-2 text-sm font-semibold ${
                  view === nextView
                    ? "bg-teal-800 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
                href={agendaHref(date, nextView, status)}
                key={nextView}
              >
                {nextView === "day" ? "Dia" : "Semana"}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <Link
            className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href={agendaHref(previousDate, view, status)}
          >
            ← Anterior
          </Link>
          <h2 className="text-center text-sm font-semibold text-zinc-900 sm:text-base">
            {view === "day"
              ? formatCalendarDate(date, { weekday: true })
              : `${formatCalendarDate(rangeStart)} – ${formatCalendarDate(rangeEnd)}`}
          </h2>
          <Link
            className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            href={agendaHref(nextDate, view, status)}
          >
            Próximo →
          </Link>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-zinc-600">
        {appointmentCount}{" "}
        {appointmentCount === 1
          ? "agendamento encontrado"
          : "agendamentos encontrados"}
        <span aria-hidden="true"> · </span>Horário local: {timeZone}
      </p>

      {days.map((day) => (
        <section
          aria-label={formatCalendarDate(day.date, { weekday: true })}
          key={day.date}
        >
          {view === "week" && (
            <h2 className="mb-3 text-lg font-semibold capitalize text-zinc-900">
              {formatCalendarDate(day.date, { weekday: true })}
            </h2>
          )}
          {day.appointments.length > 0 ? (
            <ul className="space-y-3">
              {day.appointments.map((appointment) => (
                <li key={appointment.id}>
                  <AppointmentCard
                    appointment={appointment}
                    isPending={isPending}
                    onChangeStatus={changeStatus}
                    timeZone={timeZone}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-600">
              Nenhum agendamento para este dia.
            </p>
          )}
        </section>
      ))}

      {toast && (
        <div
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-4 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-800" : "bg-red-800"
          }`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <p>{toast.message}</p>
          <button
            aria-label="Fechar notificação"
            className="font-bold leading-5"
            onClick={() => setToast(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </section>
  );
}
