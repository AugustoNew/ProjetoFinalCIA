import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicSlugForm } from "@/components/profile/public-slug-form";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const instant = false;

export default function DashboardPage() {
  return <DashboardContent />;
}

async function DashboardContent() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { name: true, slug: true },
  });
  if (!provider) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">
          Bem-vindo(a), {provider.name}!
        </h1>
        <p className="mt-2 text-zinc-600">
          Este é o seu painel de agendamentos.
        </p>
      </header>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Seu link de agendamento
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Compartilhe seu endereço para que clientes agendem sem criar uma
          conta.
        </p>
        <PublicSlugForm slug={provider.slug ?? ""} />
        {provider.slug && (
          <Link
            className="mt-4 inline-flex text-sm font-semibold text-teal-800 hover:underline"
            href={`/p/${provider.slug}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir página pública
          </Link>
        )}
      </div>
    </section>
  );
}
