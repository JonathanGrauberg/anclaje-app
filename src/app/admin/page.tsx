import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { TIME_ZONE } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

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
  ]);

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
    usage: { entries: entries + journal + cbt, assessments, appointments },
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
        ]}
      />

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
          { label: "Registros", value: s.usage.entries, hint: "Rueda, diario y autorregistros" },
          { label: "Evaluaciones completadas", value: s.usage.assessments },
          { label: "Turnos", value: s.usage.appointments, hint: "Agendados para estos días" },
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

function StatGroup({
  title,
  stats,
}: {
  title: string;
  stats: { label: string; value: number; of?: number; hint?: string }[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label}>
            <CardContent className="flex flex-col gap-1">
              <p className="text-muted-foreground text-sm">{st.label}</p>
              <p className="text-3xl font-semibold tabular-nums">
                {st.value}
                {st.of !== undefined && (
                  <span className="text-muted-foreground text-base font-normal"> de {st.of}</span>
                )}
              </p>
              {st.hint && <p className="text-muted-foreground text-xs">{st.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
