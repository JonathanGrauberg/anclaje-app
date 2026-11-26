import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { billingState, joinedInLaunch, type BillingState, type PlanId } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { FREE_UNTIL } from "@/lib/launch";

// Suscripciones con Mercado Pago (preapproval "con plan asociado": la profesional paga en el
// checkout del plan, como quiera, y MP nos avisa por webhook). Ver DECISIONES.md, "Suscripciones".
// Variables: MP_ACCESS_TOKEN (de la app de MP; las de prueba empiezan con TEST-) y
// MP_WEBHOOK_SECRET (clave secreta de las notificaciones). Sin MP_ACCESS_TOKEN no se cobra ni se
// bloquea a nadie.

const API = "https://api.mercadopago.com";

export const mpEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN);

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Sin datos personales en el log: solo el código y el mensaje de MP.
    const msg = (body as { message?: string }).message ?? res.statusText;
    throw new Error(`Mercado Pago ${res.status}: ${msg}`);
  }
  return body as T;
}

export type Preapproval = {
  id: string;
  status: string;
  external_reference?: string | null;
  preapproval_plan_id?: string | null;
  init_point?: string;
  next_payment_date?: string | null;
  summarized?: { last_charged_date?: string | null } | null;
  auto_recurring?: { transaction_amount?: number } | null;
};

/** Huella del access token (no el token): identifica la cuenta de MP sin guardar el secreto. */
export const mpAccount = () =>
  createHash("sha256")
    .update(process.env.MP_ACCESS_TOKEN ?? "")
    .digest("hex")
    .slice(0, 16);

type PreapprovalPlan = { id: string; init_point: string };

/**
 * El plan de MP para esa combinación (lo crea la primera vez y lo guarda). Es el esquema "con plan
 * asociado": la profesional paga en el checkout del plan, sin que le pidamos el email de su cuenta.
 */
export async function mpPlanFor(input: {
  plan: PlanId;
  label: string;
  months: number;
  amount: number;
  trialDays: number;
  backUrl: string;
}) {
  const key = {
    account: mpAccount(),
    plan: input.plan,
    amount: input.amount,
    trialDays: input.trialDays,
  };
  const found = await prisma.mpPlan.findUnique({ where: { account_plan_amount_trialDays: key } });
  if (found) return found;
  const created = await mp<PreapprovalPlan>("/preapproval_plan", {
    method: "POST",
    body: JSON.stringify({
      reason: `Anclaje · plan ${input.label}`,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: input.months,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "ARS",
        // Si todavía le quedan días de prueba (o de un plan cancelado), el primer débito es ahí.
        ...(input.trialDays > 0
          ? { free_trial: { frequency: input.trialDays, frequency_type: "days" } }
          : {}),
      },
    }),
  });
  return prisma.mpPlan.upsert({
    where: { account_plan_amount_trialDays: key },
    create: { ...key, mpPlanId: created.id, initPoint: created.init_point },
    update: {},
  });
}

/** Link al checkout del plan, marcado con la profesional (vuelve en external_reference). */
export function planCheckoutUrl(initPoint: string, professionalId: string) {
  const url = new URL(initPoint);
  url.searchParams.set("external_reference", professionalId);
  return url.toString();
}

export const getPreapproval = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);

export const cancelPreapproval = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }), // así, con doble l, lo pide MP
  });

export const getAuthorizedPayment = (id: string) =>
  mp<{ id: number | string; preapproval_id?: string }>(
    `/authorized_payments/${encodeURIComponent(id)}`,
  );

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

const skip = (id: string, why: string) => {
  // Sin datos personales: solo el id de MP y el motivo, para poder diagnosticarlo en los logs.
  console.warn(`[mercadopago] suscripción ${id} sin registrar: ${why}`);
  return null;
};

/**
 * Trae el estado de MP y lo copia a nuestra fila (la crea si es la primera vez que la vemos). Solo
 * acepta suscripciones a planes nuestros. La dueña es la del `external_reference`; si MP no lo
 * devuelve, la profesional logueada que vuelve del checkout con ese id (`professionalId`) la puede
 * reclamar, siempre que no sea ya de otra. Devuelve la fila o null.
 */
export async function syncPreapproval(id: string, professionalId?: string) {
  const row = await prisma.subscription.findUnique({ where: { mpPreapprovalId: id } });
  if (row && professionalId && row.professionalId !== professionalId)
    return skip(id, "es de otra profesional");
  if (row && row.account !== mpAccount()) return skip(id, "es de otra cuenta de MP");
  const p = await getPreapproval(id);
  const ref = p.external_reference || null;
  if (row && ref && ref !== row.professionalId) return skip(id, "external_reference no coincide");
  if (professionalId && ref && ref !== professionalId)
    return skip(id, "external_reference de otra profesional");

  const status = p.status === "cancelled" ? "canceled" : p.status;
  const data = {
    status,
    nextPaymentAt: toDate(p.next_payment_date) ?? row?.nextPaymentAt ?? null,
    lastPaymentAt: toDate(p.summarized?.last_charged_date) ?? row?.lastPaymentAt ?? null,
    canceledAt: status === "canceled" ? (row?.canceledAt ?? new Date()) : (row?.canceledAt ?? null),
  };
  if (row) return prisma.subscription.update({ where: { id: row.id }, data });

  const owner = ref ?? professionalId;
  if (!owner) return skip(id, "MP no mandó external_reference");
  const plan = p.preapproval_plan_id
    ? await prisma.mpPlan.findUnique({ where: { mpPlanId: p.preapproval_plan_id } })
    : null;
  if (!plan) return skip(id, `plan desconocido (${p.preapproval_plan_id ?? "sin plan"})`);
  const pro = await prisma.professionalProfile.findUnique({
    where: { id: owner },
    select: { id: true },
  });
  if (!pro) return skip(id, "la profesional no existe");
  return prisma.subscription.upsert({
    where: { mpPreapprovalId: p.id },
    create: {
      professionalId: pro.id,
      plan: plan.plan,
      amount: plan.amount,
      mpPreapprovalId: p.id,
      account: mpAccount(),
      ...data,
    },
    update: data,
  });
}

