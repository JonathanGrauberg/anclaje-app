// Quién puede usar el panel profesional y por qué. Puro (sin DB ni Mercado Pago) para probarlo.
// Reglas (ver DECISIONES.md, "Suscripciones"):
// - Gratis para siempre: quien se sumó hasta FREE_UNTIL (o lo pidió en el formulario hasta esa
//   fecha), o a quien el admin se lo marcó.
// - El resto: 14 días de prueba desde el alta, sin tarjeta. Después, suscripción en Mercado Pago.
// - Si cancela o se pausa, sigue hasta el próximo débito que ya no se cobra.
// - Sin acceso se bloquea solo el panel: sus pacientes siguen usando la app y no se borra nada.

import { dayKey } from "@/lib/dates";
import { FREE_UNTIL, PLANS } from "@/lib/launch";

export const TRIAL_DAYS = 14;
const DAY = 86_400_000;

export type PlanId = (typeof PLANS)[number]["id"];
export const isPlanId = (v: unknown): v is PlanId => PLANS.some((p) => p.id === v);
export const planById = (id: PlanId) => PLANS.find((p) => p.id === id)!;
/** Lo que se debita cada vez (mensual: 1 mes; semestral: 6; anual: 12). */
export const planCharge = (id: PlanId) => {
  const p = planById(id);
  return p.monthly * p.months;
};

/** Se sumó dentro del lanzamiento (fecha en hora de Buenos Aires, inclusive). */
export const joinedInLaunch = (d: Date, until = FREE_UNTIL) => dayKey(d) <= until;

export type SubscriptionLike = {
  plan: string;
  amount: number;
  status: string;
  nextPaymentAt: Date | null;
  createdAt: Date;
};

export type BillingState =
  | { kind: "free"; access: true }
  | {
      kind: "trial";
      access: true;
      trialEndsAt: Date;
      daysLeft: number;
      sub: SubscriptionLike | null;
    }
  | { kind: "active"; access: true; sub: SubscriptionLike }
  | { kind: "ending"; access: true; until: Date; sub: SubscriptionLike }
  | { kind: "blocked"; access: false; trialEndedAt: Date; sub: SubscriptionLike | null };

export function billingState(input: {
  createdAt: Date;
  freeForever: boolean;
  /** Pidió el acceso por el formulario dentro del lanzamiento y la cuenta se creó después. */
  leadInLaunch?: boolean;
  /** Cuenta para probar el cobro: sin gratis del lanzamiento y sin días de prueba. */
  billingTest?: boolean;
  /** La suscripción más reciente, si hay. */
  sub: SubscriptionLike | null;
  now?: Date;
  until?: string;
}): BillingState {
  const { createdAt, freeForever, leadInLaunch, billingTest, sub, now = new Date(), until } = input;
  if (freeForever || (!billingTest && (leadInLaunch || joinedInLaunch(createdAt, until))))
    return { kind: "free", access: true };

  if (sub?.status === "authorized") return { kind: "active", access: true, sub };
  if (
    sub &&
    (sub.status === "canceled" || sub.status === "paused") &&
    sub.nextPaymentAt &&
    sub.nextPaymentAt > now
  )
    return { kind: "ending", access: true, until: sub.nextPaymentAt, sub };

  const trialEndsAt = new Date(createdAt.getTime() + TRIAL_DAYS * DAY);
  if (!billingTest && now < trialEndsAt) {
    const daysLeft = Math.max(1, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY));
    return { kind: "trial", access: true, trialEndsAt, daysLeft, sub };
  }
  return { kind: "blocked", access: false, trialEndedAt: trialEndsAt, sub };
}

/** Acción del panel con la prueba terminada y sin plan: el mensaje se muestra tal cual. */
export class PlanRequiredError extends Error {
  constructor() {
    super("Terminó tu período de prueba: elegí un plan en Mi plan para seguir usando el panel.");
  }
}
