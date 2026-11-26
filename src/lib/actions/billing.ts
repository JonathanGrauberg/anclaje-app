"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { isPlanId, planById, planCharge } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/email";
import {
  cancelPreapproval,
  currentSubscription,
  getBilling,
  mpEnabled,
  mpPlanFor,
  planCheckoutUrl,
} from "@/lib/mercadopago";
import { allow } from "@/lib/rate-limit";
import { professionalAccountForAction } from "@/lib/session";
import { fail, ok, safe } from "./result";

// Planes de la profesional con Mercado Pago. No usan professionalForAction: tienen que andar
// justamente cuando la prueba terminó y el panel está bloqueado.

const startSchema = z.object({ plan: z.string().refine(isPlanId, "Elegí un plan") });

const DAY = 86_400_000;

/** Devuelve el link al checkout de MP del plan elegido. La suscripción la crea MP cuando paga. */
export async function startSubscription(input: { plan: string }) {
  return safe(async () => {
    const { userId, professional } = await professionalAccountForAction();
    if (!mpEnabled()) return fail("Los pagos todavía no están habilitados. Escribinos.");
    if (!allow(`subscribe:${professional.id}`, 6, 10 * 60_000))
      return fail("Probaste muchas veces seguidas. Esperá unos minutos.");
    const parsed = startSchema.safeParse({ plan: input?.plan });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
    const planId = parsed.data.plan as Parameters<typeof planById>[0];

    const { state } = await getBilling(professional.id);
    if (state.kind === "suspended")
      return fail("Tu acceso al panel está pausado. Escribinos para reactivarlo.");
    if (state.kind === "free") return fail("Tu cuenta es gratis para siempre: no tenés que pagar.");
    if (state.kind === "active")
      return fail("Ya tenés un plan activo. Para cambiarlo, primero cancelá el actual.");

    // Si le quedan días de prueba o de un plan cancelado, el primer débito es cuando terminan.
    const until =
      state.kind === "trial" ? state.trialEndsAt : state.kind === "ending" ? state.until : null;
    const left = until ? (until.getTime() - Date.now()) / DAY : 0;
    const trialDays = left > 1 ? Math.ceil(left) : 0;

    const plan = planById(planId);
    let mpPlan;
    try {
      mpPlan = await mpPlanFor({
        plan: planId,
        label: plan.label,
        months: plan.months,
        amount: planCharge(planId),
        trialDays,
        backUrl: appUrl("/plan"),
      });
    } catch (e) {
      console.error("[mercadopago] no se pudo crear el plan", (e as Error).message);
      const why = (e as Error).message.replace(/^Mercado Pago \d+: /, "").slice(0, 160);
      return fail(
        `No pudimos abrir Mercado Pago. Probá de nuevo en un rato; si sigue, escribinos. (Mercado Pago dice: ${why})`,
      );
    }
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Subscription",
      entityId: mpPlan.mpPlanId,
      meta: { plan: planId, trialDays },
    });
    return ok({ url: planCheckoutUrl(mpPlan.initPoint, professional.id) });
  });
}

/** Cancela en MP. Sigue usando el panel hasta el próximo débito, que ya no se cobra. */
export async function cancelSubscription() {
  return safe(async () => {
    const { userId, professional } = await professionalAccountForAction();
    const sub = await currentSubscription(professional.id);
    if (!sub?.mpPreapprovalId || sub.status !== "authorized")
      return fail("No tenés un plan activo para cancelar.");
    const res = await cancelPreapproval(sub.mpPreapprovalId);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "canceled",
        canceledAt: new Date(),
        // Hasta cuándo ya está pago: lo dice MP o, si no, el último débito más el período.
        nextPaymentAt: res.next_payment_date
          ? new Date(res.next_payment_date)
          : (sub.nextPaymentAt ??
            (sub.lastPaymentAt && isPlanId(sub.plan)
              ? new Date(
                  new Date(sub.lastPaymentAt).setMonth(
                    sub.lastPaymentAt.getMonth() + planById(sub.plan).months,
                  ),
                )
              : null)),
      },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "Subscription",
      entityId: sub.mpPreapprovalId,
      meta: { status: "canceled" },
    });
    revalidatePath("/plan");
    return ok(undefined);
  });
}
