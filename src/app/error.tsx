"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <section className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-red-800">
          Erro 500
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-zinc-600">
          Tente novamente. Se o problema continuar, volte ao início.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900"
            onClick={retry}
            type="button"
          >
            Tentar novamente
          </button>
          <Link
            className="rounded-lg border border-zinc-300 px-4 py-2.5 font-semibold text-zinc-700 hover:bg-zinc-50"
            href="/"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
