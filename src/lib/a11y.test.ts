import { describe, expect, it } from "vitest";
import { a11yAttributes, DEFAULT_A11Y, parseA11y } from "./a11y";

describe("preferencias de accesibilidad", () => {
  it("sin nada guardado, todo como siempre (ningún atributo)", () => {
    expect(parseA11y(null)).toEqual(DEFAULT_A11Y);
    expect(Object.values(a11yAttributes(DEFAULT_A11Y)).every((v) => v === null)).toBe(true);
  });

  it("ignora valores raros o JSON roto", () => {
    expect(parseA11y("{roto")).toEqual(DEFAULT_A11Y);
    expect(parseA11y(JSON.stringify({ text: "gigante", contrast: "sí" }))).toEqual(DEFAULT_A11Y);
  });

  it("traduce cada opción a su atributo", () => {
    const p = parseA11y(
      JSON.stringify({
        text: "xl",
        contrast: true,
        reduceMotion: true,
        readableFont: true,
        underlineLinks: true,
      }),
    );
    expect(a11yAttributes(p)).toEqual({
      "data-text": "xl",
      "data-contrast": "high",
      "data-motion": "reduce",
      "data-font": "readable",
      "data-links": "underline",
    });
  });
});
