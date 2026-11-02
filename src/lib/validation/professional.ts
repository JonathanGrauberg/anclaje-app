import { z } from "zod";
import { JURISDICTION_CODES, normalizeLicense } from "@/lib/licenses";

/** Alta propia de una profesional que entró con Google. */
export const professionalSignupSchema = z.object({
  displayName: z.string().trim().min(2, "Escribí cómo querés que te vean").max(120),
  licenseJurisdiction: z.enum(JURISDICTION_CODES, { error: "Elegí dónde estás matriculada" }),
  licenseNumber: z
    .string()
    .trim()
    .max(30)
    .transform(normalizeLicense)
    .refine((v) => v.length >= 2, "Escribí el número de matrícula"),
  declaration: z.literal(true, { error: "Tenés que confirmar que los datos son tuyos" }),
});
export type ProfessionalSignupInput = z.input<typeof professionalSignupSchema>;
