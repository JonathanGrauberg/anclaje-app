// Recordatorios: lógica pura (sin DB) para decidir cuándo mandar y qué decir.
// Sin rachas, sin culpa, sin "hace 3 días que no registrás": siempre una invitación amable.

const TZ = "America/Argentina/Buenos_Aires";

/** Ventana después de la hora elegida en la que todavía tiene sentido avisar (si el cron se atrasó). */
export const REMINDER_WINDOW_MINUTES = 120;

export type ReminderConfig = {
  enabled: boolean;
  time: string; // HH:mm
  days: number[]; // 0 = domingo … 6 = sábado
  lastSentAt: Date | null;
};

function localParts(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
  };
}

export function parseTime(time: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** ¿Toca mandar el recordatorio ahora? Como mucho uno por día (hora de Buenos Aires). */
export function isReminderDue(cfg: ReminderConfig, now = new Date()) {
  if (!cfg.enabled || cfg.days.length === 0) return false;
  const target = parseTime(cfg.time);
  if (target === null) return false;
  const local = localParts(now);
  if (!cfg.days.includes(local.weekday)) return false;
  if (local.minutes < target || local.minutes >= target + REMINDER_WINDOW_MINUTES) return false;
  return !cfg.lastSentAt || localParts(cfg.lastSentAt).date !== local.date;
}

// Textos del recordatorio. No incluyen ningún dato del paciente: se ven en la pantalla bloqueada.
export const REMINDER_MESSAGES = [
  { title: "¿Cómo venís?", body: "Si tenés un minuto, podés contarle a la rueda cómo te sentís." },
  { title: "Un momento para vos", body: "¿Qué sentiste hoy? Sin apuro, cuando puedas." },
  { title: "Hola", body: "Si te sirve, podés registrar cómo estás. Y si no, también está bien." },
] as const;

export function reminderMessage(now = new Date()) {
  const { date } = localParts(now);
  const seed = Number(date.replaceAll("-", ""));
  return REMINDER_MESSAGES[seed % REMINDER_MESSAGES.length];
}

/** ¿Toca el resumen por email? Diario: una vez por día. Semanal: los lunes. Desde las 8 (BA). */
export function isDigestDue(
  frequency: "DAILY" | "WEEKLY" | "NEVER",
  lastDigestAt: Date | null,
  now = new Date(),
) {
  if (frequency === "NEVER") return false;
  const local = localParts(now);
  if (local.minutes < 8 * 60) return false;
  if (frequency === "WEEKLY" && local.weekday !== 1) return false;
  return !lastDigestAt || localParts(lastDigestAt).date !== local.date;
}
