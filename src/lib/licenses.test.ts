import { describe, expect, it } from "vitest";
import { jurisdictionName, normalizeLicense } from "./licenses";

describe("matrículas", () => {
  it("deja solo los dígitos, sin ceros adelante", () => {
    expect(normalizeLicense("M.P. 1.234")).toBe("1234");
    expect(normalizeLicense("mn 001234")).toBe("1234");
    expect(normalizeLicense("0")).toBe("0");
  });

  it("nombra la jurisdicción", () => {
    expect(jurisdictionName("ER")).toBe("Entre Ríos");
    expect(jurisdictionName("XX")).toBeNull();
  });
});
