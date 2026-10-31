import { describe, expect, it } from "vitest";
import { isDigestDue, isReminderDue, parseTime, reminderMessage } from "./reminders";

// Sábado 31/10/2026, 20:15 en Buenos Aires (UTC-3)
const now = new Date("2026-10-31T23:15:00Z");
const base = { enabled: true, time: "20:00", days: [6], lastSentAt: null };

describe("isReminderDue", () => {
  it("manda dentro de la ventana, el día elegido", () => {
    expect(isReminderDue(base, now)).toBe(true);
  });
  it("no manda si está apagado, otro día, antes de hora o fuera de la ventana", () => {
    expect(isReminderDue({ ...base, enabled: false }, now)).toBe(false);
    expect(isReminderDue({ ...base, days: [1, 2] }, now)).toBe(false);
    expect(isReminderDue({ ...base, time: "21:00" }, now)).toBe(false);
    expect(isReminderDue({ ...base, time: "17:00" }, now)).toBe(false);
  });
  it("manda como mucho una vez por día (en hora de Buenos Aires)", () => {
    expect(isReminderDue({ ...base, lastSentAt: new Date("2026-10-31T23:01:00Z") }, now)).toBe(
      false,
    );
    // 30/10 a las 22:00 BA = 31/10 01:00 UTC: es otro día local, así que sí manda
    expect(isReminderDue({ ...base, lastSentAt: new Date("2026-10-31T01:00:00Z") }, now)).toBe(
      true,
    );
  });
  it("usa el día de la semana local, no el de UTC", () => {
    // Sábado 22:30 BA = domingo 01:30 UTC
    const late = new Date("2026-11-01T01:30:00Z");
    expect(isReminderDue({ ...base, time: "22:00", days: [6] }, late)).toBe(true);
    expect(isReminderDue({ ...base, time: "22:00", days: [0] }, late)).toBe(false);
  });
});

describe("helpers", () => {
  it("parseTime valida HH:mm", () => {
    expect(parseTime("08:30")).toBe(510);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("8:30")).toBeNull();
  });
  it("el mensaje es estable en el día", () => {
    expect(reminderMessage(now)).toEqual(reminderMessage(new Date("2026-10-31T12:00:00Z")));
  });
});

describe("isDigestDue", () => {
  const monday = new Date("2026-11-02T12:00:00Z"); // lunes 9:00 BA
  it("diario: una vez por día desde las 8", () => {
    expect(isDigestDue("DAILY", null, monday)).toBe(true);
    expect(isDigestDue("DAILY", new Date("2026-11-02T11:30:00Z"), monday)).toBe(false);
    expect(isDigestDue("DAILY", null, new Date("2026-11-02T10:00:00Z"))).toBe(false); // 7:00 BA
  });
  it("semanal: solo los lunes", () => {
    expect(isDigestDue("WEEKLY", null, monday)).toBe(true);
    expect(isDigestDue("WEEKLY", null, now)).toBe(false);
    expect(isDigestDue("NEVER", null, monday)).toBe(false);
  });
});
