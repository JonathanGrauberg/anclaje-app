import { describe, expect, it } from "vitest";
import { accessMessage } from "./admin-messages";

const base = {
  name: "Carolina Pérez",
  email: "caro@example.com",
  password: "abc-123",
  origin: "https://anclaje.webistudio.net",
};

describe("mensaje de acceso para WhatsApp", () => {
  it("alta: saluda por el nombre, pasa usuario y contraseña y pide cambiarla", () => {
    const m = accessMessage({ ...base, kind: "alta", now: new Date("2026-11-07T15:00:00Z") });
    expect(m).toMatch(/^¡Hola, Carolina!/);
    expect(m).toContain("Usuario: caro@example.com");
    expect(m).toContain("Contraseña: abc-123");
    expect(m).toContain("https://anclaje.webistudio.net/ingresar");
    expect(m).toContain("solo para esta vez");
    expect(m).toContain("gratis para siempre por sumarte antes del 30 de noviembre");
  });
  it("alta después de la promo: no promete gratis", () => {
    const m = accessMessage({ ...base, kind: "alta", now: new Date("2026-12-05T15:00:00Z") });
    expect(m).not.toContain("gratis");
  });
  it("contraseña nueva: avisa que la anterior ya no sirve", () => {
    const m = accessMessage({ ...base, kind: "nueva" });
    expect(m).toContain("La anterior ya no funciona");
    expect(m).toContain("Contraseña: abc-123");
    expect(m).not.toContain("Sofía");
  });
});
