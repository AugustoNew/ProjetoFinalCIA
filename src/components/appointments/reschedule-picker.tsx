"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateTime, formatDateTimeLocal } from "@/lib/time-zone";

type SlotResponse = {
  slots?: string[];
  error?: string;
};

export function ReschedulePicker({
  cancelToken,
  currentStartsAt,
  minimumDate,
  minimumNoticeHours,
  timeZone,
}: {
  cancelToken: string;
  currentStartsAt: string;
  minimumDate: string;
  minimumNoticeHours: number;
  timeZone: string;
}) {
  const router = useRouter();
  const initialDate = formatDateTimeLocal(currentStartsAt, timeZone).slice(
    0,
    10,
  );
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedStart, setSelectedStart] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ token: cancelToken, date });

    async function loadSlots() {
      try {
        const response = await fetch(
          `/api/public/reschedule-availability?${params}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as SlotResponse;
        if (!response.ok) {
          throw new Error(
            result.error ?? "Não foi possível carregar os horários.",
          );
        }
        setSlots(result.slots ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setSlots([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os horários.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSlots();
    return () => controller.abort();
  }, [cancelToken, date, reloadKey]);

  function changeDate(nextDate: string) {
    setDate(nextDate);
    setSlots([]);
    setSelectedStart("");
    setErrorMessage("");
    setIsLoading(true);
  }

  async function submitReschedule() {
    if (!selectedStart || isSubmitting) {
      return;
    }

    if (
      !window.confirm(
        `Confirmar novo horário para ${formatDateTime(selectedStart, timeZone)}?`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/public/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelToken, startsAt: selectedStart }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSelectedStart("");
        setErrorMessage(
          result.error ?? "Não foi possível reagendar. Tente novamente.",
        );
        if (response.status === 409) {
          setSlots([]);
        }
        return;
      }

      router.replace(
        `/agendamento/${encodeURIComponent(cancelToken)}?result=rescheduled`,
      );
    } catch {
      setErrorMessage(
        "Falha de conexão. Confira sua internet e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="reschedule-title"
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-zinc-900" id="reschedule-title">
        Reagendar
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Escolha uma nova data e um horário disponível. A antecedência mínima é
        de {minimumNoticeHours}h.
      </p>

      <label className="mt-4 grid max-w-xs gap-1.5 text-sm font-medium text-zinc-700">
        Nova data
        <input
          className="min-h-11 rounded-lg border border-zinc-300 px-3 py-2"
          min={minimumDate}
          onChange={(event) => changeDate(event.target.value)}
          required
          type="date"
          value={date}
        />
      </label>

      {isLoading ? (
        <p aria-live="polite" className="mt-5 text-sm text-zinc-600">
          Carregando horários disponíveis...
        </p>
      ) : slots.length > 0 ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-zinc-800">
            Horários disponíveis
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                aria-pressed={selectedStart === slot}
                className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  selectedStart === slot
                    ? "border-teal-800 bg-teal-800 text-white"
                    : "border-zinc-300 text-zinc-800 hover:border-teal-700"
                }`}
                disabled={isSubmitting}
                key={slot}
                onClick={() => setSelectedStart(slot)}
                type="button"
              >
                {formatDateTime(slot, timeZone)}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="mt-5">
          <p aria-live="polite" className="text-sm text-zinc-600">
            {errorMessage || "Não há horários disponíveis nesta data."}
          </p>
          {errorMessage && (
            <button
              className="mt-2 text-sm font-semibold text-teal-800 underline"
              onClick={() => {
                setErrorMessage("");
                setIsLoading(true);
                setReloadKey((current) => current + 1);
              }}
              type="button"
            >
              Atualizar horários
            </button>
          )}
        </div>
      )}

      {errorMessage && slots.length > 0 && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        className="mt-5 min-h-11 w-full rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        disabled={!selectedStart || isSubmitting || isLoading}
        onClick={() => void submitReschedule()}
        type="button"
      >
        {isSubmitting ? "Reagendando..." : "Confirmar novo horário"}
      </button>
    </section>
  );
}
