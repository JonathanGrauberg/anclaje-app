import "server-only";
import { linkedPatientsWhere } from "@/lib/access";
import { prisma } from "@/lib/db";

// Turnos. Del lado profesional, solo de sus pacientes con vínculo activo; del lado paciente, solo
// con profesionales con las que sigue vinculado.

/** Próximo turno (no cancelado) de cada paciente con esta profesional. */
export async function getNextAppointments(professionalId: string, patientIds: string[]) {
  if (patientIds.length === 0) return new Map<string, Date>();
  const rows = await prisma.appointment.findMany({
    where: {
      professionalId,
      patientId: { in: patientIds },
      status: "SCHEDULED",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    select: { patientId: true, startsAt: true },
  });
  const next = new Map<string, Date>();
  for (const r of rows) if (!next.has(r.patientId)) next.set(r.patientId, r.startsAt);
  return next;
}

/** Agenda de la profesional entre dos fechas (incluye cancelados, para que vea los avisos). */
export function getAgenda(professionalId: string, from: Date, to: Date) {
  return prisma.appointment.findMany({
    where: {
      professionalId,
      startsAt: { gte: from, lt: to },
      patient: linkedPatientsWhere(professionalId),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      durationMin: true,
      modality: true,
      place: true,
      status: true,
      cancelledBy: true,
      seriesId: true,
      patient: {
        select: {
          id: true,
          userId: true,
          displayName: true,
          contactEnc: true, // para el botón de WhatsApp (pacientes sin la app)
          user: { select: { name: true } },
        },
      },
    },
  });
}

export type AgendaItem = Awaited<ReturnType<typeof getAgenda>>[number];

/** Turnos que vienen del paciente (con profesionales vinculadas). */
export function getPatientAppointments(patientId: string, take = 20) {
  return prisma.appointment.findMany({
    where: {
      patientId,
      startsAt: { gte: new Date(Date.now() - 60 * 60_000) },
      professional: { links: { some: { patientId, status: "ACTIVE" } } },
    },
    orderBy: { startsAt: "asc" },
    take,
    select: {
      id: true,
      startsAt: true,
      durationMin: true,
      modality: true,
      place: true,
      status: true,
      cancelledBy: true,
      professional: { select: { displayName: true } },
    },
  });
}
