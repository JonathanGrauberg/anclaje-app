// Cómo se ve el plan de cada profesional en el admin (lista y resumen). Puro, para probarlo.
import { isPlanId, joinedInLaunch, planById, type BillingState } from "@/lib/billing";

export type PlanTone = "free" | "trial" | "paying" | "ending" | "none" | "off";
export type PlanView = { tone: PlanTone; label: string; detail?: string; monthly: number };

const shortDate = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "short",
});

/** Lo que nos paga por mes, en promedio (un plan anual se reparte en 12). */
const monthlyOf = (sub: { plan: string; amount: number }) =>
  isPlanId(sub.plan) ? Math.round(sub.amount / planById(sub.plan).months) : sub.amount;

export function planView(
  b: BillingState,
  p: { freeForever: boolean; billingTest: boolean; createdAt: Date },
): PlanView {
  const test = p.billingTest ? " · prueba de cobros" : "";
  switch (b.kind) {
    case "free":
      return p.freeForever
        ? { tone: "free", label: "VIP", detail: "Cortesía", monthly: 0 }
        : {
            tone: "free",
            label: "Gratis",
            detail: joinedInLaunch(p.createdAt) ? "Lanzamiento" : "Pidió acceso en el lanzamiento",
            monthly: 0,
          };
    case "trial":
      return {
        tone: "trial",
        label: `Prueba · ${b.daysLeft} ${b.daysLeft === 1 ? "día" : "días"}`,
        detail: `Hasta el ${shortDate.format(b.trialEndsAt)}`,
        monthly: 0,
      };
    case "active": {
      const label = isPlanId(b.sub.plan) ? planById(b.sub.plan).label : b.sub.plan;
      return {
        tone: "paying",
        label: `Paga · ${label}`,
        detail: test.slice(3) || undefined,
        monthly: monthlyOf(b.sub),
      };
    }
    case "ending":
      return {
        tone: "ending",
        label: "Canceló",
        detail: `Usa hasta el ${shortDate.format(b.until)}`,
        monthly: 0,
      };
    case "blocked":
      return {
        tone: "none",
        label: "Sin plan",
        detail:
          b.sub?.status === "pending"
            ? "Empezó a pagar y no terminó"
            : p.billingTest
              ? "Prueba de cobros"
              : "Terminó la prueba",
        monthly: 0,
      };
    case "suspended":
      return { tone: "off", label: "Sin acceso", detail: "Cortado a mano", monthly: 0 };
  }
}
