import { describe, expect, it } from "vitest";
import { matchDuplicates, normalizeName } from "./duplicate-patients";

const app = [
  { id: "a1", name: "Jonathan Pérez", email: "jona@mail.com" },
  { id: "a2", name: "Ana", email: "ana@mail.com" },
];

describe("matchDuplicates", () => {
  it("une por el email del contacto, aunque el nombre sea otro", () => {
    const r = matchDuplicates(
      [{ id: "m1", name: "Jona", contact: "343 400 · Jona@Mail.com" }],
      app,
    );
    expect(r.get("m1")?.id).toBe("a1");
  });

  it("une por nombre completo sin importar tildes ni mayúsculas", () => {
    const r = matchDuplicates([{ id: "m1", name: " jonathan  perez ", contact: null }], app);
    expect(r.get("m1")?.id).toBe("a1");
  });

  it("no une por un solo nombre de pila", () => {
    const r = matchDuplicates([{ id: "m1", name: "Ana", contact: "343 400" }], app);
    expect(r.size).toBe(0);
  });

  it("no une si no coincide nada", () => {
    const r = matchDuplicates([{ id: "m1", name: "Laura Gómez", contact: "laura@mail.com" }], app);
    expect(r.size).toBe(0);
  });
});

describe("normalizeName", () => {
  it("saca tildes, mayúsculas y espacios de más", () => {
    expect(normalizeName("  María  José ÁLVAREZ ")).toBe("maria jose alvarez");
  });
});
