"use server";

import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { providerSlugSchema } from "@/lib/slug-validation";

type SaveSlugResult =
  | { success: true; slug: string; message: string }
  | { success: false; message: string };

export async function saveProviderSlug(
  input: unknown,
): Promise<SaveSlugResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      message: "Faça login como prestador para continuar.",
    };
  }

  const parsedSlug = providerSlugSchema.safeParse(input);
  if (!parsedSlug.success) {
    return {
      success: false,
      message:
        parsedSlug.error.issues[0]?.message ?? "Informe um endereço válido.",
    };
  }

  const provider = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.PROVIDER },
    select: { id: true, slug: true },
  });
  if (!provider) {
    return { success: false, message: "Prestador não encontrado." };
  }

  try {
    const result = await prisma.user.updateMany({
      where: { id: provider.id, role: UserRole.PROVIDER },
      data: { slug: parsedSlug.data },
    });
    if (result.count === 0) {
      return { success: false, message: "Prestador não encontrado." };
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Este endereço já está sendo usado por outro prestador.",
      };
    }

    throw error;
  }

  revalidatePath("/painel");
  if (provider.slug) {
    revalidatePath(`/p/${provider.slug}`);
  }
  revalidatePath(`/p/${parsedSlug.data}`);

  return {
    success: true,
    slug: parsedSlug.data,
    message: "Seu endereço público foi atualizado.",
  };
}
