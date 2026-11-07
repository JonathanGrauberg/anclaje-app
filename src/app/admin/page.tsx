import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { formatDate, TIME_ZONE } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { freeDaysLeft } from "@/lib/launch";
import { requireAdmin } from "@/lib/session";
import { StatGroup } from "./stat-group";

export const metadata: Metadata = { title: "Resumen" };

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = 6;
const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE }).slice(0, 7);
const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Solo conteos agregados. De los pacientes no se ve quiénes son (ni nombre ni email): solo
// cuántos hay y cuántos usan la app. Las profesionales se ven una por una en "Profesionales".
async function getUsageStats() {
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const since = new Date(now - (MONTHS * 31 + 1) * DAY);
  const pro = { role: "PROFESSIONAL" as const };
  // Las pacientes de ejemplo ("Sofía (DEMO)") no cuentan en las métricas.
  const pat = { role: "PATIENT" as const, NOT: { patientProfile: { isDemo: true } } };
  const real = { patient: { isDemo: false } };

  const [
    pros,
    pros7,
    pros30,
    prosUnverified,
    prosGoogle,
    patients,
    patients7,
    patients30,
    managed,
    activeLinks,
    entries,
    journal,
    cbt,
    assessments,
    appointments,
    signups,
    topics,
    tasksDone,
    feedbacks,
    payments,
    reminders,
    pushUsers,
    leads,
    leadsMailed,
    leadEmails,
    proSignups,
    recentPros,
  ] = await Promise.all([
    prisma.user.count({ where: pro }),
    prisma.user.count({ where: { ...pro, lastActiveAt: { gte: d7 } } }),
    prisma.user.count({ where: { ...pro, lastActiveAt: { gte: d30 } } }),
    prisma.professionalProfile.count({ where: { verifiedAt: null } }),
    prisma.user.count({ where: { ...pro, accounts: { some: { providerId: "google" } } } }),
    prisma.user.count({ where: pat }),
    prisma.user.count({ where: { ...pat, lastActiveAt: { gte: d7 } } }),
    prisma.user.count({ where: { ...pat, lastActiveAt: { gte: d30 } } }),
    prisma.patientProfile.count({ where: { userId: null } }),
    prisma.careLink.count({ where: { status: "ACTIVE", ...real } }),
    prisma.emotionEntry.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.journalEntry.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.cbtRecord.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.assessmentResponse.count({ where: { status: "COMPLETED", completedAt: { gte: d30 } } }),
    prisma.appointment.count({ where: { startsAt: { gte: d30, lte: new Date(now) } } }),
    prisma.user.findMany({
      where: {
        role: { in: ["PATIENT", "PROFESSIONAL"] },
        createdAt: { gte: since },
        NOT: { patientProfile: { isDemo: true } },
      },
      select: { role: true, createdAt: true },
    }),
    prisma.sessionTopic.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.task.count({ where: { completedAt: { gte: d30 }, ...real } }),
    prisma.feedback.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.payment.count({ where: { createdAt: { gte: d30 } } }),
    prisma.reminderSettings.count({ where: { enabled: true, user: pat } }),
    prisma.user.count({ where: { pushSubscriptions: { some: {} } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { signupLinkSentAt: { not: null } } }),
    prisma.lead.findMany({ select: { email: true } }),
    prisma.user.findMany({ where: pro, select: { createdAt: true } }),
    prisma.professionalProfile.findMany({
      where: { user: pro },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, displayName: true, createdAt: true, verifiedAt: true },
    }),
  ]);

  // Interesados que ya crearon su cuenta (mismo email).
  const leadSet = [...new Set(leadEmails.map((l) => l.email.trim().toLowerCase()))];
  const leadsWithAccount = leadSet.length
    ? await prisma.user.count({ where: { email: { in: leadSet }, role: { not: "PATIENT" } } })
    : 0;

  // Altas por mes (los últimos 6), separadas por rol.
  const months: { key: string; patients: number; pros: number }[] = [];
  const first = new Date();
  first.setUTCDate(15);
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - i, 15));
    months.push({ key: d.toISOString().slice(0, 7), patients: 0, pros: 0 });
  }
  for (const s of signups) {
    const row = months.find((m) => m.key === monthKey(s.createdAt));
    if (row) row[s.role === "PATIENT" ? "patients" : "pros"]++;
  }

  return {
    pros: {
      total: pros,
      active7: pros7,
      active30: pros30,
      unverified: prosUnverified,
      google: prosGoogle,
    },
    patients: { total: patients, active7: patients7, active30: patients30, managed },
    activeLinks,
    usage: {
      entries,
      journal,
      cbt,
      topics,
      assessments,
      tasksDone,
      feedbacks,
      appointments,
      payments,
    },
    notifications: { reminders, pushUsers },
    leads: { total: leads, mailed: leadsMailed, withAccount: leadsWithAccount },
    founders: proSignups.filter((u) => freeDaysLeft(u.createdAt) > 0).length,
    recentPros,
    months,
  };
}

