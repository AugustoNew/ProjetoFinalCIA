import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          className="text-sm font-bold tracking-wide text-teal-800"
          href="/"
        >
          Agendaki
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
            Fazer login
          </Link>
        </p>
      </section>
    </main>
  );
}
