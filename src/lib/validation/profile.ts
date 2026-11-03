import { z } from "zod";
import { JURISDICTION_CODES, normalizeLicense } from "@/lib/licenses";

/** Datos personales del paciente (Ajustes → Datos personales). */
export const patientProfileSchema = z.object({
  name: z.string().trim().min(2, "Escribí tu nombre").max(120),
});
export type PatientProfileInput = z.input<typeof patientProfileSchema>;

/** Datos de la profesional: nombre visible y matrícula. */
export const professionalProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Escribí cómo querés que te vean").max(120),
  licenseJurisdiction: z.enum(JURISDICTION_CODES, { error: "Elegí dónde estás matriculada" }),
  licenseNumber: z
    .string()
    .trim()
    .max(30)
    .transform(normalizeLicense)
    .refine((v) => v.length >= 2, "Escribí el número de matrícula"),
});
export type ProfessionalProfileInput = z.input<typeof professionalProfileSchema>;
