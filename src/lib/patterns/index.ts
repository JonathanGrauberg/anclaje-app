import type { EmotionIndex } from "@/lib/emotions/tree";

// Agregados puros para "Mis patrones" y la pestaña Patrones de la profesional.
// Todo en hora de Buenos Aires (la hora del registro es la que importa, no la del servidor).

const TZ = "America/Argentina/Buenos_Aires";
const DAY = 86_400_000;

export type PatternEntry = {
  occurredAt: Date;
  items: { nodeId: string; intensity: number }[];
};

export type CountRow = { id: string; label: string; color: string; count: number };
export type DailyRow = { date: string; label: string; avg: number | null; count: number };
export type BucketRow = { label: string; count: number };

export type Patterns = {
  total: number;
  families: CountRow[];
  specific: CountRow[];
  daily: DailyRow[];
  weekly: boolean;
  byTimeOfDay: BucketRow[];
  byWeekday: BucketRow[];
};

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const shortDay = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric", month: "short" });
const hourOf = (d: Date) =>
  Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d),
  ) % 24;
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayOf = (d: Date) =>
  WEEKDAY_EN.indexOf(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d),
  );

export const TIME_OF_DAY = [
  { label: "Madrugada", from: 0, to: 6 },
  { label: "Mañana", from: 6, to: 12 },
  { label: "Tarde", from: 12, to: 19 },
  { label: "Noche", from: 19, to: 24 },
] as const;
export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

function sortCounts(map: Map<string, CountRow>, limit: number) {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    .slice(0, limit);
}

/** Agrega registros de la rueda de los últimos `days` días (incluido hoy). */
export function computePatterns(
  entries: PatternEntry[],
  index: EmotionIndex,
  days: number,
  now = new Date(),
): Patterns {
  const families = new Map<string, CountRow>();
  const specific = new Map<string, CountRow>();
  const daily = new Map<string, { sum: number; n: number; count: number }>();
  const tod = TIME_OF_DAY.map(() => 0);
  const wd = WEEKDAYS.map(() => 0);

  for (const e of entries) {
    const key = dayKey(e.occurredAt);
    const d = daily.get(key) ?? { sum: 0, n: 0, count: 0 };
    d.count += 1;
    for (const it of e.items) {
      d.sum += it.intensity;
      d.n += 1;
      const info = index.get(it.nodeId);
      if (!info) continue;
      const fam = families.get(info.family.id) ?? { ...pick(info.family), count: 0 };
      fam.count += 1;
      families.set(info.family.id, fam);
      const sp = specific.get(info.node.id) ?? { ...pick(info.node), count: 0 };
      sp.count += 1;
      specific.set(info.node.id, sp);
    }
    daily.set(key, d);
    const h = hourOf(e.occurredAt);
    tod[TIME_OF_DAY.findIndex((b) => h >= b.from && h < b.to)] += 1;
    wd[weekdayOf(e.occurredAt)] += 1;
  }

  // Una fila por día del rango, con huecos (null) donde no hubo registros: no se inventan valores.
  // Para más de un mes se agrupa por semana (de a 7 días, terminando hoy) para que se lea la tendencia.
  const perDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * DAY);
    perDay.push({ date, key: dayKey(date), d: daily.get(dayKey(date)) });
  }
  const weekly = days > 31;
  const size = weekly ? 7 : 1;
  const dailyRows: DailyRow[] = [];
  for (let end = perDay.length; end > 0; end -= size) {
    const chunk = perDay.slice(Math.max(0, end - size), end);
    const sum = chunk.reduce((a, c) => a + (c.d?.sum ?? 0), 0);
    const n = chunk.reduce((a, c) => a + (c.d?.n ?? 0), 0);
    dailyRows.unshift({
      date: chunk[0].key,
      label: (weekly ? "sem. " : "") + shortDay.format(chunk[0].date),
      avg: n ? Math.round((sum / n) * 10) / 10 : null,
      count: chunk.reduce((a, c) => a + (c.d?.count ?? 0), 0),
    });
  }

  return {
    total: entries.length,
    families: sortCounts(families, 8),
    specific: sortCounts(specific, 8),
    daily: dailyRows,
    weekly,
    byTimeOfDay: TIME_OF_DAY.map((b, i) => ({ label: b.label, count: tod[i] })),
    byWeekday: WEEKDAYS.map((label, i) => ({ label, count: wd[i] })),
  };
}

function pick(n: { id: string; label: string; color: string }) {
  return { id: n.id, label: n.label, color: n.color };
}

export type ScorePoint = {
  date: string;
  label: string;
  score: number;
  interpretation: string | null;
};
export type ScoreSeries = { assessmentId: string; title: string; points: ScorePoint[] };

/** Agrupa respuestas completas por evaluación, en orden cronológico. */
export function scoreSeries(
  responses: {
    completedAt: Date;
    totalScore: number | null;
    interpretation: string | null;
    assessmentId: string;
    title: string;
  }[],
): ScoreSeries[] {
  const map = new Map<string, ScoreSeries>();
  for (const r of [...responses].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime(),
  )) {
    if (r.totalScore === null) continue;
    const s = map.get(r.assessmentId) ?? {
      assessmentId: r.assessmentId,
      title: r.title,
      points: [],
    };
    s.points.push({
      date: dayKey(r.completedAt),
      label: shortDay.format(r.completedAt),
      score: r.totalScore,
      interpretation: r.interpretation,
    });
    map.set(r.assessmentId, s);
  }
  return [...map.values()];
}
