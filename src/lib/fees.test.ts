import { describe, expect, it } from "vitest";
import {
  changePct,
  formatMoney,
  formatMonth,
  monthKey,
  monthStart,
  parseAmount,
  priceFor,
  shiftMonthKey,
} from "./fees";

describe("parseAmount", () => {
  it("entiende cómo escribe la gente un monto", () => {
    expect(parseAmount("40000")).toBe(40_000);
    expect(parseAmount("40.000")).toBe(40_000);
    expect(parseAmount("$ 40.000")).toBe(40_000);
    expect(parseAmount("40.000,50")).toBe(40_000);
    expect(parseAmount("40k")).toBe(40_000);
    expect(parseAmount("40 mil")).toBe(40_000);
    expect(parseAmount("2,5k")).toBe(2_500);
    expect(parseAmount("1.250.000")).toBe(1_250_000);
  });
  it("devuelve null si no hay número", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("meses", () => {
  it("usa la hora de Buenos Aires", () => {
    // 1 de diciembre 01:00 UTC = 30 de noviembre 22:00 en Buenos Aires
    expect(monthKey(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
    expect(monthStart("2026-11").toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });
  it("corre meses entre años", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });
  it("nombra el mes", () => {
    expect(formatMonth("2026-11")).toBe("noviembre de 2026");
  });
});

describe("montos", () => {
  it("formatea en pesos sin centavos", () => {
    expect(formatMoney(40_000).replace(/\s/g, " ")).toBe("$ 40.000");
  });
  it("usa el precio especial del paciente si tiene", () => {
    const s = { id: "a", price: 40_000 };
    expect(priceFor(s, new Map())).toBe(40_000);
    expect(priceFor(s, new Map([["a", 30_000]]))).toBe(30_000);
  });
  it("compara contra el mes anterior", () => {
    expect(changePct(120, 100)).toBe(20);
    expect(changePct(100, 0)).toBeNull();
  });
});
