"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterFormValues } from "@/lib/auth-validation";
import { registerProvider } from "@/server/auth-actions";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const result = await registerProvider(values);
      if (result.error) {
        setServerError(result.error);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        redirectTo: "/painel",
      });

      if (!signInResult?.ok || signInResult.error) {
        setServerError(
          "Cadastro realizado, mas não foi possível entrar automaticamente. Faça login.",
        );
        return;
      }

      router.replace("/painel");
      router.refresh();
    } catch {
      setServerError("Não foi possível concluir o cadastro. Tente novamente.");
    }
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          Nome
        </label>
        <input
          {...register("name")}
          autoComplete="name"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          id="name"
          type="text"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          {...register("email")}
          autoComplete="email"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          id="email"
          type="email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <input
          {...register("password")}
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          id="password"
          type="password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>
        )}
        <p className="mt-1 text-xs text-zinc-600">
          Use pelo menos 8 caracteres.
        </p>
      </div>

      {serverError && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <button
        className="w-full rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
