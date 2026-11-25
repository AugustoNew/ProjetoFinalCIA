import { z } from "zod";
import { providerSlugSchema } from "@/lib/slug-validation";

export const bookingContactSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  clientEmail: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .max(254, "O e-mail deve ter no máximo 254 caracteres.")
    .toLowerCase(),
  clientPhone: z
    .string()
    .trim()
    .min(8, "Informe um telefone válido.")
    .max(30, "O telefone deve ter no máximo 30 caracteres.")
    .regex(/^[+()\d.\-\s]+$/, "Informe um telefone válido.")
    .refine((phone) => {
      const digits = phone.replace(/\D/g, "").length;
      return digits >= 8 && digits <= 15;
    }, "Informe um telefone com 8 a 15 números."),
});

export const publicBookingSchema = bookingContactSchema
  .extend({
    slug: providerSlugSchema,
    serviceId: z.string().trim().min(1).max(100),
    startsAt: z
      .string()
      .datetime({ offset: true, message: "Selecione um horário válido." })
      .transform((value) => new Date(value)),
  })
  .strict();

export type BookingContact = z.infer<typeof bookingContactSchema>;
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
