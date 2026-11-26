import Link from "next/link";
import { auth } from "@/auth";

export async function SiteHeader({
  professionalAreaLink = false,
}: {
  professionalAreaLink?: boolean;
}) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          className="text-xl font-bold tracking-tight text-teal-900"
          href="/"
        >
          Agendaki
        </Link>
        <nav
          aria-label="Navegação principal"
          className="flex flex-wrap items-center gap-3 text-sm font-medium"
        >
          {professionalAreaLink ? (
            <Link className="text-zinc-600 hover:text-teal-900" href="/login">
              Área do profissional
            </Link>
          ) : isAuthenticated ? (
            <Link
              className="rounded-lg bg-teal-800 px-3 py-2 text-white hover:bg-teal-900"
              href="/painel"
            >
              Ir para o painel
            </Link>
          ) : (
            <>
              <Link className="text-zinc-700 hover:text-teal-900" href="/login">
                Entrar
              </Link>
              <Link
                className="rounded-lg bg-teal-800 px-3 py-2 text-white hover:bg-teal-900"
                href="/cadastro"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
