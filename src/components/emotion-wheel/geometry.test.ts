import { describe, expect, it } from "vitest";
import { fitLabel, labelRotation, layoutAround, polar } from "./geometry";

describe("geometría de la rueda", () => {
  it("polar: 0° es arriba y 90° es a la derecha", () => {
    const [x0, y0] = polar(10, 0);
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(-10);
    const [x1, y1] = polar(10, 90);
    expect(x1).toBeCloseTo(10);
    expect(y1).toBeCloseTo(0);
  });

  it("layoutAround centra los segmentos", () => {
    const segs = layoutAround(4, 50, 30);
    expect(segs[0].a0).toBe(-70);
    expect(segs[3].a1).toBe(130);
    expect((segs[1].a1 + segs[2].a0) / 2).toBe(30);
  });

  it("el texto nunca queda cabeza abajo", () => {
    expect(labelRotation(30)).toBe(30);
    expect(labelRotation(180)).toBe(360);
    expect(labelRotation(-30)).toBe(330);
  });

  it("fitLabel parte en dos líneas parejas si no entra", () => {
    expect(fitLabel("Miedo", 100, 13).lines).toEqual(["Miedo"]);
    const r = fitLabel("Lleno de odio", 50, 13);
    expect(r.lines).toHaveLength(2);
    expect(r.size).toBeGreaterThanOrEqual(9);
  });
});
