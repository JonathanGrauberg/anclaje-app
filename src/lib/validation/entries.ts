import { z } from "zod";
import { BODY_ZONE_IDS, INTENTIONS, VISIBILITIES } from "@/lib/constants";

// Schemas compartidos cliente/servidor. El servidor SIEMPRE vuelve a validar.

const nodeId = z.string().min(1).max(120);
const bodyZones = z.array(z.enum(BODY_ZONE_IDS)).max(BODY_ZONE_IDS.length).default([]);

export const shareSchema = z
  .object({
    visibility: z.enum(VISIBILITIES),
    intention: z.enum(INTENTIONS).nullable().default(null),
  })
  .transform((s) =>
    // Si es privado no guardamos intención; si se comparte sin elegir, "solo para que lo veas".
    s.visibility === "PRIVATE"
      ? { visibility: s.visibility, intention: null }
      : { visibility: s.visibility, intention: s.intention ?? "JUST_FYI" },
  );
export type ShareInput = z.input<typeof shareSchema>;

export const emotionPickSchema = z.object({
  nodeId,
  intensity: z.number().int().min(1).max(10),
});

export const emotionEntrySchema = z.object({
  picks: z
    .array(emotionPickSchema)
    .min(1, "Elegí al menos una emoción")
    .max(12)
    .refine((p) => new Set(p.map((x) => x.nodeId)).size === p.length, "Emociones repetidas"),
  bodyZones,
  note: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
  share: shareSchema,
});
export type EmotionEntryInput = z.input<typeof emotionEntrySchema>;

export const journalSchema = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().max(150).optional(),
  body: z.string().max(50_000, "La entrada es demasiado larga"),
  emotionIds: z.array(nodeId).max(20).default([]),
  share: shareSchema,
  publish: z.boolean().default(false), // false = autoguardado de borrador
});
export type JournalInput = z.input<typeof journalSchema>;

const percent = z.number().int().min(0).max(100);

export const cbtDraftSchema = z.object({
  id: z.string().max(40),
  currentStep: z.number().int().min(1).max(7),
  occurredAt: z.coerce.date().optional(),
  situation: z.string().max(5000).optional(),
  thought: z.string().max(5000).optional(),
  beliefBefore: percent.nullable().optional(),
  distortionIds: z.array(z.string().max(60)).max(20).optional(),
  emotions: z
    .array(
      z.object({
        nodeId,
        intensityBefore: z.number().int().min(1).max(10),
        intensityAfter: z.number().int().min(1).max(10).nullable().optional(),
      }),
    )
    .max(12)
    .optional(),
  bodyZones: z.array(z.enum(BODY_ZONE_IDS)).optional(),
  behavior: z.string().max(5000).optional(),
  alternative: z.string().max(5000).optional(),
  beliefAfter: percent.nullable().optional(),
  share: shareSchema.optional(),
});
export type CbtDraftInput = z.input<typeof cbtDraftSchema>;

export const ENTRY_SOURCES = ["JOURNAL", "EMOTION", "CBT"] as const;

export const sessionTopicSchema = z.object({
  text: z.string().trim().min(1, "Escribí el tema").max(500, "Máximo 500 caracteres"),
  sourceType: z.enum(ENTRY_SOURCES).optional(),
  sourceId: z.string().max(40).optional(),
});
export type SessionTopicInput = z.input<typeof sessionTopicSchema>;
