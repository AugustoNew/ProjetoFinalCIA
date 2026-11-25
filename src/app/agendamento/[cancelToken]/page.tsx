import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { CancellationForm } from "@/components/appointments/cancellation-form";
import { ReschedulePicker } from "@/components/appointments/reschedule-picker";
import { formatDateTime } from "@/lib/time-zone";
import { formatDateTimeLocal } from "@/lib/time-zone";
import { meetsCancellationNotice } from "@/lib/cancellation-policy";
import { prisma } from "@/lib/prisma";

export const instant = false;
export const metadata = {
  robots: { index: false, follow: false },
};

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;

const resultMessages: Record<string, string> = {
  cancelled:
    "O agendamento foi cancelado. O cliente e o prestador foram avisados por email.",
  "too-late":
    "O prazo mínimo para cancelar este agendamento já passou. Nenhuma alteração foi feita.",
  unavailable:
    "Este agendamento já foi cancelado, concluído ou alterado em outra solicitação.",
  rescheduled:
    "O novo horário foi salvo. O cliente e o prestador foram avisados por email.",
};

export default async function AppointmentDetailsPage(props: {
  params: Promise<{ cancelToken: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ cancelToken }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  if (!cancelTokenPattern.test(cancelToken)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Link de agendamento inválido
          </h1>
          <p className="mt-3 text-zinc-600">
            Confira o link recebido ou entre em contato com o prestador.
          </p>
        </section>
      </main>
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken },
    select: {
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      status: true,
      provider: {
        select: {
          name: true,
          slug: true,
          timeZone: true,
          minimumCancellationNoticeHours: true,
        },
      },
      service: {
        select: { name: true, durationMinutes: true, priceCents: true },
      },
    },
  });

  if (!appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Agendamento não encontrado
          </h1>
          <p className="mt-3 text-zinc-600">
            Este link é inválido ou o agendamento não está mais disponível.
          </p>
        </section>
      </main>
    );
  }

  const requestedResult = Array.isArray(searchParams.result)
    ? searchParams.result[0]
    : searchParams.result;
  const resultMessage = requestedResult
    ? resultMessages[requestedResult]
    : undefined;
  const isActive =
    appointment.status === AppointmentStatus.PENDING ||
    appointment.status === AppointmentStatus.CONFIRMED;
  const meetsNotice =
    isActive &&
    meetsCancellationNotice(
      appointment.startsAt,
      appointment.provider.minimumCancellationNoticeHours,
    );
  const statusLabels: Record<AppointmentStatus, string> = {
    PENDING: "Aguardando confirmação",
    CONFIRMED: "Confirmado",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluído",
  };
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(appointment.service.priceCents / 100);
  const minimumDate = formatDateTimeLocal(
    new Date(),
    appointment.provider.timeZone,
  ).slice(0, 10);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
            Agendaki
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            Detalhes do agendamento
          </h1>
          <p className="mt-2 text-zinc-600">
            Consulte os dados e gerencie seu horário sem precisar entrar na sua
            conta.
          </p>
        </header>

        {resultMessage && (
          <p
            aria-live="polite"
            className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950"
            role="status"
          >
            {resultMessage}
          </p>
        )}

        <section
          aria-label="Resumo do agendamento"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-600">Prestador</p>
              <h2 className="text-lg font-semibold text-zinc-900">
                {appointment.provider.name}
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">
              {statusLabels[appointment.status]}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Serviço
              </dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {appointment.service.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Valor e duração
              </dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {price} · {appointment.service.durationMinutes} minutos
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Data e horário
              </dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {formatDateTime(
                  appointment.startsAt,
                  appointment.provider.timeZone,
                )}
                {" – "}
                {formatDateTime(
                  appointment.endsAt,
                  appointment.provider.timeZone,
                )}
              </dd>
              <dd className="mt-1 text-xs text-zinc-500">
                Fuso: {appointment.provider.timeZone}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Cliente
              </dt>
              <dd className="mt-1 font-medium text-zinc-900">
                {appointment.clientName}
              </dd>
              <dd className="mt-1 break-all text-sm text-zinc-600">
                <a href={`mailto:${appointment.clientEmail}`}>
                  {appointment.clientEmail}
                </a>
              </dd>
              <dd className="mt-1 text-sm text-zinc-600">
                <a href={`tel:${appointment.clientPhone}`}>
                  {appointment.clientPhone}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        {isActive && meetsNotice ? (
          <>
            <section className="rounded-xl border border-red-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-zinc-900">
                Cancelar agendamento
              </h2>
              <p className="mb-4 mt-1 text-sm text-zinc-600">
                O cancelamento exige no mínimo{" "}
                {appointment.provider.minimumCancellationNoticeHours} horas de
                antecedência.
              </p>
              <CancellationForm
                cancelToken={cancelToken}
                minimumNoticeHours={
                  appointment.provider.minimumCancellationNoticeHours
                }
              />
            </section>

            <ReschedulePicker
              cancelToken={cancelToken}
              currentStartsAt={appointment.startsAt.toISOString()}
              key={appointment.startsAt.toISOString()}
              minimumDate={minimumDate}
              minimumNoticeHours={
                appointment.provider.minimumCancellationNoticeHours
              }
              timeZone={appointment.provider.timeZone}
            />
          </>
        ) : isActive ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            O prazo de antecedência mínima de{" "}
            {appointment.provider.minimumCancellationNoticeHours} horas já
            passou. Para cancelar ou reagendar, entre em contato com o
            prestador.
          </p>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Este agendamento não pode mais ser alterado.
          </p>
        )}

        {appointment.provider.slug && (
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-teal-800 hover:underline"
            href={`/p/${appointment.provider.slug}`}
          >
            Voltar à página do prestador
          </Link>
        )}
      </div>
    </main>
  );
}
