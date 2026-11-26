import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const legacyMessages: Record<string, string> = {
  cancelled: "O agendamento foi cancelado.",
  unavailable: "Este agendamento já não pode ser cancelado.",
  invalid: "O link de cancelamento é inválido.",
};

export default async function LegacyCancellationPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  if (typeof token === "string" && cancelTokenPattern.test(token)) {
    redirect(`/agendamento/${token}`);
  }

  const result = searchParams.result;
  const message =
    typeof result === "string" ? legacyMessages[result] : undefined;
  if (!message) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Cancelamento de agendamento
          </h1>
          <p className="mt-4 text-zinc-700">{message}</p>
          <Link
            className="mt-5 inline-flex font-semibold text-teal-800"
            href="/"
          >
            Voltar ao início
          </Link>
        </section>
      </main>
    </>
  );
}
