import { dayKey } from "@/lib/dates";

// Lanzamiento: hasta esta fecha (inclusive, hora de Buenos Aires) la app es gratis para quien se
// sume. Para cambiarla, editá FREE_UNTIL. Pasada la fecha, la landing deja de mostrar el contador.
export const FREE_UNTIL = "2026-11-30";

const DAY = 86_400_000;

/** Días que quedan (contando hoy) hasta FREE_UNTIL. 0 = ya terminó. */
export function freeDaysLeft(now = new Date(), until = FREE_UNTIL) {
  const today = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const end = Date.parse(`${until}T00:00:00Z`);
  return Math.max(0, Math.round((end - today) / DAY) + 1);
}

/** "30 de noviembre" */
export function formatFreeUntil(until = FREE_UNTIL) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${until}T12:00:00Z`));
}
