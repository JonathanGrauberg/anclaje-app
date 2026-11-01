import { z } from "zod";

/** Paciente sin la app: lo carga la profesional con nombre y, si quiere, un contacto. */
export const managedPatientSchema = z.object({
  name: z.string().trim().min(1, "Escribí el nombre").max(120, "Máximo 120 caracteres"),
  contact: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
});
export type ManagedPatientInput = z.infer<typeof managedPatientSchema>;

export const updateManagedPatientSchema = managedPatientSchema.extend({
  patientId: z.string().min(1).max(40),
});
export type UpdateManagedPatientInput = z.infer<typeof updateManagedPatientSchema>;
