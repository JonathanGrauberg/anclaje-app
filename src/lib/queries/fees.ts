import "server-only";
import { linkedPatientsWhere } from "@/lib/access";
import { prisma } from "@/lib/db";
import { DEFAULT_SERVICES, monthKey, monthStart, shiftMonthKey } from "@/lib/fees";
import { patientName } from "@/lib/patients";

// Honorarios: todo se filtra por professionalId. Son registros de la profesional; el paciente
// no los ve.

/** La primera vez, le carga la lista de precios de referencia (después es toda suya). */
export async function ensureDefaultPrices(professionalId: string) {
  const claimed = await prisma.professionalProfile.updateMany({
    where: { id: professionalId, pricesSeededAt: null },
    data: { pricesSeededAt: new Date() },
  });
  if (claimed.count === 0) return;
  await prisma.servicePrice.createMany({
    data: DEFAULT_SERVICES.map((s, i) => ({ professionalId, ...s, sortOrder: i })),
  });
}

export async function getServicePrices(professionalId: string) {
  return prisma.servicePrice.findMany({
    where: { professionalId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, price: true },
  });
}

/** Precios especiales de un paciente: serviceId → precio. */
export async function getPatientPrices(professionalId: string, patientId: string) {
  const rows = await prisma.patientPrice.findMany({
    where: { professionalId, patientId },
    select: { serviceId: true, price: true },
  });
  return new Map(rows.map((r) => [r.serviceId, r.price]));
}

/** Lo último que se le cobró a cada paciente (para proponerlo de nuevo): patientId → serviceId. */
export async function getLastServices(professionalId: string, patientId?: string) {
  const rows = await prisma.payment.findMany({
    where: { professionalId, serviceId: { not: null }, patientId: patientId ?? { not: null } },
    orderBy: { paidAt: "desc" },
    distinct: ["patientId"],
    select: { patientId: true, serviceId: true },
  });
  return Object.fromEntries(rows.map((r) => [r.patientId!, r.serviceId!]));
}

/** Pacientes vinculados para elegir en "Registrar cobro". */
export async function getPayablePatients(professionalId: string) {
  const patients = await prisma.patientProfile.findMany({
    where: linkedPatientsWhere(professionalId),
    select: { id: true, displayName: true, user: { select: { name: true } } },
  });
  return patients
    .map((p) => ({ id: p.id, name: patientName(p) }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

const paymentSelect = {
  id: true,
  concept: true,
  amount: true,
  method: true,
  paidAt: true,
  patient: { select: { id: true, displayName: true, user: { select: { name: true } } } },
} as const;

/** Resumen de un mes: total, por medio de pago, por paciente y los últimos 6 meses. */
export async function getMonthSummary(professionalId: string, month: string) {
  const from = monthStart(month);
  const to = monthStart(shiftMonthKey(month, 1));
  const sixFrom = monthStart(shiftMonthKey(month, -5));

  const [payments, history] = await Promise.all([
    prisma.payment.findMany({
      where: { professionalId, paidAt: { gte: from, lt: to } },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: paymentSelect,
    }),
    prisma.payment.findMany({
      where: { professionalId, paidAt: { gte: sixFrom, lt: to } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const byMethod = new Map<string, number>();
  const byPatient = new Map<
    string,
    { id: string | null; name: string; total: number; count: number }
  >();
  for (const p of payments) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    const key = p.patient?.id ?? "—";
    const row = byPatient.get(key) ?? {
      id: p.patient?.id ?? null,
      name: p.patient ? patientName(p.patient) : "Paciente que dejó la app",
      total: 0,
      count: 0,
    };
    row.total += p.amount;
    row.count += 1;
    byPatient.set(key, row);
  }

  const months = Array.from({ length: 6 }, (_, i) => shiftMonthKey(month, i - 5));
  const totals = new Map(months.map((m) => [m, 0]));
  for (const p of history) {
    const k = monthKey(p.paidAt);
    if (totals.has(k)) totals.set(k, totals.get(k)! + p.amount);
  }

  return {
    total: payments.reduce((s, p) => s + p.amount, 0),
    count: payments.length,
    previousTotal: totals.get(shiftMonthKey(month, -1)) ?? 0,
    byMethod: [...byMethod]
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total),
    byPatient: [...byPatient.values()].sort((a, b) => b.total - a.total),
    history: months.map((m) => ({ month: m, total: totals.get(m)! })),
    payments: payments.map((p) => ({
      id: p.id,
      concept: p.concept,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt,
      patientId: p.patient?.id ?? null,
      patientName: p.patient ? patientName(p.patient) : "Paciente que dejó la app",
    })),
  };
}

/** Cobros de un paciente (los últimos 50) y el total del mes. */
export async function getPatientPayments(professionalId: string, patientId: string) {
  const payments = await prisma.payment.findMany({
    where: { professionalId, patientId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { id: true, concept: true, amount: true, method: true, paidAt: true },
  });
  const current = monthKey(new Date());
  return {
    payments,
    monthTotal: payments
      .filter((p) => monthKey(p.paidAt) === current)
      .reduce((s, p) => s + p.amount, 0),
  };
}
