import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Resumen" };

// Solo conteos agregados: el admin no ve datos clínicos ni de qué paciente es cada cosa.
async function getUsageStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [patients, professionals, activeLinks, wheel, journal, cbt, assessments, newPatients] =
    await Promise.all([
      prisma.patientProfile.count(),
      prisma.professionalProfile.count(),
      prisma.careLink.count({ where: { status: "ACTIVE" } }),
      prisma.emotionEntry.count({ where: { createdAt: { gte: since } } }),
      prisma.journalEntry.count({ where: { createdAt: { gte: since } } }),
      prisma.cbtRecord.count({ where: { createdAt: { gte: since } } }),
      prisma.assessmentResponse.count({
        where: { status: "COMPLETED", completedAt: { gte: since } },
      }),
      prisma.patientProfile.count({ where: { createdAt: { gte: since } } }),
    ]);
  return { patients, professionals, activeLinks, wheel, journal, cbt, assessments, newPatients };
}

export default async function AdminHome() {
  await requireAdmin();
  const { patients, professionals, activeLinks, wheel, journal, cbt, assessments, newPatients } =
    await getUsageStats();
  const stats = [
    { label: "Pacientes", value: patients, hint: `${newPatients} nuevos en 30 días` },
    { label: "Profesionales", value: professionals },
    { label: "Vínculos activos", value: activeLinks },
    {
      label: "Registros (30 días)",
      value: wheel + journal + cbt,
      hint: "rueda, diario y autorregistros",
    },
    { label: "Evaluaciones completadas (30 días)", value: assessments },
  ];

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Números generales de uso. Desde acá no se ve ningún dato clínico."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-1">
              <p className="text-muted-foreground text-sm">{s.label}</p>
              <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              {s.hint && <p className="text-muted-foreground text-xs">{s.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
