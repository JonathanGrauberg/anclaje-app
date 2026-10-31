import { describe, expect, it } from "vitest";
import { digestEmail, summarizeDigest } from "./digest";

const row = {
  pendingFeedback: 0,
  overdueTasks: 0,
  unreviewedAssessments: 0,
  criticalAssessmentAt: null,
  highIntensityAt: null,
};

describe("summarizeDigest", () => {
  it("suma y arma líneas solo con lo que hay", () => {
    const s = summarizeDigest([
      { ...row, pendingFeedback: 2, criticalAssessmentAt: new Date() },
      { ...row, unreviewedAssessments: 1 },
      row,
    ]);
    expect(s.counts.patients).toBe(2);
    expect(s.lines).toEqual([
      "• 1 paciente con un ítem crítico en una evaluación",
      "• 2 entradas piden una devolución",
      "• 1 evaluación sin revisar",
    ]);
  });
  it("vacío si no hay nada pendiente", () => {
    expect(summarizeDigest([row]).empty).toBe(true);
  });
  it("el email no incluye nombres de pacientes", () => {
    const { text } = digestEmail("Lic. Méndez", ["• 1 evaluación sin revisar"], "http://x/pro");
    expect(text).toContain("no incluye nombres");
  });
});
