import "server-only";
import { prisma } from "@/lib/db";

export async function hasActiveLink(patientId: string) {
  const n = await prisma.careLink.count({ where: { patientId, status: "ACTIVE" } });
  return n > 0;
}

/** Asignaciones de evaluaciones que el paciente puede responder ahora. */
export function dueAssignmentsWhere(patientId: string, now = new Date()) {
  return {
    patientId,
    active: true,
    // Solo de profesionales con vínculo activo.
    professional: { links: { some: { patientId, status: "ACTIVE" as const } } },
    OR: [{ nextDueAt: null }, { nextDueAt: { lte: now } }],
  };
}
