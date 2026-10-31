import { describe, expect, it } from "vitest";
import { scoreAssessment, scoredValue, type ScoringInput, type ScoringQuestion } from "./index";

const likert = (key: string, extra: Partial<ScoringQuestion> = {}): ScoringQuestion => ({
  key,
  type: "LIKERT",
  scored: true,
  reverse: false,
  weight: 1,
  subscaleKey: null,
  criticalOperator: null,
  criticalValue: null,
  options: [0, 1, 2, 3].map((v) => ({ key: `${key}-o${v}`, value: v })),
  ...extra,
});

const pick = (key: string, v: number) => ({ optionKeys: [`${key}-o${v}`] });

function base(questions: ScoringQuestion[], answers: ScoringInput["answers"]): ScoringInput {
  return { method: "SUM", questions, subscales: [], ranges: [], answers };
}

describe("motor de puntajes", () => {
  it("suma ítems Likert", () => {
    const qs = [likert("a"), likert("b"), likert("c")];
    const r = scoreAssessment(base(qs, { a: pick("a", 1), b: pick("b", 2), c: pick("c", 3) }));
    expect(r.total).toBe(6);
    expect(r.answered).toBe(3);
  });

  it("promedia sobre lo respondido", () => {
    const qs = [likert("a"), likert("b"), likert("c")];
    const r = scoreAssessment({
      ...base(qs, { a: pick("a", 1), b: pick("b", 2) }),
      method: "AVERAGE",
    });
    expect(r.total).toBe(1.5);
    expect(r.answered).toBe(2);
    expect(r.scoredCount).toBe(3);
  });

  it("aplica pesos en la suma ponderada", () => {
    const qs = [likert("a", { weight: 2 }), likert("b", { weight: 0.5 })];
    const r = scoreAssessment({
      ...base(qs, { a: pick("a", 3), b: pick("b", 2) }),
      method: "WEIGHTED_SUM",
    });
    expect(r.total).toBe(7);
  });

  it("invierte ítems (min + max − v)", () => {
    const q = likert("a", { reverse: true });
    expect(scoredValue(q, pick("a", 0))).toBe(3);
    expect(scoredValue(q, pick("a", 3))).toBe(0);
    const slider: ScoringQuestion = {
      ...likert("s"),
      type: "SLIDER",
      options: [],
      min: 1,
      max: 10,
      reverse: true,
    };
    expect(scoredValue(slider, { valueNumber: 2 })).toBe(9);
    const pct: ScoringQuestion = { ...likert("p"), type: "PERCENTAGE", options: [], reverse: true };
    expect(scoredValue(pct, { valueNumber: 30 })).toBe(70);
  });

  it("ignora ítems que no suman y tipos de texto", () => {
    const qs: ScoringQuestion[] = [
      likert("a"),
      likert("b", { scored: false }),
      { ...likert("t"), type: "LONG_TEXT", options: [] },
    ];
    const r = scoreAssessment(base(qs, { a: pick("a", 2), b: pick("b", 3), t: {} }));
    expect(r.total).toBe(2);
    expect(r.scoredCount).toBe(1);
  });

  it("suma las opciones en elección múltiple", () => {
    const q: ScoringQuestion = { ...likert("m"), type: "MULTIPLE_CHOICE" };
    const r = scoreAssessment(base([q], { m: { optionKeys: ["m-o1", "m-o3"] } }));
    expect(r.total).toBe(4);
  });

  it("sin respuestas el total es null", () => {
    const r = scoreAssessment(base([likert("a")], {}));
    expect(r.total).toBeNull();
    expect(r.totalRange).toBeNull();
  });

  it("calcula subescalas con su propio método", () => {
    const qs = [
      likert("a", { subscaleKey: "s1" }),
      likert("b", { subscaleKey: "s1" }),
      likert("c", { subscaleKey: "s2" }),
    ];
    const r = scoreAssessment({
      ...base(qs, { a: pick("a", 1), b: pick("b", 3), c: pick("c", 2) }),
      subscales: [
        { key: "s1", name: "Uno", method: "AVERAGE" },
        { key: "s2", name: "Dos", method: "SUM" },
      ],
      ranges: [{ subscaleKey: "s1", min: 0, max: 2, label: "Bajo", color: "#0f0" }],
    });
    expect(r.total).toBe(6);
    expect(r.subscales[0]).toMatchObject({ score: 2, range: { label: "Bajo" } });
    expect(r.subscales[1]).toMatchObject({ score: 2, range: null });
  });

  it("encuentra el rango del total (límites inclusivos)", () => {
    const qs = [likert("a"), likert("b")];
    const ranges = [
      { subscaleKey: null, min: 0, max: 2, label: "Mínimo", color: "#a" },
      { subscaleKey: null, min: 3, max: 6, label: "Alto", color: "#b" },
    ];
    const r = scoreAssessment({ ...base(qs, { a: pick("a", 1), b: pick("b", 2) }), ranges });
    expect(r.totalRange?.label).toBe("Alto");
  });

  it("detecta ítems críticos sobre el valor respondido, aunque el ítem esté invertido", () => {
    const qs = [
      likert("a", { criticalOperator: "GTE", criticalValue: 1 }),
      likert("b", { criticalOperator: "GTE", criticalValue: 1, reverse: true, scored: false }),
      likert("c", { criticalOperator: "EQ", criticalValue: 3 }),
    ];
    const r = scoreAssessment(base(qs, { a: pick("a", 1), b: pick("b", 0), c: pick("c", 2) }));
    expect(r.criticalKeys).toEqual(["a"]);
  });
});
