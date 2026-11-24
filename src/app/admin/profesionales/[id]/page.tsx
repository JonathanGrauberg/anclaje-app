import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { formatDate, formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatPesos } from "@/lib/launch";
import { jurisdictionName } from "@/lib/licenses";
import { requireAdmin } from "@/lib/session";
import {
  BillingTestButton,
  FreeForeverButton,
  RefreshSubscriptionsButton,
  ResetPasswordButton,
  VerifyButton,
} from "../professionals-client";
import { getBilling, mpAccount } from "@/lib/mercadopago";
import { isPlanId, joinedInLaunch, planById, type BillingState } from "@/lib/billing";
import { StatGroup } from "../../stat-group";

export const metadata: Metadata = { title: "Profesional" };

const DAY = 24 * 60 * 60 * 1000;
const SUB_STATUS: Record<string, string> = {
  pending: "Pendiente: no terminó de pagar en MP",
  authorized: "Activa",
  paused: "Pausada",
  canceled: "Cancelada",
};
const DIGEST: Record<string, string> = {
  NEVER: "No",
  DAILY: "Todos los días",
  WEEKLY: "Semanal",
};

/**
 * Ficha de una profesional para el admin: cómo usa Anclaje, en cantidades. Nunca muestra quiénes
 * son sus pacientes, ni lo que escriben, ni sus notas, ni cuánto cobra (ver DECISIONES.md).
 */
