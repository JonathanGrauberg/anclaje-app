import { dayKey } from "@/lib/dates";

// Lanzamiento: quien se suma hasta esta fecha (inclusive, hora de Buenos Aires) usa la app gratis
// PARA SIEMPRE (son las primeras testers). Para cambiarla, editá FREE_UNTIL. Pasada la fecha, la
// landing deja de mostrar el contador y los precios se ven sin tachar.
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

// Precios para quien se sume después de FREE_UNTIL (pesos argentinos, por mes). Mientras dure la
// promo, la landing los muestra tachados. Ver DECISIONES.md.
export const PLANS = [
  { id: "mensual", label: "1 mes", months: 1, monthly: 20_000 },
  { id: "semestral", label: "6 meses", months: 6, monthly: 18_000 },
  { id: "anual", label: "1 año", months: 12, monthly: 15_000 },
] as const;

export const BASE_MONTHLY = PLANS[0].monthly;
/** El precio por mes más bajo (plan anual), para el "desde $…". */
export const MIN_MONTHLY = Math.min(...PLANS.map((p) => p.monthly));

/** "$20.000" */
export function formatPesos(n: number) {
  return "$" + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}

/** Descuento redondeado frente al plan mensual (10 = 10 %). */
export function planDiscount(monthly: number) {
  return Math.round((1 - monthly / BASE_MONTHLY) * 100);
}
