import { describe, expect, it } from "vitest";
import { scoreAssessment } from "@/lib/scoring";
import { assessmentDocSchema } from "@/lib/validation/assessment";
import {
  emptyDoc,
  newLikertBlock,
  newQuestion,
  publishProblems,
  rekey,
  toScoringInput,
  toScreens,
} from "./doc";

describe("documento de evaluación", () => {
  it("un documento nuevo valida con el schema pero no se puede publicar", () => {
    const doc = emptyDoc("Prueba");
    expect(assessmentDocSchema.safeParse(doc).success).toBe(true);
    expect(publishProblems(doc)).toContain("Agregá al menos una pregunta.");
  });

  it("pide texto y opciones antes de publicar", () => {
    const q = newQuestion("SINGLE_CHOICE");
    const doc = { ...emptyDoc("X"), questions: [{ ...q, options: q.options.slice(0, 1) }] };
    const problems = publishProblems(doc);
    expect(problems.some((p) => p.includes("falta el texto"))).toBe(true);
    expect(problems.some((p) => p.includes("dos opciones"))).toBe(true);
  });

  it("agrupa un bloque Likert en una sola pantalla", () => {
    const block = newLikertBlock(3);
    const doc = {
      ...emptyDoc("X"),
      questions: [newQuestion("INFO"), ...block, newQuestion("LONG_TEXT")],
    };
    expect(toScreens(doc.questions).map((s) => s.length)).toEqual([1, 3, 1]);
  });

  it("rekey cambia todas las claves y mantiene las referencias", () => {
    const q = { ...newQuestion("LIKERT"), text: "Hola", subscaleKey: "sub1" };
    const doc = {
      ...emptyDoc("X"),
      subscales: [{ key: "sub1", name: "S", method: "SUM" as const }],
      ranges: [
        { subscaleKey: "sub1", min: 0, max: 3, label: "Bajo", color: "#aabbcc", text: null },
      ],
      questions: [q],
    };
    const r = rekey(doc);
    expect(r.questions[0].key).not.toBe(q.key);
    expect(r.subscales[0].key).not.toBe("sub1");
    expect(r.questions[0].subscaleKey).toBe(r.subscales[0].key);
    expect(r.ranges[0].subscaleKey).toBe(r.subscales[0].key);
    expect(assessmentDocSchema.safeParse(r).success).toBe(true);
  });

  it("puntúa un documento con sus claves", () => {
    const q = { ...newQuestion("LIKERT"), text: "Ítem" };
    const doc = { ...emptyDoc("X"), questions: [q] };
    const res = scoreAssessment(
      toScoringInput(doc, { [q.key]: { optionKeys: [q.options[2].key] } }),
    );
    expect(res.total).toBe(2);
  });
});
