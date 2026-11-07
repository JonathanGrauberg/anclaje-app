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

/** Alta propia de una profesional con email y contraseña (desde "Crear cuenta"). */
export const proSignUpSchema = professionalSignupSchema
  .extend({
    fullName: z.string().trim().min(3, "Escribí tu nombre y apellido").max(120),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email("Revisá el email")),
    password: z.string().min(8, "Usá al menos 8 caracteres").max(128, "Es demasiado larga"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
export type ProSignUpInput = z.input<typeof proSignUpSchema>;
