import { z } from "zod";

const maximumPriceCents = 2_147_483_647;

export const serviceFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter pelo menos 2 caracteres.")
      .max(100, "O nome deve ter no máximo 100 caracteres."),
    description: z
      .string()
      .trim()
      .max(500, "A descrição deve ter no máximo 500 caracteres."),
    durationMinutes: z
      .number()
      .int("Informe a duração em minutos.")
      .min(1, "A duração deve ser de pelo menos 1 minuto.")
      .max(1440, "A duração não pode passar de 24 horas."),
    price: z
      .string()
      .trim()
      .max(12, "O preço informado é muito alto.")
      .regex(/^\d+(?:[,.]\d{1,2})?$/, "Informe um preço válido, como 85,00.")
      .transform((value) => {
        const [reais, centavos = ""] = value.replace(",", ".").split(".");
        return Number(`${reais}${centavos.padEnd(2, "0")}`);
      })
      .pipe(
        z
          .number()
          .int()
          .min(0, "O preço não pode ser negativo.")
          .max(maximumPriceCents, "O preço informado é muito alto."),
      ),
  })
  .transform(({ price, ...service }) => ({
    ...service,
    priceCents: price,
  }));

export const serviceDataSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve ter pelo menos 2 caracteres.")
      .max(100, "O nome deve ter no máximo 100 caracteres."),
    description: z
      .string()
      .trim()
      .max(500, "A descrição deve ter no máximo 500 caracteres."),
    durationMinutes: z
      .number()
      .int("Informe a duração em minutos.")
      .min(1, "A duração deve ser de pelo menos 1 minuto.")
      .max(1440, "A duração não pode passar de 24 horas."),
    priceCents: z
      .number()
      .int("Informe o preço em centavos.")
      .min(0, "O preço não pode ser negativo.")
      .max(maximumPriceCents, "O preço informado é muito alto."),
  })
  .strict();

export const serviceIdSchema = z.string().trim().min(1).max(100);

export type ServiceFormInput = z.input<typeof serviceFormSchema>;
export type ServiceData = z.infer<typeof serviceDataSchema>;
