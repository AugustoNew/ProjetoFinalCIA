"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  serviceFormSchema,
  type ServiceData,
  type ServiceFormInput,
} from "@/lib/service-validation";

type ServiceFormProps = {
  service?: {
    name: string;
    description: string;
    durationMinutes: number;
    priceCents: number;
  };
  isPending: boolean;
  onSubmit: (data: ServiceData) => void;
  onCancel: () => void;
};

function formatPriceInput(priceCents: number) {
  return `${Math.floor(priceCents / 100)},${String(priceCents % 100).padStart(2, "0")}`;
}

export function ServiceForm({
  service,
  isPending,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormInput, undefined, ServiceData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      durationMinutes: service?.durationMinutes ?? 30,
      price: service ? formatPriceInput(service.priceCents) : "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label
          className="mb-1 block text-sm font-medium"
          htmlFor="service-name"
        >
          Nome
        </label>
        <input
          {...register("name")}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          id="service-name"
          maxLength={100}
          required
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          htmlFor="service-description"
        >
          Descrição
        </label>
        <textarea
          {...register("description")}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          id="service-description"
          maxLength={500}
          rows={3}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-700">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="service-duration"
          >
            Duração (minutos)
          </label>
          <input
            {...register("durationMinutes", { valueAsNumber: true })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            id="service-duration"
            max={1440}
            min={1}
            required
            type="number"
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-700">
              {errors.durationMinutes.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            htmlFor="service-price"
          >
            Preço (R$)
          </label>
          <input
            {...register("price")}
            aria-describedby="service-price-help"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
            id="service-price"
            inputMode="decimal"
            placeholder="Ex.: 85,00"
            required
          />
          <p className="mt-1 text-xs text-zinc-500" id="service-price-help">
            Use vírgula ou ponto para os centavos.
          </p>
          {errors.price && (
            <p className="mt-1 text-sm text-red-700">{errors.price.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row">
        <button
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Salvando..."
            : service
              ? "Salvar alterações"
              : "Criar serviço"}
        </button>
      </div>
    </form>
  );
}
