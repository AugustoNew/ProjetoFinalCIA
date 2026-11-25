import { z } from "zod";

export const providerSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O endereço deve ter pelo menos 3 caracteres.")
  .max(80, "O endereço deve ter no máximo 80 caracteres.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use apenas letras, números e hífens, sem hífen no início ou no fim.",
  );

export function slugifyProviderName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");

  return slug || "prestador";
}