/** La suscripción que cuenta: la autorizada; si no, la que sigue paga hasta el débito; si no, la última. */
/** La suscripción que manda: la activa, si no la cancelada que sigue vigente, si no la última. */
function pickSubscription<T extends { status: string; nextPaymentAt: Date | null }>(
  subs: T[],
  now = new Date(),
): T | null {
  return (
    subs.find((s) => s.status === "authorized") ??
    subs.find(
      (s) =>
        (s.status === "canceled" || s.status === "paused") &&
        s.nextPaymentAt &&
        s.nextPaymentAt > now,
    ) ??
    subs[0] ??
    null
  );
}

export async function currentSubscription(professionalId: string, now = new Date()) {
  const subs = await prisma.subscription.findMany({
    where: { professionalId, account: mpAccount() },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return pickSubscription(subs, now);
}

/**
 * Estado de cobro de muchas profesionales a la vez (para las listas del admin), con las mismas
 * reglas que getBilling pero en tres consultas en total.
 */
export async function billingStates(
  pros: {
    id: string;
    createdAt: Date;
    freeForever: boolean;
    billingTest: boolean;
    accessBlocked: boolean;
    email: string;
    role: string;
  }[],
): Promise<Map<string, BillingState>> {
  const now = new Date();
  const ids = pros.map((p) => p.id);
  const [subs, leads] = await Promise.all([
    prisma.subscription.findMany({
      where: { professionalId: { in: ids }, account: mpAccount() },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({ select: { email: true, createdAt: true } }),
  ]);
  const launchLeads = new Set(
    leads
      .filter((l) => joinedInLaunch(l.createdAt, FREE_UNTIL))
      .map((l) => l.email.trim().toLowerCase()),
  );
  const out = new Map<string, BillingState>();
  for (const p of pros) {
    if (p.role === "ADMIN") {
      out.set(p.id, { kind: "free", access: true });
      continue;
    }
    const state = billingState({
      createdAt: p.createdAt,
      freeForever: p.freeForever,
      billingTest: p.billingTest,
      accessBlocked: p.accessBlocked,
      sub: pickSubscription(
        subs.filter((s) => s.professionalId === p.id),
        now,
      ),
      now,
    });
    // Igual que getBilling: pidió el acceso en el lanzamiento y la cuenta se creó después.
    const lead =
      !p.billingTest &&
      (state.kind === "trial" || state.kind === "blocked") &&
      launchLeads.has(p.email.trim().toLowerCase());
    out.set(p.id, lead ? { kind: "free", access: true } : state);
  }
  return out;
}

/** Estado de cobro de una profesional (por request). Sin MP configurado, nadie queda bloqueado. */
export const getBilling = cache(
  async (
    professionalId: string,
  ): Promise<{ state: BillingState; enabled: boolean; access: boolean }> => {
    const pro = await prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professionalId },
      select: {
        createdAt: true,
        freeForever: true,
        billingTest: true,
        accessBlocked: true,
        user: { select: { email: true, role: true } },
      },
    });
    const enabled = mpEnabled();
    if (pro.user.role === "ADMIN")
      return { state: { kind: "free", access: true }, enabled, access: true };
    const sub = await currentSubscription(professionalId);
    let state = billingState({
      createdAt: pro.createdAt,
      freeForever: pro.freeForever,
      billingTest: pro.billingTest,
      accessBlocked: pro.accessBlocked,
      sub,
    });
    // Pidió el acceso por el formulario dentro del lanzamiento pero la cuenta se creó después.
    if (!pro.billingTest && (state.kind === "trial" || state.kind === "blocked")) {
      const lead = await prisma.lead.findFirst({
        where: { email: { equals: pro.user.email, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (lead && joinedInLaunch(lead.createdAt, FREE_UNTIL))
        state = { kind: "free", access: true };
    }
    // Sin MP configurado nadie queda bloqueado por pago, pero el corte manual vale igual.
    const access = state.kind === "suspended" ? false : state.access || !enabled;
    return { state, enabled, access };
  },
);

/**
 * Red de seguridad por si se pierde un webhook: una vez por día se vuelve a consultar en MP cada
 * suscripción que todavía puede cambiar (autorizadas, pausadas y pendientes de la última semana).
 */
export async function syncOpenSubscriptions(now = new Date()) {
  if (!mpEnabled()) return { skipped: "Mercado Pago sin configurar" };
  const subs = await prisma.subscription.findMany({
    where: {
      mpPreapprovalId: { not: null },
      account: mpAccount(),
      OR: [
        { status: { in: ["authorized", "paused"] } },
        { status: "pending", createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
      ],
    },
    select: { mpPreapprovalId: true },
    take: 500,
  });
  let synced = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      if (await syncPreapproval(s.mpPreapprovalId!)) synced++;
    } catch (e) {
      failed++;
      console.error("[mercadopago] no se pudo sincronizar", (e as Error).message);
    }
  }
  return { candidates: subs.length, synced, failed };
}
