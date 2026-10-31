// Utilidades puras sobre el documento de evaluación (cliente y servidor).
import type { ScoringAnswer, ScoringInput } from "@/lib/scoring";
import type { AssessmentDoc, DocQuestion, QuestionTypeValue } from "@/lib/validation/assessment";

export const QUESTION_TYPE_LABELS: Record<QuestionTypeValue, string> = {
  SINGLE_CHOICE: "Opción única",
  MULTIPLE_CHOICE: "Opción múltiple",
  LIKERT: "Escala Likert",
  SLIDER: "Deslizador",
  PERCENTAGE: "Porcentaje",
  YES_NO: "Sí / No",
  NUMBER: "Número",
  SHORT_TEXT: "Texto corto",
  LONG_TEXT: "Texto largo",
  DATE: "Fecha",
  INFO: "Título / texto informativo",
};

export const CRITICAL_LABELS = {
  GTE: "≥",
  GT: ">",
  EQ: "=",
  LTE: "≤",
  LT: "<",
} as const;

export const METHOD_LABELS = {
  SUM: "Suma",
  AVERAGE: "Promedio",
  WEIGHTED_SUM: "Suma ponderada",
} as const;

export const OPTION_TYPES: QuestionTypeValue[] = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "LIKERT",
  "YES_NO",
];
export const NUMERIC_TYPES: QuestionTypeValue[] = ["SLIDER", "PERCENTAGE", "NUMBER"];

export const hasOptions = (t: QuestionTypeValue) => OPTION_TYPES.includes(t);
export const isScorable = (t: QuestionTypeValue) =>
  OPTION_TYPES.includes(t) || NUMERIC_TYPES.includes(t);

export function newKey() {
  // Claves aleatorias cortas; también se usan como id en la DB (ver repo.ts).
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

const DEFAULT_LIKERT = ["Nunca", "A veces", "Seguido", "Siempre"];

export function newQuestion(type: QuestionTypeValue, blockKey: string | null = null): DocQuestion {
  const options =
    type === "YES_NO"
      ? [
          { key: newKey(), label: "Sí", value: 1 },
          { key: newKey(), label: "No", value: 0 },
        ]
      : type === "LIKERT"
        ? DEFAULT_LIKERT.map((label, value) => ({ key: newKey(), label, value }))
        : type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
          ? [
              { key: newKey(), label: "Opción 1", value: 0 },
              { key: newKey(), label: "Opción 2", value: 1 },
            ]
          : [];
  return {
    key: newKey(),
    type,
    text: "",
    helpText: null,
    required: type !== "INFO",
    scored: isScorable(type),
    reverse: false,
    weight: 1,
    subscaleKey: null,
    blockKey,
    criticalOperator: null,
    criticalValue: null,
    config: type === "SLIDER" ? { min: 0, max: 10, step: 1 } : {},
    options,
  };
}

/** Bloque de escala: varios ítems Likert que comparten opciones y se responden en una pantalla. */
export function newLikertBlock(count = 3): DocQuestion[] {
  const blockKey = newKey();
  const first = newQuestion("LIKERT", blockKey);
  return Array.from({ length: count }, (_, i) =>
    i === 0
      ? first
      : {
          ...newQuestion("LIKERT", blockKey),
          options: first.options.map((o) => ({ ...o, key: newKey() })),
        },
  );
}

/** Nuevas claves para todo el documento (al duplicar, versionar o importar). */
export function rekey(doc: AssessmentDoc): AssessmentDoc {
  const map = new Map<string, string>();
  const k = (old: string | null) => {
    if (!old) return null;
    if (!map.has(old)) map.set(old, newKey());
    return map.get(old)!;
  };
  return {
    ...doc,
    subscales: doc.subscales.map((s) => ({ ...s, key: k(s.key)! })),
    questions: doc.questions.map((q) => ({
      ...q,
      key: k(q.key)!,
      subscaleKey: k(q.subscaleKey),
      blockKey: k(q.blockKey),
      options: q.options.map((o) => ({ ...o, key: k(o.key)! })),
    })),
    ranges: doc.ranges.map((r) => ({ ...r, subscaleKey: k(r.subscaleKey) })),
  };
}

/** Lo que falta para poder publicar. Lista vacía = se puede publicar. */
export function publishProblems(doc: AssessmentDoc): string[] {
  const problems: string[] = [];
  const answerable = doc.questions.filter((q) => q.type !== "INFO");
  if (/TODO/.test(doc.instructions ?? "")) problems.push("Las instrucciones tienen un TODO.");
  if (answerable.length === 0) problems.push("Agregá al menos una pregunta.");
  doc.questions.forEach((q, i) => {
    const n = `Pregunta ${i + 1}`;
    if (!q.text.trim()) problems.push(`${n}: falta el texto.`);
    if (/TODO/.test(q.text) || q.options.some((o) => /TODO/.test(o.label)))
      problems.push(`${n}: reemplazá los TODO por la redacción validada.`);
    if (hasOptions(q.type)) {
      if (q.options.length < 2) problems.push(`${n}: necesita al menos dos opciones.`);
      if (q.options.some((o) => !o.label.trim())) problems.push(`${n}: hay opciones sin texto.`);
    }
    if (q.type === "SLIDER") {
      const { min, max } = q.config;
      if (min === undefined || max === undefined || min >= max)
        problems.push(`${n}: el deslizador necesita mínimo y máximo.`);
    }
    if (q.criticalOperator && q.criticalValue === null)
      problems.push(`${n}: el ítem crítico necesita un valor.`);
  });
  doc.subscales.forEach((s) => {
    if (!s.name.trim()) problems.push("Hay una subescala sin nombre.");
  });
  doc.ranges.forEach((r) => {
    if (!r.label.trim()) problems.push("Hay un rango de puntaje sin nombre.");
    if (r.min > r.max) problems.push(`El rango “${r.label}” tiene el mínimo mayor que el máximo.`);
  });
  return problems;
}

export type AnswerMap = Record<string, ScoringAnswer | undefined>;

export function toScoringInput(doc: AssessmentDoc, answers: AnswerMap): ScoringInput {
  return {
    method: doc.scoringMethod,
    subscales: doc.subscales,
    ranges: doc.ranges,
    answers,
    questions: doc.questions.map((q) => ({
      key: q.key,
      type: q.type,
      scored: q.scored,
      reverse: q.reverse,
      weight: q.weight,
      subscaleKey: q.subscaleKey,
      criticalOperator: q.criticalOperator,
      criticalValue: q.criticalValue,
      options: q.options.map((o) => ({ key: o.key, value: o.value })),
      min: q.type === "SLIDER" || q.type === "NUMBER" ? (q.config.min ?? null) : null,
      max: q.type === "SLIDER" || q.type === "NUMBER" ? (q.config.max ?? null) : null,
    })),
  };
}

/** Pantallas del cuestionario: un ítem por pantalla, salvo bloques Likert consecutivos. */
export function toScreens(questions: DocQuestion[]): DocQuestion[][] {
  const screens: DocQuestion[][] = [];
  for (const q of questions) {
    const last = screens.at(-1);
    if (q.blockKey && last && last[0].blockKey === q.blockKey) last.push(q);
    else screens.push([q]);
  }
  return screens;
}

export function emptyDoc(title: string): AssessmentDoc {
  return {
    format: "sentir.assessment",
    formatVersion: 1,
    title,
    description: null,
    sourceNote: null,
    instructions: null,
    referencePeriod: null,
    scoringMethod: "SUM",
    patientSeesScore: false,
    closingMessage: null,
    questions: [],
    subscales: [],
    ranges: [],
  };
}
