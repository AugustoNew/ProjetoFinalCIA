import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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
          Acesse sua conta
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Entre para gerenciar seus agendamentos.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600">
          Ainda não tem conta?{" "}
          <Link
            className="font-semibold text-teal-800 hover:underline"
            href="/cadastro"
          >
            Cadastre-se
          </Link>
        </p>
      </section>
    </main>
  );
}
