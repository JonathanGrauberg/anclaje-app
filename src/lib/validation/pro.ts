import { z } from "zod";
import { VISIBILITIES } from "@/lib/constants";

// Schemas de la fase 2 (vínculo, panel profesional, plan de calma, tareas).

const id = z.string().min(1).max(40);

export const FEEDBACK_TARGETS = ["JOURNAL", "EMOTION", "CBT"] as const;
export type FeedbackTarget = (typeof FEEDBACK_TARGETS)[number];

export const acceptInvitationSchema = z.object({
  code: z.string().max(20),
  accepted: z.literal(true, { error: "Necesitamos que aceptes el consentimiento" }),
});
export type AcceptInvitationInput = z.input<typeof acceptInvitationSchema>;

export const sharingDefaultsSchema = z.object({
  journal: z.enum(VISIBILITIES),
  emotions: z.enum(VISIBILITIES),
  cbt: z.enum(VISIBILITIES),
});
export type SharingDefaultsInput = z.input<typeof sharingDefaultsSchema>;

export const feedbackSchema = z.object({
  targetType: z.enum(FEEDBACK_TARGETS),
  targetId: id,
  body: z.string().trim().min(1, "Escribí la devolución").max(5000, "Máximo 5000 caracteres"),
  discussInSession: z.boolean().default(false),
  resourceId: id.nullable().optional(),
});
export type FeedbackInput = z.input<typeof feedbackSchema>;

export const quickReplySchema = z.object({
  id: id.optional(),
  title: z.string().trim().min(1, "Poné un título corto").max(60),
  body: z.string().trim().min(1, "Escribí el texto").max(2000),
});
export type QuickReplyInput = z.input<typeof quickReplySchema>;

export const clinicalNoteSchema = z.object({
  id: id.optional(),
  patientId: id,
  body: z.string().trim().min(1, "La nota está vacía").max(20_000),
});
export type ClinicalNoteInput = z.input<typeof clinicalNoteSchema>;

const recordText = z.string().trim().max(20_000).optional();
export const CLINICAL_RECORD_FIELDS = [
  { key: "reason", label: "Motivo de consulta" },
  { key: "history", label: "Antecedentes personales y familiares" },
  { key: "medication", label: "Medicación y otros tratamientos" },
  { key: "diagnosis", label: "Diagnóstico o hipótesis diagnóstica" },
  { key: "plan", label: "Objetivos y plan de tratamiento" },
  { key: "emergencyContact", label: "Contacto de emergencia" },
] as const;
export type ClinicalRecordField = (typeof CLINICAL_RECORD_FIELDS)[number]["key"];

export const clinicalRecordSchema = z.object({
  patientId: id,
  treatmentStartedAt: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Fecha inválida")
    .optional(),
  reason: recordText,
  history: recordText,
  medication: recordText,
  diagnosis: recordText,
  plan: recordText,
  emergencyContact: z.string().trim().max(500).optional(),
});
export type ClinicalRecordInput = z.input<typeof clinicalRecordSchema>;

export const COPING_CARD_TYPES = ["TECHNIQUE", "PHRASE", "ACTIVITY", "CONTACT"] as const;
export type CopingCardTypeValue = (typeof COPING_CARD_TYPES)[number];
export const COPING_TECHNIQUES = ["BREATHING", "GROUNDING", "OTHER"] as const;

export const COPING_CARD_LABELS: Record<CopingCardTypeValue, string> = {
  TECHNIQUE: "Técnica",
  PHRASE: "Frase",
  ACTIVITY: "Actividad",
  CONTACT: "Contacto",
};

export const copingCardSchema = z
  .object({
    id: id.optional(),
    type: z.enum(COPING_CARD_TYPES),
    technique: z.enum(COPING_TECHNIQUES).nullable().optional(),
    title: z.string().trim().min(1, "Poné un título").max(120),
    body: z.string().trim().max(500).optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .regex(/^[\d\s()+-]*$/, "Solo números, espacios, + y -")
      .optional(),
    whatsapp: z.boolean().default(false),
  })
  .refine((c) => c.type !== "CONTACT" || (c.phone ?? "").replace(/\D/g, "").length >= 6, {
    message: "Para un contacto necesitamos el teléfono",
    path: ["phone"],
  })
  .transform((c) => ({
    ...c,
    body: c.body || null,
    technique: c.type === "TECHNIQUE" ? (c.technique ?? "OTHER") : null,
    phone: c.type === "CONTACT" ? (c.phone ?? null) : null,
    whatsapp: c.type === "CONTACT" ? c.whatsapp : false,
  }));
export type CopingCardInput = z.input<typeof copingCardSchema>;

export const taskSchema = z.object({
  patientId: id,
  title: z.string().trim().min(1, "Poné un título").max(150),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.coerce.date().nullable().optional(),
});
export type TaskInput = z.input<typeof taskSchema>;

export const taskProgressSchema = z.object({
  id,
  done: z.boolean(),
  comment: z.string().trim().max(2000, "Máximo 2000 caracteres").optional(),
});
export type TaskProgressInput = z.input<typeof taskProgressSchema>;

export const RESOURCE_KINDS = ["PDF", "IMAGE", "LINK", "TEXT"] as const;
export type ResourceKindValue = (typeof RESOURCE_KINDS)[number];

export const resourceSchema = z
  .object({
    id: id.optional(),
    kind: z.enum(RESOURCE_KINDS),
    title: z.string().trim().min(1, "Poné un título").max(200),
    description: z.string().trim().max(1000).optional(),
    category: z.string().trim().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
    url: z.string().trim().max(2000).optional(),
    storageKey: z.string().max(200).optional(),
    bodyText: z.string().max(50_000).optional(),
  })
  .superRefine((r, ctx) => {
    if (r.kind === "LINK" && !/^https:\/\/[^\s]+$/i.test(r.url ?? ""))
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Pegá un link que empiece con https://",
      });
    if (r.kind === "TEXT" && !r.bodyText?.trim())
      ctx.addIssue({ code: "custom", path: ["bodyText"], message: "Escribí el contenido" });
    if ((r.kind === "PDF" || r.kind === "IMAGE") && !r.storageKey)
      ctx.addIssue({ code: "custom", path: ["storageKey"], message: "Subí el archivo" });
  })
  .transform((r) => ({
    ...r,
    description: r.description || null,
    category: r.category || null,
    url: r.kind === "LINK" ? r.url! : null,
    storageKey: r.kind === "PDF" || r.kind === "IMAGE" ? r.storageKey! : null,
    bodyText: r.kind === "TEXT" ? r.bodyText! : null,
  }));
export type ResourceInput = z.input<typeof resourceSchema>;
