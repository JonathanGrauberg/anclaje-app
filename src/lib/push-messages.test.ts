import { describe, expect, it } from "vitest";
import { pushMessages } from "./push-messages";

// Se ven con el celular bloqueado: nada de nombres ni palabras que delaten la terapia.
const all = (now: Date) => {
  const d = new Date("2026-11-05T18:00:00-03:00");
  return [
    pushMessages.appointmentTomorrow(d),
    pushMessages.appointmentSoon(d),
    pushMessages.appointmentCreated(d, 1, now),
    pushMessages.appointmentCreated(d, 4, now),
    pushMessages.appointmentChanged(d, now),
    pushMessages.appointmentCancelled(d, 1, now),
    pushMessages.feedback(),
    pushMessages.task(),
    pushMessages.resource(),
    pushMessages.assessment(),
    pushMessages.patientCancelled(d, "2026-11-05", now),
    pushMessages.patientLinked(),
    pushMessages.test(false),
    pushMessages.accountChanged("profile", "/app/ajustes#contrasena"),
    pushMessages.accountChanged("password", "/recuperar"),
  ];
};

describe("avisos al celular", () => {
  const now = new Date("2026-11-04T10:00:00-03:00");

  it("dicen cuándo es el turno", () => {
    expect(pushMessages.appointmentTomorrow(new Date("2026-11-05T18:00:00-03:00")).body).toBe(
      "Mañana a las 18:00 tenés turno.",
    );
    expect(
      pushMessages.appointmentCreated(new Date("2026-11-05T18:00:00-03:00"), 1, now).body,
    ).toBe("Tenés un turno nuevo: mañana, 18:00.");
    expect(
      pushMessages.patientCancelled(new Date("2026-11-04T18:00:00-03:00"), "2026-11-04", now),
    ).toMatchObject({
      body: "Avisó que no va al turno de hoy, 18:00.",
      url: "/pro/agenda?dia=2026-11-04",
    });
  });

  it("nunca dicen terapia, psicóloga ni sesión, y siempre llevan a una pantalla interna", () => {
    for (const m of all(now)) {
      expect(`${m.title} ${m.body}`.toLowerCase()).not.toMatch(/terapia|psic[oó]log|sesi[oó]n/);
      expect(m.url.startsWith("/")).toBe(true);
    }
  });
});
