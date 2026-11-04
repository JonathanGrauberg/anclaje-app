import type { PaymentMethod } from "@/generated/prisma/enums";
import { dayKey, LOCALE } from "@/lib/dates";

// Honorarios: lista de precios de referencia, precio por paciente y cobros. Montos en pesos
// enteros (sin centavos).

/**
 * Lista con la que arranca cada profesional. Son valores orientativos (noviembre de 2026) para
 * no empezar de cero: los cambia, borra o agrega a su gusto.
 */
export const DEFAULT_SERVICES: { name: string; price: number }[] = [
  { name: "Terapia individual", price: 40_000 },
  { name: "Primera entrevista", price: 40_000 },
  { name: "Terapia de pareja", price: 55_000 },
  { name: "Sesión familiar", price: 60_000 },
  { name: "Terapia grupal (por persona)", price: 25_000 },
  { name: "Revinculación (por encuentro)", price: 60_000 },
  { name: "Sesión a domicilio", price: 55_000 },
  { name: "Orientación vocacional (proceso)", price: 200_000 },
  { name: "Apto psicológico", price: 35_000 },
  { name: "Psicodiagnóstico", price: 250_000 },
  { name: "Evaluación neurocognitiva", price: 300_000 },
  { name: "Informe psicológico", price: 60_000 },
];

export const MAX_PRICE = 100_000_000;

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "CASH", label: "Efectivo" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "MERCADO_PAGO", label: "Mercado Pago" },
  { id: "HEALTH_INSURANCE", label: "Obra social / prepaga" },
  { id: "OTHER", label: "Otro" },
];
export const methodLabel = (m: PaymentMethod) =>
  PAYMENT_METHODS.find((x) => x.id === m)?.label ?? "Otro";

const moneyFmt = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** "$ 40.000" */
export const formatMoney = (n: number) => moneyFmt.format(n);
/** "40.000" (para mostrar dentro de un input) */
export const formatAmount = (n: number) => numberFmt.format(n);

/**
 * Lee un monto como lo escribe la gente: "40000", "40.000", "$ 40.000", "40k", "40 mil".
 * Los centavos se descartan ("40.000,50" → 40000). Devuelve null si no hay número.
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\$/g, "").replace(/\s+/g, " ");
  if (!s) return null;
  const thousands = /^(\d+(?:[.,]\d+)?)\s*(k|mil)$/.exec(s);
  if (thousands) return Math.round(Number(thousands[1].replace(",", ".")) * 1000);
  const noCents = s.replace(/,\d{1,2}$/, "");
  const digits = noCents.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/** Mes en Buenos Aires: "AAAA-MM". */
export const monthKey = (d: Date) => dayKey(d).slice(0, 7);

export function shiftMonthKey(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Comienzo (hora de Buenos Aires) del mes "AAAA-MM". */
export const monthStart = (month: string) => new Date(`${month}-01T00:00:00-03:00`);

const monthFmt = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });
const utcOf = (month: string) => new Date(`${month}-15T12:00:00Z`);

/** "noviembre de 2026" */
export const formatMonth = (month: string) => monthFmt.format(utcOf(month));
/** "nov" */
export const formatMonthShort = (month: string) =>
  monthShortFmt.format(utcOf(month)).replace(".", "");

/** Precio para un paciente: el especial si tiene, si no el de la lista. */
export function priceFor(
  service: { id: string; price: number },
  patientPrices: Map<string, number>,
) {
  return patientPrices.get(service.id) ?? service.price;
}

/** Variación contra el mes anterior, en %, redondeada. null si no hay base para comparar. */
export function changePct(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
