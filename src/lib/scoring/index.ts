// Motor de puntajes de evaluaciones. Puro: sin DB ni React, testeado con Vitest.
// Lo usan el servidor (al terminar una respuesta) y la vista previa del armador.

export type ScoringMethod = "SUM" | "AVERAGE" | "WEIGHTED_SUM";
export type CriticalOperator = "GTE" | "GT" | "EQ" | "LTE" | "LT";
export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "LIKERT"
  | "SLIDER"
  | "PERCENTAGE"
  | "YES_NO"
  | "NUMBER"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "DATE"
  | "INFO";

export type ScoringQuestion = {
  key: string;
  type: QuestionType;
  scored: boolean;
  reverse: boolean;
  weight: number;
  subscaleKey: string | null;
  criticalOperator: CriticalOperator | null;
  criticalValue: number | null;
  options: { key: string; value: number }[];
  /** Para SLIDER / NUMBER: rango, necesario para invertir. PERCENTAGE usa 0–100. */
  min?: number | null;
  max?: number | null;
};

export type ScoringAnswer = { valueNumber?: number | null; optionKeys?: string[] };

export type ScoringRange = {
  subscaleKey: string | null; // null = total
  min: number;
  max: number;
  label: string;
  color: string;
  text?: string | null;
};

export type ScoringInput = {
  method: ScoringMethod;
  questions: ScoringQuestion[];
  subscales: { key: string; name: string; method: ScoringMethod }[];
  ranges: ScoringRange[];
  answers: Record<string, ScoringAnswer | undefined>;
};

export type ScoreResult = {
  total: number | null;
  answered: number;
  scoredCount: number;
  totalRange: ScoringRange | null;
  subscales: {
    key: string;
    name: string;
    score: number | null;
    answered: number;
    range: ScoringRange | null;
  }[];
  criticalKeys: string[];
};

const OPTION_TYPES: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "LIKERT", "YES_NO"];
const NUMERIC_TYPES: QuestionType[] = ["SLIDER", "PERCENTAGE", "NUMBER"];

export function isScorableType(type: QuestionType) {
  return OPTION_TYPES.includes(type) || NUMERIC_TYPES.includes(type);
}

/** Valor crudo de una respuesta (sin invertir). null si no hay respuesta o no es puntuable. */
export function rawValue(q: ScoringQuestion, a: ScoringAnswer | undefined): number | null {
  if (!a) return null;
  if (OPTION_TYPES.includes(q.type)) {
    const keys = a.optionKeys ?? [];
    const values = keys
      .map((k) => q.options.find((o) => o.key === k)?.value)
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return null;
    // Múltiple: suma de las opciones elegidas. Única: la opción.
    return q.type === "MULTIPLE_CHOICE" ? values.reduce((s, v) => s + v, 0) : values[0];
  }
  if (NUMERIC_TYPES.includes(q.type)) {
    return typeof a.valueNumber === "number" && Number.isFinite(a.valueNumber)
      ? a.valueNumber
      : null;
  }
  return null;
}

function bounds(q: ScoringQuestion): [number, number] | null {
  if (q.type === "PERCENTAGE") return [0, 100];
  if (OPTION_TYPES.includes(q.type) && q.type !== "MULTIPLE_CHOICE") {
    if (q.options.length === 0) return null;
    const vals = q.options.map((o) => o.value);
    return [Math.min(...vals), Math.max(...vals)];
  }
  if (q.min != null && q.max != null) return [q.min, q.max];
  return null;
}

/** Valor que suma al puntaje: invierte si corresponde (min + max − v). */
export function scoredValue(q: ScoringQuestion, a: ScoringAnswer | undefined): number | null {
  const v = rawValue(q, a);
  if (v === null) return null;
  if (!q.reverse) return v;
  const b = bounds(q);
  return b ? b[0] + b[1] - v : v;
}

export function isCritical(q: ScoringQuestion, a: ScoringAnswer | undefined) {
  if (!q.criticalOperator || q.criticalValue === null) return false;
  // El ítem crítico se evalúa sobre lo que respondió la persona, no sobre el valor invertido.
  const v = rawValue(q, a);
  if (v === null) return false;
  const t = q.criticalValue;
  switch (q.criticalOperator) {
    case "GTE":
      return v >= t;
    case "GT":
      return v > t;
    case "EQ":
      return v === t;
    case "LTE":
      return v <= t;
    case "LT":
      return v < t;
  }
}

function aggregate(
  items: { value: number; weight: number }[],
  method: ScoringMethod,
): number | null {
  if (items.length === 0) return null;
  const sum = items.reduce(
    (s, i) => s + (method === "WEIGHTED_SUM" ? i.value * i.weight : i.value),
    0,
  );
  return method === "AVERAGE" ? round(sum / items.length) : round(sum);
}

const round = (n: number) => Math.round(n * 100) / 100;

export function findRange(
  ranges: ScoringRange[],
  subscaleKey: string | null,
  score: number | null,
) {
  if (score === null) return null;
  return (
    ranges.find((r) => r.subscaleKey === subscaleKey && score >= r.min && score <= r.max) ?? null
  );
}

export function scoreAssessment(input: ScoringInput): ScoreResult {
  const scorable = input.questions.filter((q) => q.scored && isScorableType(q.type));
  const values = new Map<string, number>();
  for (const q of scorable) {
    const v = scoredValue(q, input.answers[q.key]);
    if (v !== null) values.set(q.key, v);
  }
  const itemsOf = (qs: ScoringQuestion[]) =>
    qs
      .filter((q) => values.has(q.key))
      .map((q) => ({ value: values.get(q.key)!, weight: q.weight }));

  const total = aggregate(itemsOf(scorable), input.method);
  const subscales = input.subscales.map((s) => {
    const qs = scorable.filter((q) => q.subscaleKey === s.key);
    const items = itemsOf(qs);
    const score = aggregate(items, s.method);
    return {
      key: s.key,
      name: s.name,
      score,
      answered: items.length,
      range: findRange(input.ranges, s.key, score),
    };
  });

  return {
    total,
    answered: values.size,
    scoredCount: scorable.length,
    totalRange: findRange(input.ranges, null, total),
    subscales,
    criticalKeys: input.questions
      .filter((q) => isCritical(q, input.answers[q.key]))
      .map((q) => q.key),
  };
}
