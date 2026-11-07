import { describe, expect, it } from "vitest";
import { formatFreeUntil, freeDaysLeft } from "./launch";

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
