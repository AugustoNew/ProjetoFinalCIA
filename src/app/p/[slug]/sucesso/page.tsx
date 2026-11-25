import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/time-zone";

export const instant = false;

export default async function BookingSuccessPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const token = searchParams.token;

  if (typeof token !== "string" || token.length < 32 || token.length > 100) {
    notFound();
  }

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    select: {
      startsAt: true,
      endsAt: true,
      clientName: true,
      clientEmail: true,
      provider: {
        select: { slug: true, name: true, timeZone: true },
      },
      service: {
        select: { name: true, durationMinutes: true, priceCents: true },
      },
    },
  });

  if (!appointment || appointment.provider.slug !== slug) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <section
        aria-labelledby="success-title"
        className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800"
        >
          ✓
        </div>
        <h1
          className="mt-5 text-2xl font-bold text-zinc-900"
          id="success-title"
        >
          Agendamento solicitado!
        </h1>
        <p className="mt-2 text-zinc-600">
          {appointment.provider.name} recebeu sua solicitação. Guarde estes
          detalhes:
        </p>

        <dl className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-sm text-zinc-600">Serviço</dt>
            <dd className="text-right text-sm font-semibold text-zinc-900">
              {appointment.service.name}
            </dd>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-sm text-zinc-600">Data e horário</dt>
            <dd className="text-right text-sm font-semibold text-zinc-900">
              {formatDateTime(
                appointment.startsAt,
                appointment.provider.timeZone,
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-sm text-zinc-600">Duração</dt>
            <dd className="text-right text-sm font-semibold text-zinc-900">
              {appointment.service.durationMinutes} minutos
            </dd>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-sm text-zinc-600">Cliente</dt>
            <dd className="text-right text-sm font-semibold text-zinc-900">
              {appointment.clientName}
            </dd>
          </div>
          <div className="flex justify-between gap-4 p-4">
            <dt className="text-sm text-zinc-600">E-mail</dt>
            <dd className="break-all text-right text-sm font-semibold text-zinc-900">
              {appointment.clientEmail}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-sm text-zinc-600">
          O valor do serviço é{" "}
          <strong className="text-zinc-900">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(appointment.service.priceCents / 100)}
          </strong>
          . Para cancelar, use o link abaixo. Para alterar o horário, entre em
          contato com o prestador.
        </p>

        <Link
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
          href={`/agendamento/cancelar?token=${encodeURIComponent(token)}`}
        >
          Cancelar agendamento
        </Link>

        <Link
          className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
          href={`/p/${slug}`}
        >
          Voltar à página do prestador
        </Link>
      </section>
    </main>
  );
}
