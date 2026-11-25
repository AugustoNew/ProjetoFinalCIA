"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveProviderSlug } from "@/server/profile-actions";

export function PublicSlugForm({ slug }: { slug: string }) {
  const [value, setValue] = useState(slug);
  const [savedSlug, setSavedSlug] = useState(slug);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await saveProviderSlug(value);
        setMessage(result.message);
        if (result.success) {
          setValue(result.slug);
          setSavedSlug(result.slug);
        }
      } catch {
        setMessage("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={submit}>
      <label
        className="block text-sm font-medium text-zinc-700"
        htmlFor="public-slug"
      >
        Endereço público
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-sm text-zinc-500">/p/</span>
        <input
          autoCapitalize="none"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
          disabled={isPending}
          id="public-slug"
          maxLength={80}
          onChange={(event) => setValue(event.target.value)}
          pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
          required
          value={value}
        />
        <button
          className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          disabled={isPending || value === savedSlug}
          type="submit"
        >
          {isPending ? "Salvando..." : "Salvar endereço"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Use letras, números e hífens. O endereço deve ser exclusivo.
      </p>
      {message && (
        <p
          aria-live="polite"
          className={`text-sm ${
            message.includes("atualizado") ? "text-emerald-800" : "text-red-700"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </form>
  );
}
