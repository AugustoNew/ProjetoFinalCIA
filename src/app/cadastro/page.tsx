import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 px-4 py-12">
        <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <Link
            className="text-sm font-semibold text-teal-800 hover:underline"
            href="/"
          >
            Voltar à página inicial
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-zinc-900">
            Crie sua conta de prestador
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Cadastre-se para organizar sua agenda online.
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Já tem conta?{" "}
            <Link
              className="font-semibold text-teal-800 hover:underline"
              href="/login"
            >
              Entre
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
