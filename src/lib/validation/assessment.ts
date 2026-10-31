import { z } from "zod";

// Formato "documento" de una versión de evaluación. Lo usan el armador (estado del cliente),
// el guardado en la DB, la exportación/importación JSON y las plantillas del sistema.
// Guardar un borrador acepta textos vacíos; publicar exige `publishProblems(doc) === []`.

export const QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "LIKERT",
  "SLIDER",
  "PERCENTAGE",
  "YES_NO",
  "NUMBER",
  "SHORT_TEXT",
  "LONG_TEXT",
  "DATE",
  "INFO",
] as const;
export const SCORING_METHODS = ["SUM", "AVERAGE", "WEIGHTED_SUM"] as const;
export const CRITICAL_OPERATORS = ["GTE", "GT", "EQ", "LTE", "LT"] as const;

const key = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Clave inválida");
const shortText = (max: number) => z.string().max(max).nullable().default(null);

export const docOptionSchema = z.object({
  key,
  label: z.string().max(200),
  value: z.number().finite().min(-1000).max(1000),
});

export const docQuestionSchema = z.object({
  key,
  type: z.enum(QUESTION_TYPES),
  text: z.string().max(1000),
  helpText: shortText(1000),
  required: z.boolean().default(true),
  scored: z.boolean().default(true),
  reverse: z.boolean().default(false),
  weight: z.number().finite().min(-100).max(100).default(1),
  subscaleKey: key.nullable().default(null),
  blockKey: key.nullable().default(null),
  criticalOperator: z.enum(CRITICAL_OPERATORS).nullable().default(null),
  criticalValue: z.number().finite().nullable().default(null),
  config: z
    .object({
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
      step: z.number().finite().positive().optional(),
      minLabel: z.string().max(80).optional(),
      maxLabel: z.string().max(80).optional(),
    })
    .default({}),
  options: z.array(docOptionSchema).max(20).default([]),
});

export const docSubscaleSchema = z.object({
  key,
  name: z.string().max(120),
  method: z.enum(SCORING_METHODS).default("SUM"),
});

export const docRangeSchema = z.object({
  subscaleKey: key.nullable().default(null),
  min: z.number().finite(),
  max: z.number().finite(),
  label: z.string().max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  text: shortText(1000),
});

export const assessmentDocSchema = z
  .object({
    format: z.literal("sentir.assessment").default("sentir.assessment"),
    formatVersion: z.literal(1).default(1),
    title: z.string().trim().min(1, "Poné un título").max(200),
    description: shortText(2000),
    sourceNote: shortText(2000),
    instructions: shortText(4000),
    referencePeriod: shortText(200),
    scoringMethod: z.enum(SCORING_METHODS).default("SUM"),
    patientSeesScore: z.boolean().default(false),
    closingMessage: shortText(2000),
    questions: z.array(docQuestionSchema).max(200),
    subscales: z.array(docSubscaleSchema).max(20).default([]),
    ranges: z.array(docRangeSchema).max(60).default([]),
  })
  .superRefine((doc, ctx) => {
    const keys = new Set<string>();
    for (const q of doc.questions) {
      if (keys.has(q.key))
        ctx.addIssue({ code: "custom", message: "Preguntas con clave repetida" });
      keys.add(q.key);
      for (const o of q.options) {
        if (keys.has(o.key))
          ctx.addIssue({ code: "custom", message: "Opciones con clave repetida" });
        keys.add(o.key);
      }
    }
    const subs = new Set(doc.subscales.map((s) => s.key));
    if (subs.size !== doc.subscales.length)
      ctx.addIssue({ code: "custom", message: "Subescalas con clave repetida" });
    for (const q of doc.questions)
      if (q.subscaleKey && !subs.has(q.subscaleKey))
        ctx.addIssue({ code: "custom", message: "Una pregunta usa una subescala que no existe" });
    for (const r of doc.ranges)
      if (r.subscaleKey && !subs.has(r.subscaleKey))
        ctx.addIssue({ code: "custom", message: "Un rango usa una subescala que no existe" });
  });

export type AssessmentDoc = z.output<typeof assessmentDocSchema>;
export type AssessmentDocInput = z.input<typeof assessmentDocSchema>;
export type DocQuestion = AssessmentDoc["questions"][number];
export type DocOption = DocQuestion["options"][number];
export type DocSubscale = AssessmentDoc["subscales"][number];
export type DocRange = AssessmentDoc["ranges"][number];
export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];

// Respuestas del paciente (guardado parcial, una por pregunta).
export const answerSchema = z.object({
  responseId: z.string().min(1).max(40),
  questionId: key,
  valueNumber: z.number().finite().nullable().optional(),
  optionIds: z.array(key).max(20).optional(),
  text: z.string().max(5000).optional(),
  valueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export type AnswerInput = z.input<typeof answerSchema>;

export const assignAssessmentSchema = z.object({
  assessmentId: z.string().min(1).max(40),
  patientId: z.string().min(1).max(40),
  recurrenceDays: z.number().int().min(1).max(365).nullable().default(null),
});
export type AssignAssessmentInput = z.input<typeof assignAssessmentSchema>;

export const externalResultSchema = z.object({
  patientId: z.string().min(1).max(40),
  name: z.string().trim().min(1, "Poné el nombre del instrumento").max(200),
  score: z.number().finite().nullable().optional(),
  interpretation: z.string().trim().max(500).optional(),
  takenAt: z.coerce.date(),
  notes: z.string().trim().max(5000).optional(),
  storageKey: z.string().max(200).nullable().optional(),
});
export type ExternalResultInput = z.input<typeof externalResultSchema>;
