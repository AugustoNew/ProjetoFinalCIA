import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PublicPageLink } from "@/components/navigation/public-page-link";
import { PublicSlugForm } from "@/components/profile/public-slug-form";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { slug: true },
  });

  if (!provider) {
    redirect("/login");
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900">Perfil</h1>
        <p className="mt-2 text-zinc-600">
          Configure e compartilhe sua página pública de agendamento.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Seu link de agendamento
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Compartilhe seu endereço para que clientes agendem sem criar uma
          conta.
        </p>
        <PublicSlugForm slug={provider.slug ?? ""} />
        <PublicPageLink slug={provider.slug} />
      </section>
    </section>
  );
}
