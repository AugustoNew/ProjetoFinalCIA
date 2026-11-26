import Link from "next/link";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

export default async function Home() {
  const session = await auth();

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4 py-16">
        <section className="max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-800">
            Agendaki
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Agendamentos simples, do início ao fim.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600">
            Organize seus serviços e horários e permita que seus clientes
            agendem online, sem criar uma conta.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {session?.user?.id ? (
              <Link
                className="rounded-lg bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-900"
                href="/painel"
              >
                Ir para o painel
              </Link>
            ) : (
              <>
                <Link
                  className="rounded-lg bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-900"
                  href="/login"
                >
                  Entrar
                </Link>
                <Link
                  className="rounded-lg border border-teal-800 px-5 py-3 font-semibold text-teal-900 hover:bg-teal-50"
                  href="/cadastro"
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
