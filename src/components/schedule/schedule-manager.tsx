"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import {
  createTimeOff,
  deleteTimeOff,
  saveWeeklyAvailability,
  updateCancellationNoticeHours,
  updateProviderTimeZone,
} from "@/server/schedule-actions";
import {
  cancellationNoticeHoursSchema,
  timeOffSchema,
  timeZoneSchema,
  weeklyAvailabilitySchema,
  type TimeOffInput,
  type WeeklyAvailabilityInput,
} from "@/lib/schedule-validation";
import { formatDateTime } from "@/lib/time-zone";

type AvailabilityItem = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type TimeOffItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type Interval = {
  startTime: string;
  endTime: string;
};

const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const commonTimeZones = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Noronha",
  "America/Rio_Branco",
  "America/New_York",
  "Europe/Lisbon",
  "Europe/London",
];

function getInitialWeek(availability: AvailabilityItem[]) {
  return weekdays.map((_, dayOfWeek) =>
    availability
      .filter((interval) => interval.dayOfWeek === dayOfWeek)
      .map(({ startTime, endTime }) => ({ startTime, endTime })),
  );
}

export function ScheduleManager({
  availability,
  timeOffs,
  minimumCancellationNoticeHours,
  timeZone,
}: {
  availability: AvailabilityItem[];
  timeOffs: TimeOffItem[];
  minimumCancellationNoticeHours: number;
  timeZone: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [week, setWeek] = useState(() => getInitialWeek(availability));
  const [selectedTimeZone, setSelectedTimeZone] = useState(timeZone);
  const [cancellationNoticeHours, setCancellationNoticeHours] = useState(
    String(minimumCancellationNoticeHours),
  );
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [reason, setReason] = useState("");
  const [pendingTimeOffId, setPendingTimeOffId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function runAction(
    action: () => Promise<{ success: boolean; message: string }>,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
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
          message: "Não foi possível concluir a operação. Tente novamente.",
        });
      } finally {
        setPendingTimeOffId(null);
      }
    });
  }

  function updateInterval(
    dayOfWeek: number,
    intervalIndex: number,
    field: keyof Interval,
    value: string,
  ) {
    setWeek((current) =>
      current.map((day, index) =>
        index === dayOfWeek
          ? day.map((interval, itemIndex) =>
              itemIndex === intervalIndex
                ? { ...interval, [field]: value }
                : interval,
            )
          : day,
      ),
    );
  }

  function addInterval(dayOfWeek: number) {
    setWeek((current) =>
      current.map((day, index) =>
        index === dayOfWeek
          ? [...day, { startTime: "09:00", endTime: "18:00" }]
          : day,
      ),
    );
  }

  function removeInterval(dayOfWeek: number, intervalIndex: number) {
    setWeek((current) =>
      current.map((day, index) =>
        index === dayOfWeek
          ? day.filter((_, itemIndex) => itemIndex !== intervalIndex)
          : day,
      ),
    );
  }

  function toggleDay(dayOfWeek: number, enabled: boolean) {
    setWeek((current) =>
      current.map((day, index) =>
        index === dayOfWeek
          ? enabled
            ? [{ startTime: "09:00", endTime: "18:00" }]
            : []
          : day,
      ),
    );
  }

  function submitAvailability() {
    const intervals: WeeklyAvailabilityInput = week.flatMap((day, dayOfWeek) =>
      day.map((interval) => ({ ...interval, dayOfWeek })),
    );
    const parsed = weeklyAvailabilitySchema.safeParse(intervals);
    if (!parsed.success) {
      setToast({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Confira os horários.",
      });
      return;
    }

    runAction(() => saveWeeklyAvailability(parsed.data));
  }

  function submitTimeZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = timeZoneSchema.safeParse(selectedTimeZone);
    if (!parsed.success) {
      setToast({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Informe um fuso válido.",
      });
      return;
    }

    runAction(() => updateProviderTimeZone(parsed.data));
  }

  function submitCancellationNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d+$/.test(cancellationNoticeHours)) {
      setToast({
        type: "error",
        message: "Informe a antecedência em horas inteiras.",
      });
      return;
    }

    const parsed = cancellationNoticeHoursSchema.safeParse(
      Number(cancellationNoticeHours),
    );
    if (!parsed.success) {
      setToast({
        type: "error",
        message:
          parsed.error.issues[0]?.message ??
          "Confira a antecedência informada.",
      });
      return;
    }

    runAction(() => updateCancellationNoticeHours(parsed.data));
  }

  function submitTimeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = timeOffSchema.safeParse({
      startsAtLocal,
      endsAtLocal,
      reason,
    } satisfies TimeOffInput);
    if (!parsed.success) {
      setToast({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Confira os dados.",
      });
      return;
    }

    runAction(() => createTimeOff(parsed.data));
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Horários</h1>
        <p className="mt-2 text-zinc-600">
          Defina quando você atende e cadastre folgas ou bloqueios.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Disponibilidade semanal
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Os horários são recorrentes e seguem o fuso do prestador.
          </p>
        </div>

        {availability.length === 0 && (
          <p className="mb-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
            Nenhum horário semanal foi definido. Ative os dias em que você
            atende e salve a disponibilidade.
          </p>
        )}

        <div className="divide-y divide-zinc-100">
          {weekdays.map((day, dayOfWeek) => {
            const enabled = week[dayOfWeek].length > 0;
            return (
              <div
                className="grid gap-4 py-4 sm:grid-cols-[10rem_1fr]"
                key={day}
              >
                <label className="flex items-center gap-3 text-sm font-medium text-zinc-800">
                  <input
                    checked={enabled}
                    className="size-4 accent-teal-800"
                    disabled={isPending}
                    onChange={(event) =>
                      toggleDay(dayOfWeek, event.target.checked)
                    }
                    type="checkbox"
                  />
                  {day}
                </label>

                <div className="space-y-3">
                  {week[dayOfWeek].map((interval, intervalIndex) => (
                    <div
                      className="flex flex-wrap items-center gap-2"
                      key={`${dayOfWeek}-${intervalIndex}`}
                    >
                      <label
                        className="sr-only"
                        htmlFor={`start-${dayOfWeek}-${intervalIndex}`}
                      >
                        Início, {day.toLowerCase()}
                      </label>
                      <input
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        disabled={isPending}
                        id={`start-${dayOfWeek}-${intervalIndex}`}
                        onChange={(event) =>
                          updateInterval(
                            dayOfWeek,
                            intervalIndex,
                            "startTime",
                            event.target.value,
                          )
                        }
                        type="time"
                        value={interval.startTime}
                      />
                      <span className="text-sm text-zinc-500">até</span>
                      <label
                        className="sr-only"
                        htmlFor={`end-${dayOfWeek}-${intervalIndex}`}
                      >
                        Fim, {day.toLowerCase()}
                      </label>
                      <input
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        disabled={isPending}
                        id={`end-${dayOfWeek}-${intervalIndex}`}
                        onChange={(event) =>
                          updateInterval(
                            dayOfWeek,
                            intervalIndex,
                            "endTime",
                            event.target.value,
                          )
                        }
                        type="time"
                        value={interval.endTime}
                      />
                      <button
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => removeInterval(dayOfWeek, intervalIndex)}
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  {enabled && (
                    <button
                      className="text-sm font-semibold text-teal-800 hover:text-teal-950 disabled:opacity-50"
                      disabled={isPending || week[dayOfWeek].length >= 8}
                      onClick={() => addInterval(dayOfWeek)}
                      type="button"
                    >
                      + Adicionar intervalo
                    </button>
                  )}
                  {!enabled && (
                    <span className="text-sm text-zinc-500">Indisponível</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end border-t border-zinc-100 pt-5">
          <button
            className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
            disabled={isPending}
            onClick={submitAvailability}
            type="button"
          >
            {isPending ? "Salvando..." : "Salvar disponibilidade"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Fuso horário</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Folgas são salvas em UTC e exibidas no fuso selecionado.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={submitTimeZone}
        >
          <input
            aria-label="Fuso horário IANA"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            disabled={isPending}
            list="common-time-zones"
            onChange={(event) => setSelectedTimeZone(event.target.value)}
            placeholder="Ex.: America/Sao_Paulo"
            value={selectedTimeZone}
          />
          <datalist id="common-time-zones">
            {commonTimeZones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            disabled={isPending || selectedTimeZone === timeZone}
            type="submit"
          >
            Salvar fuso
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Política de cancelamento e reagendamento
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Clientes precisam solicitar alterações com esta antecedência mínima.
          Use 0 para permitir alterações até o horário do atendimento.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={submitCancellationNotice}
        >
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
            Antecedência mínima (horas)
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 sm:w-48"
              disabled={isPending}
              max={720}
              min={0}
              onChange={(event) =>
                setCancellationNoticeHours(event.target.value)
              }
              required
              step={1}
              type="number"
              value={cancellationNoticeHours}
            />
          </label>
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            disabled={
              isPending ||
              Number(cancellationNoticeHours) === minimumCancellationNoticeHours
            }
            type="submit"
          >
            Salvar antecedência
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            Folgas e bloqueios
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Informe o período no fuso {timeZone}.
          </p>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitTimeOff}>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
            Início
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              disabled={isPending}
              onChange={(event) => setStartsAtLocal(event.target.value)}
              required
              type="datetime-local"
              value={startsAtLocal}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
            Fim
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              disabled={isPending}
              onChange={(event) => setEndsAtLocal(event.target.value)}
              required
              type="datetime-local"
              value={endsAtLocal}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-zinc-700 sm:col-span-2">
            Motivo
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2"
              disabled={isPending}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: férias, compromisso"
              required
              value={reason}
            />
          </label>
          <div className="sm:col-span-2 sm:text-right">
            <button
              className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              Cadastrar folga
            </button>
          </div>
        </form>

        {timeOffs.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600">
            Você ainda não cadastrou folgas ou bloqueios.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {timeOffs.map((timeOff) => (
              <li
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={timeOff.id}
              >
                <div>
                  <p className="font-medium text-zinc-900">{timeOff.reason}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatDateTime(timeOff.startsAt, timeZone)}
                    <span aria-hidden="true"> – </span>
                    {formatDateTime(timeOff.endsAt, timeZone)}
                  </p>
                </div>
                <button
                  className="self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 sm:self-auto"
                  disabled={isPending}
                  onClick={() => {
                    if (
                      window.confirm(`Remover o bloqueio "${timeOff.reason}"?`)
                    ) {
                      setPendingTimeOffId(timeOff.id);
                      runAction(() => deleteTimeOff(timeOff.id));
                    }
                  }}
                  type="button"
                >
                  {isPending && pendingTimeOffId === timeOff.id
                    ? "Removendo..."
                    : "Remover"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
