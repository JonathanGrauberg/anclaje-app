import { z } from "zod";

export const createProfessionalSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre").max(120),
  email: z.email({ message: "Email inválido" }).max(254),
  licenseNumber: z.string().trim().max(60).optional(),
});
export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;

export const crisisLineSchema = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Escribí el nombre").max(120),
  phone: z
    .string()
    .trim()
    .min(2, "Escribí el teléfono")
    .max(40)
    .regex(/^[0-9+\-() ]+$/, "Solo números, espacios, +, - y paréntesis"),
  description: z.string().trim().max(300).optional(),
  region: z.string().trim().max(80).optional(),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
});
export type CrisisLineInput = z.infer<typeof crisisLineSchema>;

export const AUDIT_PAGE_SIZE = 50;

export const auditFilterSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  action: z.enum(["view", "create", "update", "delete", "export"]).optional().catch(undefined),
  entity: z.string().trim().max(60).optional().catch(undefined),
});