export default async function AdminHome() {
  await requireAdmin();
  const s = await getUsageStats();

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Resumen"
        description="Cuánta gente usa Anclaje y cómo. Son números generales: desde acá no se ve ningún dato clínico ni quiénes son los pacientes."
      />

      {s.pros.unverified > 0 && (
        <Link
          href="/admin/profesionales"
          className="bg-accent text-accent-foreground flex items-center gap-3 rounded-2xl p-4 text-sm font-medium"
        >
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
          {s.pros.unverified === 1
            ? "Falta verificar la matrícula de 1 profesional (se dio de alta sola o cambió su matrícula)."
            : `Falta verificar la matrícula de ${s.pros.unverified} profesionales (se dieron de alta solas o cambiaron su matrícula).`}
        </Link>
      )}

      <StatGroup
        title="Profesionales"
        stats={[
          { label: "Cuentas", value: s.pros.total, hint: `${s.pros.google} entran con Google` },
          { label: "Activas esta semana", value: s.pros.active7, of: s.pros.total },
          { label: "Activas en 30 días", value: s.pros.active30, of: s.pros.total },
          {
            label: "Gratis para siempre",
            value: s.founders,
            hint: "Se sumaron en el lanzamiento",
          },
        ]}
      />

      <StatGroup
        title="Interesados (landing)"
        stats={[
          { label: "Dejaron sus datos", value: s.leads.total },
          { label: "Les mandaste el mail", value: s.leads.mailed, of: s.leads.total },
          { label: "Ya crearon su cuenta", value: s.leads.withAccount, of: s.leads.total },
        ]}
      />

      {s.recentPros.length > 0 && (
        <section aria-labelledby="recent-title" className="flex flex-col gap-3">
          <h2 id="recent-title" className="text-lg font-semibold">
            Últimas profesionales en sumarse
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {s.recentPros.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <Link
                      href={`/admin/profesionales/${p.id}`}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {p.displayName}
                    </Link>
                    <span className="text-muted-foreground flex items-center gap-2">
                      {!p.verifiedAt && <Badge>Sin verificar</Badge>}
                      {formatDate(p.createdAt)}
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
          {
            label: "Con la app",
            value: s.patients.total,
            hint: `${s.activeLinks} vínculos activos con una profesional`,
          },
          { label: "Activos esta semana", value: s.patients.active7, of: s.patients.total },
          { label: "Activos en 30 días", value: s.patients.active30, of: s.patients.total },
          {
            label: "Sin la app",
            value: s.patients.managed,
            hint: "Cargados por su profesional para agenda e historia",
          },
        ]}
      />

      <StatGroup
        title="Uso en los últimos 30 días"
        stats={[
          { label: "Rueda de emociones", value: s.usage.entries, hint: "Registros" },
          { label: "Diario", value: s.usage.journal, hint: "Entradas (privadas o compartidas)" },
          { label: "Autorregistros", value: s.usage.cbt },
          { label: "Temas para la sesión", value: s.usage.topics },
          { label: "Evaluaciones completadas", value: s.usage.assessments },
          { label: "Tareas hechas", value: s.usage.tasksDone },
          { label: "Devoluciones", value: s.usage.feedbacks, hint: "De profesionales a pacientes" },
          { label: "Turnos", value: s.usage.appointments, hint: "Agendados para estos días" },
          { label: "Cobros cargados", value: s.usage.payments, hint: "Solo la cantidad" },
        ]}
      />

      <StatGroup
        title="Avisos"
        stats={[
          {
            label: "Pacientes con recordatorio",
            value: s.notifications.reminders,
            of: s.patients.total,
            hint: "Para registrar cómo están",
          },
          {
            label: "Con avisos al celular",
            value: s.notifications.pushUsers,
            hint: "Pacientes y profesionales",
          },
        ]}
      />

      <section aria-labelledby="months-title" className="flex flex-col gap-3">
        <h2 id="months-title" className="text-lg font-semibold">
          Altas por mes
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left">
                <tr className="border-b">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Mes
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pacientes
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Profesionales
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...s.months].reverse().map((m) => (
                  <tr key={m.key} className="border-b last:border-0">
                    <td className="px-4 py-3 first-letter:uppercase">
                      {monthName.format(new Date(`${m.key}-15T12:00:00Z`))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.patients}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{m.pros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-xs">
          “Activo” es haber abierto la app al menos una vez en ese período. No se registra qué miró
          ni por cuánto tiempo.
        </p>
      </section>
    </div>
  );
}
