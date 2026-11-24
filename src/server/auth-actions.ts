"use server";

import { Prisma, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { registerSchema } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export async function registerProvider(input: unknown) {
  const parsedInput = registerSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { name, email, password } = parsedInput.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      error: "Este e-mail já está cadastrado. Faça login ou use outro e-mail.",
    };
  }

  const passwordHash = await hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: UserRole.PROVIDER,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error:
          "Este e-mail já está cadastrado. Faça login ou use outro e-mail.",
      };
    }

    throw error;
  }

  return { error: null };
}
