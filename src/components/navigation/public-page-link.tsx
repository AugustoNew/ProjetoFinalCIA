"use client";

import Link from "next/link";
import { useState } from "react";

export function PublicPageLink({ slug }: { slug: string | null }) {
  const [message, setMessage] = useState("");
  const publicPath = slug ? `/p/${slug}` : null;

  async function copyLink() {
    if (!publicPath) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${publicPath}`,
      );
      setMessage("Link copiado.");
    } catch {
      setMessage("Não foi possível copiar. Selecione o endereço e copie.");
    }
  }

  return (
    <div className="mt-4">
      {publicPath ? (
        <p className="break-all text-sm text-zinc-700">
          Endereço:{" "}
          <Link
            className="font-medium text-teal-800 underline underline-offset-2"
            href={publicPath}
          >
            {publicPath}
          </Link>
        </p>
      ) : (
        <p className="text-sm text-zinc-600">
          Salve um endereço público para compartilhar sua página.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!publicPath}
          onClick={copyLink}
          type="button"
        >
          Copiar link
        </button>
        {publicPath && (
          <Link
            className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900"
            href={publicPath}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir página pública
          </Link>
        )}
      </div>
      {message && (
        <p aria-live="polite" className="mt-2 text-sm text-zinc-600">
          {message}
        </p>
      )}
    </div>
  );
}
