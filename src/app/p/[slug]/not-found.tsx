import Link from "next/link";

export default function PublicProviderNotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-zinc-50 px-4 py-10">
      <section className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
          Página pública
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-900">
          Prestador não encontrado
        </h1>
        <p className="mt-2 text-zinc-600">
          Este endereço pode estar incorreto ou não estar mais disponível.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900"
          href="/"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
