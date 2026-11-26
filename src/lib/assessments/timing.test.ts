import { describe, expect, it } from "vitest";
import { formatDuration, median, timingSummary } from "./timing";

const a = (questionId: string, seconds: number, changes = 0) => ({ questionId, seconds, changes });

describe("tiempos de evaluación", () => {
  it("mediana", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("marca las preguntas lentas y las que cambió varias veces", () => {
    const s = timingSummary([a("q1", 5), a("q2", 6), a("q3", 4, 2), a("q4", 7), a("q5", 90, 1)]);
    expect(s.activeSeconds).toBe(112);
    expect(s.medianSeconds).toBe(6);
    expect([...s.slow]).toEqual(["q5"]);
    expect([...s.changed]).toEqual(["q3"]);
  });

  it("no marca lentas por debajo de 20 s ni con pocas preguntas", () => {
    expect(timingSummary([a("q1", 2), a("q2", 2), a("q3", 2), a("q4", 15)]).slow.size).toBe(0);
    expect(timingSummary([a("q1", 2), a("q2", 200)]).slow.size).toBe(0);
  });

  it("sin datos de tiempo (respuestas viejas)", () => {
    const s = timingSummary([a("q1", 0), a("q2", 0)]);
    expect(s.activeSeconds).toBeNull();
    expect(s.slow.size).toBe(0);
  });

  it("formatea duraciones", () => {
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(130)).toBe("2 min");
    expect(formatDuration(3900)).toBe("1 h 5 min");
    expect(formatDuration(7200)).toBe("2 h");
  });
});
