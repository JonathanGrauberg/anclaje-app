import "server-only";
import { cache } from "react";
import { billingState, joinedInLaunch, type BillingState, type PlanId } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { FREE_UNTIL } from "@/lib/launch";

// Suscripciones con Mercado Pago (preapproval "sin plan asociado", pago pendiente: la profesional
// paga en la página de MP). Ver DECISIONES.md, "Suscripciones".
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
  init_point?: string;
  next_payment_date?: string | null;
  summarized?: { last_charged_date?: string | null } | null;
  auto_recurring?: { transaction_amount?: number } | null;
};

export function createPreapproval(input: {
  professionalId: string;
  plan: PlanId;
  label: string;
  months: number;
  amount: number;
  payerEmail: string;
  backUrl: string;
  startDate: Date | null;
}) {
  return mp<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `Anclaje · plan ${input.label}`,
      external_reference: input.professionalId,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      status: "pending",
      auto_recurring: {
        frequency: input.months,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: "ARS",
        // Si todavía le quedan días de prueba (o de un plan cancelado), el primer débito es ahí.
        ...(input.startDate ? { start_date: input.startDate.toISOString() } : {}),
      },
    }),
  });
}

export const getPreapproval = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);

export const cancelPreapproval = (id: string) =>
  mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "canceled" }),
  });

export const getAuthorizedPayment = (id: string) =>
  mp<{ id: number | string; preapproval_id?: string }>(
    `/authorized_payments/${encodeURIComponent(id)}`,
  );

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

/**
 * Trae el estado de MP y lo copia a nuestra fila. Solo actualiza si la suscripción es nuestra
 * (la creamos nosotros y el external_reference coincide con la profesional). Devuelve la fila o null.
 */
export async function syncPreapproval(id: string, professionalId?: string) {
  const row = await prisma.subscription.findUnique({ where: { mpPreapprovalId: id } });
  if (!row || (professionalId && row.professionalId !== professionalId)) return null;
  const p = await getPreapproval(id);
  if (p.external_reference !== row.professionalId) return null;
  const status = p.status === "cancelled" ? "canceled" : p.status;
  return prisma.subscription.update({
    where: { id: row.id },
    data: {
      status,
      nextPaymentAt: toDate(p.next_payment_date) ?? row.nextPaymentAt,
      lastPaymentAt: toDate(p.summarized?.last_charged_date) ?? row.lastPaymentAt,
      canceledAt: status === "canceled" ? (row.canceledAt ?? new Date()) : row.canceledAt,
    },
  });
}

/** La suscripción que cuenta: la autorizada; si no, la que sigue paga hasta el débito; si no, la última. */
export async function currentSubscription(professionalId: string, now = new Date()) {
  const subs = await prisma.subscription.findMany({
    where: { professionalId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
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

/** Estado de cobro de una profesional (por request). Sin MP configurado, nadie queda bloqueado. */
export const getBilling = cache(
  async (
    professionalId: string,
  ): Promise<{ state: BillingState; enabled: boolean; access: boolean }> => {
    const pro = await prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professionalId },
      select: { createdAt: true, freeForever: true, user: { select: { email: true, role: true } } },
    });
    const enabled = mpEnabled();
    if (pro.user.role === "ADMIN")
      return { state: { kind: "free", access: true }, enabled, access: true };
    const sub = await currentSubscription(professionalId);
    let state = billingState({ createdAt: pro.createdAt, freeForever: pro.freeForever, sub });
    // Pidió el acceso por el formulario dentro del lanzamiento pero la cuenta se creó después.
    if (state.kind === "trial" || state.kind === "blocked") {
      const lead = await prisma.lead.findFirst({
        where: { email: { equals: pro.user.email, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (lead && joinedInLaunch(lead.createdAt, FREE_UNTIL))
        state = { kind: "free", access: true };
    }
    return { state, enabled, access: state.access || !enabled };
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
