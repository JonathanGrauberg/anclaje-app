import { z } from "zod";
import { JURISDICTION_CODES, normalizeLicense } from "@/lib/licenses";
import { buildPhone } from "@/lib/phone";

/** Celular (opcional): país + número. Sale listo para WhatsApp, o null si lo dejaron vacío. */
const phoneFields = {
  phoneCountry: z.string().max(4),
  phone: z.string().trim().max(30),
};
function toPhone<V extends { phoneCountry: string; phone: string }>(
  v: V,
  ctx: z.RefinementCtx,
): Omit<V, "phoneCountry" | "phone"> & { phone: string | null } {
  const { phoneCountry, phone, ...rest } = v;
  if (!phone.replace(/\D/g, "")) return { ...rest, phone: null };
  const built = buildPhone(phoneCountry, phone);
  if (!built.ok) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: built.error });
    return z.NEVER;
  }
  return { ...rest, phone: built.value };
}

/** Datos personales del paciente (Ajustes → Datos personales). */
export const patientProfileSchema = z
  .object({ name: z.string().trim().min(2, "Escribí tu nombre").max(120), ...phoneFields })
  .transform(toPhone);
export type PatientProfileInput = z.input<typeof patientProfileSchema>;

/** Datos de la profesional: nombre visible, matrícula y celular. */
export const professionalProfileSchema = z
  .object({
    displayName: z.string().trim().min(2, "Escribí cómo querés que te vean").max(120),
    licenseJurisdiction: z.enum(JURISDICTION_CODES, { error: "Elegí dónde estás matriculada" }),
    licenseNumber: z
      .string()
      .trim()
      .max(30)
      .transform(normalizeLicense)
      .refine((v) => v.length >= 2, "Escribí el número de matrícula"),
    ...phoneFields,
  })
  .transform(toPhone);
export type ProfessionalProfileInput = z.input<typeof professionalProfileSchema>;
