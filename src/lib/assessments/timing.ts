// Tiempos de una evaluación: cuánto tardó en cada pregunta, cuántas veces cambió la respuesta y
// cuánto estuvo fuera de la app. Son datos para que la profesional los lea con criterio clínico,
// no un puntaje: una pregunta lenta puede ser duda, malestar o una distracción.

export type AnswerTiming = { questionId: string; seconds: number; changes: number };

export type TimingSummary = {
  /** Segundos con preguntas en pantalla (sin el tiempo afuera). null si no hay datos. */
  activeSeconds: number | null;
  medianSeconds: number | null;
  /** Preguntas que llevaron mucho más que la mediana. */
  slow: Set<string>;
  /** Preguntas en las que cambió la respuesta 2 veces o más. */
  changed: Set<string>;
};

/** Una pregunta es "lenta" si tardó al menos el triple de la mediana y como mínimo 20 s. */
export const SLOW_FACTOR = 3;
export const SLOW_MIN_SECONDS = 20;
export const CHANGED_MIN = 2;

export function median(values: number[]) {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function timingSummary(answers: AnswerTiming[]): TimingSummary {
  const timed = answers.filter((a) => a.seconds > 0);
  const med = median(timed.map((a) => a.seconds));
  const threshold = med === null ? Infinity : Math.max(med * SLOW_FACTOR, SLOW_MIN_SECONDS);
  return {
    activeSeconds: timed.length ? timed.reduce((s, a) => s + a.seconds, 0) : null,
    medianSeconds: med,
    // Con menos de 4 preguntas medidas, la mediana no dice nada.
    slow: new Set(
      timed.length >= 4 ? timed.filter((a) => a.seconds >= threshold).map((a) => a.questionId) : [],
    ),
    changed: new Set(answers.filter((a) => a.changes >= CHANGED_MIN).map((a) => a.questionId)),
  };
}

/** "45 s", "2 min", "1 h 5 min" */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** Segundos que se aceptan por guardado: más que esto es una pestaña olvidada abierta. */
export const MAX_SECONDS_PER_SAVE = 30 * 60;
