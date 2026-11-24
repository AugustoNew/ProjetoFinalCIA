"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  createService,
  deleteService,
  setServiceActive,
  updateService,
} from "@/server/service-actions";
import type { ServiceData } from "@/lib/service-validation";
import { ServiceForm } from "@/components/services/service-form";

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ServiceManager({ services }: { services: ServiceItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
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
          setEditingService(null);
          setIsCreating(false);
          router.refresh();
        }
      } catch {
        setToast({
          type: "error",
          message: "Não foi possível concluir a operação. Tente novamente.",
        });
      } finally {
        setPendingServiceId(null);
      }
    });
  }

  function handleSave(data: ServiceData) {
    if (editingService) {
      runAction(() => updateService(editingService.id, data));
    } else {
      runAction(() => createService(data));
    }
  }

  function handleDelete(service: ServiceItem) {
    if (
      !window.confirm(
        `Deseja excluir o serviço "${service.name}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setPendingServiceId(service.id);
    runAction(() => deleteService(service.id));
  }

  function handleToggle(service: ServiceItem) {
    setPendingServiceId(service.id);
    runAction(() => setServiceActive(service.id, !service.active));
  }

  function openCreateForm() {
    setEditingService(null);
    setIsCreating(true);
  }

  function openEditForm(service: ServiceItem) {
    setIsCreating(false);
    setEditingService(service);
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Serviços</h1>
          <p className="mt-2 text-zinc-600">
            Cadastre e gerencie os serviços oferecidos aos seus clientes.
          </p>
        </div>
        {!isCreating && !editingService && (
          <button
            className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
            onClick={openCreateForm}
            type="button"
          >
            Novo serviço
          </button>
        )}
      </div>

      {(isCreating || editingService) && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-zinc-900">
            {editingService ? "Editar serviço" : "Novo serviço"}
          </h2>
          <ServiceForm
            isPending={isPending}
            onCancel={() => {
              setEditingService(null);
              setIsCreating(false);
            }}
            onSubmit={handleSave}
            service={editingService ?? undefined}
          />
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Você ainda não tem serviços
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Crie seu primeiro serviço para começar a organizar seus
            atendimentos.
          </p>
          {!isCreating && (
            <button
              className="mt-5 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900"
              onClick={openCreateForm}
              type="button"
            >
              Criar primeiro serviço
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <ul className="divide-y divide-zinc-200">
            {services.map((service) => (
              <li
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                key={service.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-zinc-900">
                      {service.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        service.active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {service.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {service.description && (
                    <p className="mt-1 truncate text-sm text-zinc-600">
                      {service.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-zinc-600">
                    {service.durationMinutes} min
                    <span aria-hidden="true"> · </span>
                    {currencyFormatter.format(service.priceCents / 100)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => openEditForm(service)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => handleToggle(service)}
                    type="button"
                  >
                    {isPending && pendingServiceId === service.id
                      ? "Atualizando..."
                      : service.active
                        ? "Desativar"
                        : "Ativar"}
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => handleDelete(service)}
                    type="button"
                  >
                    {isPending && pendingServiceId === service.id
                      ? "Excluindo..."
                      : "Excluir"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
