import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/time-zone";
import { prisma } from "@/lib/prisma";
import { cancelPublicAppointment } from "@/server/public-cancellation-actions";

export const instant = false;
export const metadata = {
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  token?: string | string[];
  result?: string | string[];
}>;

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export default async function CancelAppointmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const result = Array.isArray(query.result) ? query.result[0] : query.result;
  const resultMessage =
    result === "cancelled"
      ? "O agendamento foi cancelado. Os envolvidos receberão um aviso por email."
      : result === "unavailable"
        ? "Este agendamento já foi cancelado ou não pode mais ser cancelado."
        : result === "invalid"
          ? "O link de cancelamento é inválido."
          : null;

  if (resultMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Cancelamento de agendamento
          </h1>
          <p className="mt-4 text-zinc-700">{resultMessage}</p>
        </section>
      </main>
    );
  }

  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  if (!token || !cancelTokenPattern.test(token)) {
    notFound();
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    select: {
      status: true,
      startsAt: true,
      endsAt: true,
      provider: { select: { name: true, timeZone: true } },
      service: { select: { name: true } },
    },
  });
  if (!appointment) {
    notFound();
  }

  const canCancel =
    appointment.status === "PENDING" || appointment.status === "CONFIRMED";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          Cancelar agendamento
        </h1>
        <p className="mt-2 text-zinc-600">
          Confira os dados antes de confirmar o cancelamento.
        </p>

        <dl className="mt-6 space-y-3 rounded-xl border border-zinc-200 p-4">
          <div>
            <dt className="text-sm text-zinc-500">Prestador</dt>
            <dd className="font-medium text-zinc-900">
              {appointment.provider.name}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Serviço</dt>
            <dd className="font-medium text-zinc-900">
              {appointment.service.name}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Data e horário</dt>
            <dd className="font-medium text-zinc-900">
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
          </div>
        </dl>

        {canCancel ? (
          <form action={cancelPublicAppointment}>
            <input name="cancelToken" type="hidden" value={token} />
            <button
              className="mt-6 min-h-11 w-full rounded-lg bg-red-700 px-4 py-2.5 font-semibold text-white hover:bg-red-800"
              type="submit"
            >
              Confirmar cancelamento
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg bg-zinc-100 p-4 text-sm text-zinc-700">
            Este agendamento não está mais disponível para cancelamento.
          </p>
        )}
      </section>
    </main>
  );
}