export default async function AdminProfessionalPage({
  params,
}: PageProps<"/admin/profesionales/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.professionalProfile.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      licenseNumber: true,
      licenseJurisdiction: true,
      verifiedAt: true,
      digestFrequency: true,
      appointmentReminders: true,
      demoCreatedAt: true,
      freeForever: true,
      billingTest: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLoginAt: true,
          lastActiveAt: true,
          accounts: { select: { providerId: true } },
          _count: { select: { pushSubscriptions: true } },
        },
      },
    },
  });
  if (!p) notFound();

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY);
  const pro = { professionalId: p.id };
  // La paciente de ejemplo no cuenta.
  const real = { patient: { isDemo: false } };

  const [
    withApp,
    withoutApp,
    endedLinks,
    invites,
    invitesUsed,
    apptTotal,
    appt30,
    apptNext,
    apptCancelled,
    ownTests,
    activeAssignments,
    responses,
    responses30,
    tasks,
    tasksDone,
    resources,
    feedbacks,
    notes,
    records,
    services,
    payments,
    payments30,
  ] = await Promise.all([
    prisma.careLink.count({
      where: { ...pro, status: "ACTIVE", patient: { userId: { not: null }, isDemo: false } },
    }),
    prisma.patientProfile.count({ where: { managedById: p.id, isDemo: false } }),
    prisma.careLink.count({ where: { ...pro, status: { not: "ACTIVE" }, ...real } }),
    prisma.invitation.count({ where: pro }),
    prisma.invitation.count({ where: { ...pro, usedAt: { not: null } } }),
    prisma.appointment.count({ where: { ...pro, ...real } }),
    prisma.appointment.count({ where: { ...pro, ...real, startsAt: { gte: d30, lte: now } } }),
    prisma.appointment.count({
      where: { ...pro, ...real, startsAt: { gt: now }, status: "SCHEDULED" },
    }),
    prisma.appointment.count({ where: { ...pro, ...real, status: "CANCELLED" } }),
    prisma.assessment.count({ where: { ownerId: p.id, archivedAt: null } }),
    prisma.assessmentAssignment.count({ where: { ...pro, ...real, active: true } }),
    prisma.assessmentResponse.count({
      where: { status: "COMPLETED", assignment: { professionalId: p.id }, ...real },
    }),
    prisma.assessmentResponse.count({
      where: {
        status: "COMPLETED",
        completedAt: { gte: d30 },
        assignment: { professionalId: p.id },
        ...real,
      },
    }),
    prisma.task.count({ where: { ...pro, ...real } }),
    prisma.task.count({ where: { ...pro, ...real, completedAt: { not: null } } }),
    prisma.resource.count({ where: pro }),
    prisma.feedback.count({ where: { ...pro, ...real } }),
    prisma.clinicalNote.count({ where: { ...pro, ...real } }),
    prisma.clinicalRecord.count({ where: { ...pro, ...real } }),
    prisma.servicePrice.count({ where: pro }),
    prisma.payment.count({ where: { ...pro, OR: [{ patientId: null }, real] } }),
    prisma.payment.count({
      where: { ...pro, paidAt: { gte: d30 }, OR: [{ patientId: null }, real] },
    }),
  ]);

  const { state: billing, enabled: billingOn } = await getBilling(p.id);
  // Intentos de suscripción (solo estado y fechas; nada de datos de pago).
  const subs = await prisma.subscription.findMany({
    where: { professionalId: p.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      plan: true,
      amount: true,
      status: true,
      createdAt: true,
      nextPaymentAt: true,
      account: true,
    },
  });
  const account = mpAccount();
  const google = p.user.accounts.some((a) => a.providerId === "google");
  const password = p.user.accounts.some((a) => a.providerId === "credential");
  const rows: [string, React.ReactNode][] = [
    ["Nombre", p.user.name],
    ["Email", p.user.email],
    [
      "Matrícula",
      <span key="m">
        {p.licenseNumber ?? "—"}
        {p.licenseJurisdiction && ` · ${jurisdictionName(p.licenseJurisdiction)}`}{" "}
        {p.verifiedAt ? (
          <span className="text-muted-foreground text-xs">
            (verificada el {formatDate(p.verifiedAt)})
          </span>
        ) : (
          <Badge>Sin verificar</Badge>
        )}
      </span>,
    ],
    [
      "Entra con",
      [password && "email y contraseña", google && "Google"].filter(Boolean).join(" y ") || "—",
    ],
    ["Alta", formatDate(p.createdAt)],
    [
      "Plan",
      planText(billing, p.freeForever) +
        (p.billingTest ? " · cuenta de prueba de cobros" : "") +
        (billingOn ? "" : " · cobro sin configurar"),
    ],
    ["Último ingreso", p.user.lastLoginAt ? formatRelative(p.user.lastLoginAt) : "Nunca"],
    ["Usó la app", p.user.lastActiveAt ? formatRelative(p.user.lastActiveAt) : "Nunca"],
    ["Avisos al celular", p.user._count.pushSubscriptions > 0 ? "Activados" : "No"],
    ["Resumen por mail", DIGEST[p.digestFrequency] ?? p.digestFrequency],
    ["Recordatorio de turnos a pacientes", p.appointmentReminders ? "Sí" : "No"],
    ["Paciente de ejemplo", p.demoCreatedAt ? `Creada el ${formatDate(p.demoCreatedAt)}` : "No"],
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={p.displayName}
        description="Cómo usa Anclaje, en cantidades. No se ve quiénes son sus pacientes, ni lo que escriben, ni sus notas, ni cuánto cobra."
        back={{ href: "/admin/profesionales", label: "Profesionales" }}
        action={
          <div className="flex flex-wrap gap-2">
            {!p.verifiedAt && <VerifyButton professionalId={p.id} name={p.displayName} />}
            {/* Las del lanzamiento ya son gratis para siempre: el botón es para las demás. */}
            {p.user.role === "PROFESSIONAL" && (p.freeForever || !joinedInLaunch(p.createdAt)) && (
              <FreeForeverButton professionalId={p.id} name={p.displayName} value={p.freeForever} />
            )}
            {p.user.role === "PROFESSIONAL" && (
              <BillingTestButton professionalId={p.id} name={p.displayName} value={p.billingTest} />
            )}
            {p.user.role === "PROFESSIONAL" && !google && (
              <ResetPasswordButton userId={p.user.id} name={p.displayName} />
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <dl className="divide-y text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr]">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {subs.length > 0 && (
        <section aria-labelledby="subs-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="subs-title" className="text-lg font-semibold">
              Suscripción en Mercado Pago
            </h2>
            <RefreshSubscriptionsButton professionalId={p.id} />
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {subs.map((s) => (
                  <li key={s.id} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3">
                    <span className="font-medium">
                      {isPlanId(s.plan) ? planById(s.plan).label : s.plan} · {formatPesos(s.amount)}
                    </span>
                    <span>
                      {SUB_STATUS[s.status] ?? s.status}
                      {s.account !== account && " · de otra cuenta de MP (no cuenta)"}
                    </span>
                    <span className="text-muted-foreground">
                      empezado {formatRelative(s.createdAt)}
                      {s.nextPaymentAt && ` · próximo débito ${formatDate(s.nextPaymentAt)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      <StatGroup
        title="Pacientes"
        stats={[
          { label: "Con la app", value: withApp },
          { label: "Sin la app", value: withoutApp, hint: "Cargados para agenda e historia" },
          { label: "Invitaciones", value: invites, hint: `${invitesUsed} aceptadas` },
          { label: "Vínculos terminados", value: endedLinks },
        ]}
      />

      <StatGroup
        title="Agenda"
        stats={[
          { label: "Turnos en total", value: apptTotal, hint: `${apptCancelled} cancelados` },
          { label: "Turnos en los últimos 30 días", value: appt30 },
          { label: "Próximos turnos", value: apptNext },
        ]}
      />

      <StatGroup
        title="Herramientas"
        stats={[
          { label: "Tests propios", value: ownTests, hint: `${activeAssignments} asignados ahora` },
          {
            label: "Evaluaciones respondidas",
            value: responses,
            hint: `${responses30} en los últimos 30 días`,
          },
          { label: "Tareas mandadas", value: tasks, hint: `${tasksDone} hechas` },
          { label: "Materiales en su biblioteca", value: resources },
          { label: "Devoluciones enviadas", value: feedbacks },
          { label: "Notas clínicas", value: notes, hint: "Solo la cantidad" },
          { label: "Historias clínicas", value: records, hint: "Solo la cantidad" },
        ]}
      />

      <StatGroup
        title="Honorarios"
        stats={[
          { label: "Servicios en su lista", value: services },
          {
            label: "Cobros cargados",
            value: payments,
            hint: `${payments30} en los últimos 30 días`,
          },
        ]}
      />
    </div>
  );
}

/** Estado del plan en palabras, sin montos de lo que ella cobra (solo lo que nos paga). */
function planText(b: BillingState, manual: boolean) {
  const sub = "sub" in b ? b.sub : null;
  const label = sub && isPlanId(sub.plan) ? planById(sub.plan).label : sub?.plan;
  switch (b.kind) {
    case "free":
      return manual ? "Gratis para siempre (marcado a mano)" : "Gratis para siempre";
    case "trial":
      return `En prueba: quedan ${b.daysLeft} días (hasta el ${formatDate(b.trialEndsAt)})`;
    case "active":
      return `Plan ${label} activo · ${formatPesos(b.sub.amount)}${b.sub.nextPaymentAt ? ` · próximo débito ${formatDate(b.sub.nextPaymentAt)}` : ""}`;
    case "ending":
      return `Canceló el plan ${label}: usa el panel hasta el ${formatDate(b.until)}`;
    case "blocked":
      return `Sin plan${b.trialEndedAt < new Date() ? `: terminó la prueba el ${formatDate(b.trialEndedAt)}` : ""}${sub?.status === "pending" ? " (empezó a pagar y no terminó)" : ""}`;
  }
}
