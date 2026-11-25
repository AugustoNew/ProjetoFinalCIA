"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  bookingContactSchema,
  type BookingContact,
} from "@/lib/booking-validation";
import { formatDateTime } from "@/lib/time-zone";

type PublicService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
};

type PublicProvider = {
  name: string;
  slug: string;
  timeZone: string;
};

type SlotResponse = {
  slots: string[];
  error?: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const steps = ["Serviço", "Data e horário", "Seus dados", "Confirmação"];

export function PublicBookingFlow({
  provider,
  services,
  minimumDate,
}: {
  provider: PublicProvider;
  services: PublicService[];
  minimumDate: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(minimumDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedStart, setSelectedStart] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [contact, setContact] = useState<BookingContact | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const slotsRequest = useRef<AbortController | null>(null);
  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingContact>({
    resolver: zodResolver(bookingContactSchema),
    defaultValues: { clientName: "", clientEmail: "", clientPhone: "" },
  });

  async function loadAvailableTimes(
    requestedServiceId: string,
    requestedDate: string,
    preserveMessage = false,
  ) {
    slotsRequest.current?.abort();
    if (!requestedServiceId || !requestedDate) {
      setSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    const controller = new AbortController();
    slotsRequest.current = controller;
    setIsLoadingSlots(true);
    setSelectedStart("");
    if (!preserveMessage) {
      setErrorMessage("");
    }

    const params = new URLSearchParams({
      slug: provider.slug,
      serviceId: requestedServiceId,
      date: requestedDate,
    });
    try {
      const response = await fetch(`/api/public/availability?${params}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const result = (await response.json()) as SlotResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Não foi possível carregar horários.");
      }

      setSlots(result.slots);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setSlots([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar horários.",
      );
    } finally {
      if (slotsRequest.current === controller) {
        slotsRequest.current = null;
        setIsLoadingSlots(false);
      }
    }
  }

  function selectService(nextServiceId: string) {
    setServiceId(nextServiceId);
    setStep(2);
    void loadAvailableTimes(nextServiceId, date);
  }

  function selectDate(nextDate: string) {
    setDate(nextDate);
    setSelectedStart("");
    void loadAvailableTimes(serviceId, nextDate);
  }

  function submitContact(data: BookingContact) {
    setContact(data);
    setErrorMessage("");
    setStep(4);
  }

  function confirmBooking() {
    if (!selectedService || !selectedStart || !contact) {
      return;
    }

    startTransition(async () => {
      setErrorMessage("");
      try {
        const response = await fetch("/api/public/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: provider.slug,
            serviceId: selectedService.id,
            startsAt: selectedStart,
            ...contact,
          }),
        });
        const result = (await response.json()) as {
          cancelToken?: string;
          error?: string;
        };

        if (!response.ok || !result.cancelToken) {
          setErrorMessage(result.error ?? "Não foi possível confirmar.");
          if (response.status === 409) {
            setStep(2);
            setSelectedStart("");
            void loadAvailableTimes(selectedService.id, date, true);
          }
          return;
        }

        router.push(
          `/p/${provider.slug}/sucesso?token=${encodeURIComponent(result.cancelToken)}`,
        );
      } catch {
        setErrorMessage(
          "Falha de conexão. Confira sua internet e tente novamente.",
        );
      }
    });
  }

  function goToStep(nextStep: number) {
    setErrorMessage("");
    setStep(nextStep);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
            Agendamento online
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">
            {provider.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Escolha um serviço e encontre o melhor horário para você.
          </p>
        </header>

        <ol
          aria-label="Etapas do agendamento"
          className="mb-6 grid grid-cols-4 gap-2"
        >
          {steps.map((label, index) => {
            const number = index + 1;
            return (
              <li
                aria-current={step === number ? "step" : undefined}
                className={`rounded-lg px-2 py-2 text-center text-xs font-semibold sm:text-sm ${
                  step === number
                    ? "bg-teal-800 text-white"
                    : step > number
                      ? "bg-teal-100 text-teal-900"
                      : "bg-white text-zinc-500"
                }`}
                key={label}
              >
                <span className="sm:hidden">{number}</span>
                <span className="hidden sm:inline">
                  {number}. {label}
                </span>
              </li>
            );
          })}
        </ol>

        <section
          aria-labelledby="booking-step-title"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <h2
            className="text-xl font-bold text-zinc-900"
            id="booking-step-title"
          >
            {steps[step - 1]}
          </h2>

          {services.length === 0 ? (
            <p className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
              Este prestador ainda não possui serviços disponíveis para
              agendamento.
            </p>
          ) : (
            <>
              {step === 1 && (
                <fieldset className="mt-5 space-y-3">
                  <legend className="sr-only">Escolha um serviço</legend>
                  {services.map((service) => (
                    <button
                      aria-pressed={serviceId === service.id}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        serviceId === service.id
                          ? "border-teal-800 bg-teal-50 ring-1 ring-teal-800"
                          : "border-zinc-200 hover:border-teal-700"
                      }`}
                      key={service.id}
                      onClick={() => selectService(service.id)}
                      type="button"
                    >
                      <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <span>
                          <span className="block font-semibold text-zinc-900">
                            {service.name}
                          </span>
                          {service.description && (
                            <span className="mt-1 block text-sm text-zinc-600">
                              {service.description}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-zinc-800">
                          {service.durationMinutes} min
                          <span aria-hidden="true"> · </span>
                          {currencyFormatter.format(service.priceCents / 100)}
                        </span>
                      </span>
                    </button>
                  ))}
                </fieldset>
              )}

              {step === 2 && (
                <div className="mt-5 space-y-6">
                  <label className="block text-sm font-medium text-zinc-800">
                    Data
                    <input
                      className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                      min={minimumDate}
                      onChange={(event) => selectDate(event.target.value)}
                      type="date"
                      value={date}
                    />
                  </label>

                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-800">
                      Horários disponíveis
                    </legend>
                    {isLoadingSlots ? (
                      <p
                        aria-live="polite"
                        className="mt-3 text-sm text-zinc-600"
                      >
                        Buscando horários...
                      </p>
                    ) : !date ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        Selecione uma data para consultar os horários.
                      </p>
                    ) : slots.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {slots.map((slot) => (
                          <button
                            aria-pressed={selectedStart === slot}
                            className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${
                              selectedStart === slot
                                ? "border-teal-800 bg-teal-800 text-white"
                                : "border-zinc-300 text-zinc-800 hover:border-teal-700 hover:bg-teal-50"
                            }`}
                            key={slot}
                            onClick={() => setSelectedStart(slot)}
                            type="button"
                          >
                            {formatDateTime(slot, provider.timeZone)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
                        Não há horários disponíveis nesta data. Escolha outro
                        dia.
                      </p>
                    )}
                  </fieldset>

                  {errorMessage && (
                    <p
                      aria-live="assertive"
                      className="text-sm text-red-700"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <button
                      className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                      onClick={() => goToStep(1)}
                      type="button"
                    >
                      Voltar
                    </button>
                    <button
                      className="min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!selectedStart || isLoadingSlots}
                      onClick={() => goToStep(3)}
                      type="button"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <form
                  className="mt-5 space-y-4"
                  noValidate
                  onSubmit={handleSubmit(submitContact)}
                >
                  <div>
                    <label
                      className="block text-sm font-medium text-zinc-800"
                      htmlFor="client-name"
                    >
                      Nome completo
                    </label>
                    <input
                      autoComplete="name"
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                      id="client-name"
                      maxLength={100}
                      {...register("clientName")}
                    />
                    {errors.clientName && (
                      <p className="mt-1 text-sm text-red-700">
                        {errors.clientName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-zinc-800"
                      htmlFor="client-email"
                    >
                      E-mail
                    </label>
                    <input
                      autoComplete="email"
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                      id="client-email"
                      maxLength={254}
                      type="email"
                      {...register("clientEmail")}
                    />
                    {errors.clientEmail && (
                      <p className="mt-1 text-sm text-red-700">
                        {errors.clientEmail.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium text-zinc-800"
                      htmlFor="client-phone"
                    >
                      Telefone
                    </label>
                    <input
                      autoComplete="tel"
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                      id="client-phone"
                      inputMode="tel"
                      maxLength={30}
                      {...register("clientPhone")}
                    />
                    {errors.clientPhone && (
                      <p className="mt-1 text-sm text-red-700">
                        {errors.clientPhone.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                    <button
                      className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                      onClick={() => goToStep(2)}
                      type="button"
                    >
                      Voltar
                    </button>
                    <button
                      className="min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
                      type="submit"
                    >
                      Revisar agendamento
                    </button>
                  </div>
                </form>
              )}

              {step === 4 && selectedService && contact && (
                <div className="mt-5">
                  <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">Serviço</dt>
                      <dd className="text-right text-sm font-semibold text-zinc-900">
                        {selectedService.name}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">Data e horário</dt>
                      <dd className="text-right text-sm font-semibold text-zinc-900">
                        {formatDateTime(selectedStart, provider.timeZone)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">Duração e valor</dt>
                      <dd className="text-right text-sm font-semibold text-zinc-900">
                        {selectedService.durationMinutes} min
                        <span aria-hidden="true"> · </span>
                        {currencyFormatter.format(
                          selectedService.priceCents / 100,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">Cliente</dt>
                      <dd className="text-right text-sm font-semibold text-zinc-900">
                        {contact.clientName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">E-mail</dt>
                      <dd className="break-all text-right text-sm font-semibold text-zinc-900">
                        {contact.clientEmail}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 p-4">
                      <dt className="text-sm text-zinc-600">Telefone</dt>
                      <dd className="text-right text-sm font-semibold text-zinc-900">
                        {contact.clientPhone}
                      </dd>
                    </div>
                  </dl>

                  {errorMessage && (
                    <p
                      aria-live="assertive"
                      className="mt-4 text-sm text-red-700"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <button
                      className="min-h-11 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      disabled={isSubmitting}
                      onClick={() => goToStep(3)}
                      type="button"
                    >
                      Voltar e editar dados
                    </button>
                    <button
                      className="min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmitting}
                      onClick={confirmBooking}
                      type="button"
                    >
                      {isSubmitting
                        ? "Confirmando..."
                        : "Confirmar agendamento"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <p className="mt-5 text-center text-xs text-zinc-500">
          Os horários são exibidos no fuso {provider.timeZone}.
        </p>
      </div>
    </main>
  );
}
