import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("Informe um e-mail válido.")
  .toLowerCase();

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .refine(
    (password) => new TextEncoder().encode(password).length <= 72,
    "A senha deve ter no máximo 72 bytes.",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      "A senha deve ter no máximo 72 bytes.",
    ),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome (mínimo de 2 caracteres).")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
