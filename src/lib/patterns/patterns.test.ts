import { describe, expect, it } from "vitest";
import type { EmotionTreeNode } from "@/components/emotion-wheel/types";
import { buildEmotionIndex } from "@/lib/emotions/tree";
import { computePatterns, scoreSeries } from "./index";

const node = (id: string, label: string, level: number, children: EmotionTreeNode[] = []) =>
  ({ id, parentId: null, level, label, color: "#aabbcc", children }) as EmotionTreeNode;

const tree = [
  node("miedo", "Miedo", 1, [node("ansioso", "Ansioso", 2)]),
  node("alegria", "Alegría", 1, [node("contento", "Contento", 2)]),
];
const index = buildEmotionIndex(tree);
// 2026-10-31 15:00 en Buenos Aires (UTC-3)
const now = new Date("2026-10-31T18:00:00Z");

describe("computePatterns", () => {
  const entries = [
    // viernes 30/10 a las 23:30 en BA (ya es sábado en UTC): tiene que contar como viernes a la noche
    { occurredAt: new Date("2026-10-31T02:30:00Z"), items: [{ nodeId: "ansioso", intensity: 8 }] },
    {
      occurredAt: new Date("2026-10-31T12:00:00Z"), // sábado 9:00
      items: [
        { nodeId: "ansioso", intensity: 4 },
        { nodeId: "contento", intensity: 6 },
      ],
    },
  ];
  const p = computePatterns(entries, index, 7, now);

  it("cuenta por familia y por emoción, ordenado", () => {
    expect(p.families).toEqual([
      { id: "miedo", label: "Miedo", color: "#aabbcc", count: 2 },
      { id: "alegria", label: "Alegría", color: "#aabbcc", count: 1 },
    ]);
    expect(p.specific[0]).toMatchObject({ id: "ansioso", count: 2 });
  });

  it("usa la hora de Buenos Aires para día, franja y día de la semana", () => {
    expect(p.daily.at(-1)).toMatchObject({ date: "2026-10-31", avg: 5, count: 1 });
    expect(p.daily.at(-2)).toMatchObject({ date: "2026-10-30", avg: 8, count: 1 });
    expect(p.byTimeOfDay.find((b) => b.label === "Noche")?.count).toBe(1);
    expect(p.byTimeOfDay.find((b) => b.label === "Mañana")?.count).toBe(1);
    expect(p.byWeekday.find((b) => b.label === "Vie")?.count).toBe(1);
    expect(p.byWeekday.find((b) => b.label === "Sáb")?.count).toBe(1);
  });

  it("agrupa por semana en períodos largos", () => {
    const w = computePatterns(entries, index, 90, now);
    expect(w.weekly).toBe(true);
    expect(w.daily).toHaveLength(13);
    expect(w.daily.at(-1)).toMatchObject({ avg: 6, count: 2 });
  });

  it("deja huecos en los días sin registros", () => {
    expect(p.daily).toHaveLength(7);
    expect(p.daily[0]).toMatchObject({ avg: null, count: 0 });
  });
});

describe("scoreSeries", () => {
  it("agrupa por evaluación y ordena por fecha, salteando puntajes nulos", () => {
    const s = scoreSeries([
      {
        completedAt: new Date("2026-10-20T15:00:00Z"),
        totalScore: 12,
        interpretation: "Moderado",
        assessmentId: "a",
        title: "A",
      },
      {
        completedAt: new Date("2026-10-06T15:00:00Z"),
        totalScore: 15,
        interpretation: null,
        assessmentId: "a",
        title: "A",
      },
      {
        completedAt: new Date("2026-10-10T15:00:00Z"),
        totalScore: null,
        interpretation: null,
        assessmentId: "b",
        title: "B",
      },
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].points.map((p) => p.score)).toEqual([15, 12]);
  });
});
