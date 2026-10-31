import { describe, expect, it } from "vitest";
import json from "../../../prisma/data/emotions.json";
import { buildEmotionRows, lighten, slugify } from "./build";

describe("rueda de emociones", () => {
  const rows = buildEmotionRows(json);

  it("tiene 6 familias, 36 secundarias y 72 terciarias", () => {
    expect(rows.filter((r) => r.level === 1)).toHaveLength(6);
    expect(rows.filter((r) => r.level === 2)).toHaveLength(36);
    expect(rows.filter((r) => r.level === 3)).toHaveLength(72);
  });

  it("genera ids únicos y estables", () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("miedo.ansioso.preocupado");
    expect(ids).toContain("ira.lleno-de-odio.resentido");
    expect(ids).toContain("asco.horrible.asco");
  });

  it("cada nodo apunta a un padre existente", () => {
    const ids = new Set(rows.map((r) => r.id));
    for (const r of rows) if (r.parentId) expect(ids.has(r.parentId)).toBe(true);
  });

  it("slugify y lighten", () => {
    expect(slugify("Íntimo")).toBe("intimo");
    expect(slugify("Lleno de odio")).toBe("lleno-de-odio");
    expect(lighten("#000000", 0.5)).toBe("#808080");
    expect(lighten("#FFFFFF", 0.3)).toBe("#FFFFFF");
  });
});
