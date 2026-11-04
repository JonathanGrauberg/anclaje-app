import { z } from "zod";
import { MAX_PRICE } from "@/lib/fees";

const id = z.string().min(1).max(40);
const amount = (min: number) =>
  z
    .number({ error: "Escribí un monto" })
    .int("Sin centavos")
    .min(min, min > 0 ? "El monto tiene que ser mayor a 0" : "El monto no puede ser negativo")
    .max(MAX_PRICE, "Ese monto es demasiado grande");

/** Un renglón de la lista de precios. */
export const servicePriceSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, "Poné un nombre").max(80, "Máximo 80 caracteres"),
  price: amount(0),
});
export type ServicePriceInput = z.input<typeof servicePriceSchema>;

/** Precio especial de un servicio para un paciente. null = vuelve al de la lista. */
export const patientPriceSchema = z.object({
  patientId: id,
  serviceId: id,
  price: amount(0).nullable(),
});
export type PatientPriceInput = z.input<typeof patientPriceSchema>;

export const paymentSchema = z.object({
  patientId: id,
  /** Servicio de la lista; null = "Otro" (sin texto libre: no guardamos detalles clínicos acá). */
  serviceId: id.nullable(),
  amount: amount(1),
  method: z.enum(["CASH", "TRANSFER", "MERCADO_PAGO", "HEALTH_INSURANCE", "OTHER"]),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí la fecha"),
});
export type PaymentInput = z.input<typeof paymentSchema>;
