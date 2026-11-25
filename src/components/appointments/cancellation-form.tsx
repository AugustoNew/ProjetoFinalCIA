"use client";

import type { FormEvent } from "react";
import { cancelPublicAppointment } from "@/server/public-cancellation-actions";

export function CancellationForm({
  cancelToken,
  minimumNoticeHours,
}: {
  cancelToken: string;
  minimumNoticeHours: number;
}) {
  function confirmCancellation(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "Tem certeza de que deseja cancelar este agendamento? O cliente e o prestador serão avisados por email.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={cancelPublicAppointment} onSubmit={confirmCancellation}>
      <input defaultValue={cancelToken} name="cancelToken" type="hidden" />
      <button
        className="min-h-11 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        type="submit"
      >
        Cancelar agendamento
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        O cancelamento exige {minimumNoticeHours}h de antecedência.
      </p>
    </form>
  );
}
