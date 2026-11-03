import { describe, expect, it } from "vitest";
import {
  appointmentCancelledMessage,
  appointmentReminderMessage,
  extractPhone,
  invitationMessage,
  normalizeWhatsappNumber,
  whatsappMessageHref,
} from "./whatsapp";

describe("número de WhatsApp", () => {
  it.each([
    ["343 15 456-7890", "5493434567890"],
    ["0343 456 7890", "5493434567890"],
    ["(0343) 15-4567890", "5493434567890"],
    ["11 15 5555 0000", "5491155550000"],
    ["+54 9 11 5555-0000", "5491155550000"],
    ["+54 11 5555 0000", "5491155550000"],
    ["2944 15 123456", "5492944123456"],
    ["+598 99 123 456", "59899123456"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeWhatsappNumber(raw)).toBe(expected);
  });

  it("no adivina números incompletos", () => {
    expect(normalizeWhatsappNumber("456-7890")).toBeNull();
    expect(normalizeWhatsappNumber("12345")).toBeNull();
  });

  it("lo encuentra en un contacto con mail", () => {
    expect(extractPhone("ana@mail.com · 343 15 456-7890")).toBe("5493434567890");
    expect(extractPhone("ana@mail.com")).toBeNull();
    expect(extractPhone(null)).toBeNull();
  });

  it("sin número deja elegir el chat", () => {
    expect(whatsappMessageHref(null, "hola y chau")).toBe("https://wa.me/?text=hola%20y%20chau");
    expect(whatsappMessageHref("5493434567890", "a")).toBe("https://wa.me/5493434567890?text=a");
  });
});

describe("mensajes", () => {
  const now = new Date("2026-11-04T15:00:00-03:00");
  const base = {
    patientName: "Sofía Pérez",
    professionalName: "Lic. Eliana Sánchez",
    startsAt: new Date("2026-11-05T18:00:00-03:00"),
    modality: "IN_PERSON" as const,
    place: "Urquiza 123",
    now,
  };

  it("recordatorio de mañana", () => {
    const m = appointmentReminderMessage(base);
    expect(m).toContain("Hola, Sofía.");
    expect(m).toContain("turno de mañana jueves 5 de noviembre a las 18:00");
    expect(m).toContain("En Urquiza 123.");
    expect(m).toContain("Lic. Eliana Sánchez");
  });

  it("recordatorio del mismo día, online", () => {
    const m = appointmentReminderMessage({
      ...base,
      startsAt: new Date("2026-11-04T19:30:00-03:00"),
      modality: "ONLINE",
      place: "https://meet.test/x",
    });
    expect(m).toContain("turno de hoy a las 19:30");
    expect(m).toContain("videollamada: https://meet.test/x");
  });

  it("cancelación e invitación", () => {
    expect(appointmentCancelledMessage(base)).toContain("queda cancelado");
    const inv = invitationMessage({
      professionalName: "Eliana",
      link: "https://a.test/vincular/ABC",
    });
    expect(inv).toContain("¡Hola!");
    expect(inv).toContain("https://a.test/vincular/ABC");
  });
});
