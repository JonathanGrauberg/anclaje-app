import { describe, expect, it } from "vitest";
import {
  accountToProfessionalEmail,
  appointmentReminderEmail,
  extractEmail,
  patientLinkedEmail,
  welcomeProfessionalEmail,
} from "./emails";

const base = {
  patientName: "Sofía Pérez",
  professionalName: "Lic. Eliana Sánchez",
  // jueves 5 de noviembre de 2026, 18:00 en Buenos Aires
  startsAt: new Date("2026-11-05T21:00:00Z"),
  durationMin: 50,
  modality: "IN_PERSON" as const,
  place: "Urquiza 123",
  appUrl: "https://anclaje.test/app/turnos",
};

describe("recordatorio de turno", () => {
  it("dice cuándo, con quién y dónde", () => {
    const e = appointmentReminderEmail(base);
    expect(e.subject).toBe("Recordatorio: tu turno de mañana a las 18:00");
    expect(e.text).toContain("Hola, Sofía.");
    expect(e.text).toContain("jueves, 5 de noviembre a las 18:00");
    expect(e.text).toContain("Lic. Eliana Sánchez");
    expect(e.text).toContain("en Urquiza 123");
    expect(e.text).toContain("Ver mis turnos: https://anclaje.test/app/turnos");
  });

  it("sin la app no ofrece link y explica por qué le llega", () => {
    const e = appointmentReminderEmail({ ...base, appUrl: null, modality: "ONLINE", place: null });
    expect(e.text).not.toContain("Ver mis turnos");
    expect(e.text).toContain("el link te lo pasa tu profesional");
    expect(e.text).toContain("porque tu profesional te dio un turno");
  });

  it("escapa el HTML de los datos cargados", () => {
    const e = appointmentReminderEmail({ ...base, place: "<script>x</script>" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });
});

describe("mails a la profesional", () => {
  it("la bienvenida no incluye contraseñas", () => {
    const e = welcomeProfessionalEmail({
      name: "Lic. Eliana",
      loginUrl: "https://a.test/ingresar",
    });
    expect(e.text).toContain("Agregar paciente");
    expect(e.text.toLowerCase()).not.toMatch(/contraseña temporal:/);
  });

  it("el aviso de vinculación no nombra al paciente", () => {
    const e = patientLinkedEmail({
      professionalName: "Eliana",
      url: "https://a.test/pro",
      merged: true,
    });
    expect(e.text).toContain("historia clínica ya están en su cuenta");
    expect(e.text).toContain("no incluye nombres");
  });
});

describe("mail dentro del contacto", () => {
  it("lo encuentra entre otros datos", () => {
    expect(extractEmail("11 5555-0000 · Ana@Mail.com")).toBe("ana@mail.com");
    expect(extractEmail("solo teléfono 343 4000000")).toBeNull();
    expect(extractEmail(null)).toBeNull();
  });
});

describe("cuenta pasada a profesional", () => {
  it("saluda por el nombre y explica que carga la matrícula", () => {
    const m = accountToProfessionalEmail({
      name: "Patricia Gómez",
      loginUrl: "https://x/ingresar",
    });
    expect(m.subject).toContain("profesional");
    expect(m.text).toContain("Hola, Patricia.");
    expect(m.text).toContain("matrícula");
    expect(m.text).toContain("https://x/ingresar");
  });
});
