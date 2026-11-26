import { z } from "zod";
import { JURISDICTION_CODES } from "@/lib/licenses";

// Perfil público de la profesional y solicitudes de turno (compartido cliente/servidor).

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => v || undefined);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const AUDIENCES = [
  "Niñas y niños",
  "Adolescentes",
  "Adultos",
  "Adultos mayores",
  "Parejas",
  "Familias",
  "Grupos",
] as const;

export const educationItemSchema = z.object({
  title: z.string().trim().min(2, "Escribí el título").max(150),
  institution: optionalText(150),
  year: optionalText(20),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

/** Lee la formación guardada (JSON) sin confiar en su forma. */
export function parseEducation(value: unknown): EducationItem[] {
  const parsed = z.array(educationItemSchema).max(20).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export const publicProfileSchema = z.object({
  publicProfile: z.boolean(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo 3 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(SLUG_RE, "Solo letras sin tilde, números y guiones"),
  headline: optionalText(120),
  bio: optionalText(1500),
  approaches: z.array(z.string().trim().min(1).max(40)).max(12, "Hasta 12 enfoques").default([]),
  audiences: z.array(z.enum(AUDIENCES)).default([]),
  languages: z.array(z.string().trim().min(1).max(30)).max(6, "Hasta 6 idiomas").default([]),
  education: z.array(educationItemSchema).max(20, "Hasta 20 ítems de formación").default([]),
  city: optionalText(80),
  province: z.enum(JURISDICTION_CODES).optional(),
  address: optionalText(200),
  publicPhone: optionalText(40),
  whatsapp: z.boolean(),
  inPerson: z.boolean(),
  online: z.boolean(),
  coverage: optionalText(300),
  acceptsRequests: z.boolean(),
});
export type PublicProfileInput = z.input<typeof publicProfileSchema>;

export const appointmentRequestSchema = z.object({
  slug: z.string().trim().max(60),
  name: z.string().trim().min(2, "Escribí tu nombre").max(120),
  email: z.string().trim().toLowerCase().email("Revisá el mail").max(200),
  phone: optionalText(40),
  modality: z.enum(["IN_PERSON", "ONLINE", "ANY"]).default("ANY"),
  message: optionalText(600),
  /** Campo trampa para bots: tiene que llegar vacío. */
  website: z.string().max(0).optional(),
  consent: z.literal(true, { error: "Necesitamos tu OK para mandarle tus datos" }),
});
export type AppointmentRequestInput = z.input<typeof appointmentRequestSchema>;
