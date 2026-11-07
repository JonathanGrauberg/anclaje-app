import { describe, expect, it } from "vitest";
import { formatFreeUntil, formatPesos, freeDaysLeft, planDiscount } from "./launch";

describe("planes", () => {
  it("formatea pesos con punto de miles", () => {
    expect(formatPesos(20000)).toBe("$20.000");
    expect(formatPesos(180000)).toBe("$180.000");
  });
  it("calcula el descuento frente al mensual", () => {
    expect(planDiscount(18000)).toBe(10);
    expect(planDiscount(15000)).toBe(25);
  });
});

describe("contador del lanzamiento", () => {
  it("cuenta los días que quedan, incluido hoy, en hora de Buenos Aires", () => {
    expect(freeDaysLeft(new Date("2026-11-06T15:00:00Z"), "2026-11-30")).toBe(25);
    expect(freeDaysLeft(new Date("2026-11-30T20:00:00Z"), "2026-11-30")).toBe(1);
    // 1 de diciembre 01:00 UTC todavía es 30 de noviembre en Buenos Aires
    expect(freeDaysLeft(new Date("2026-12-01T01:00:00Z"), "2026-11-30")).toBe(1);
    expect(freeDaysLeft(new Date("2026-12-01T12:00:00Z"), "2026-11-30")).toBe(0);
  });
  it("nombra la fecha", () => {
    expect(formatFreeUntil("2026-11-30")).toBe("30 de noviembre");
  });
});
