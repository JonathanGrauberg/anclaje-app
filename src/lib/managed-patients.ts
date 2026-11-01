import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { encrypt } from "@/lib/crypto";

// Pacientes "sin la app": los carga la profesional para la agenda y la historia clínica.
// No tienen cuenta (userId null). Si después aceptan una invitación, sus datos pasan a su
// cuenta real con `mergeManagedPatient` y el perfil provisorio se borra.

type Tx = Prisma.TransactionClient;

/** Crea el paciente y su vínculo activo con la profesional (sin consentimiento todavía). */
export async function createManagedPatient(
  tx: Tx,
  professionalId: string,
  data: { name: string; contact?: string },
) {
  return tx.patientProfile.create({
    data: {
      displayName: data.name,
      contactEnc: data.contact ? encrypt(data.contact) : null,
      managedById: professionalId,
      links: { create: { professionalId } },
    },
    select: { id: true, displayName: true },
  });
}

/** Paciente sin la app que cargó esta profesional, o null. */
export async function findManagedPatient(tx: Tx, professionalId: string, patientId: string) {
  return tx.patientProfile.findFirst({
    where: {
      id: patientId,
      userId: null,
      managedById: professionalId,
      links: { some: { professionalId, status: "ACTIVE" } },
    },
    select: { id: true, displayName: true, contactEnc: true },
  });
}

const RECORD_FIELDS = [
  "reasonEnc",
  "historyEnc",
  "medicationEnc",
  "diagnosisEnc",
  "planEnc",
  "emergencyContactEnc",
] as const;

/**
 * Pasa todo lo que la profesional cargó del paciente sin la app (turnos, historia clínica,
 * evolución, tareas, etc.) al perfil real del paciente que aceptó la invitación, y borra el
 * perfil provisorio. Se llama dentro de la transacción que acepta la invitación.
 */
export async function mergeManagedPatient(
  tx: Tx,
  managedId: string,
  professionalId: string,
  targetId: string,
) {
  if (managedId === targetId) return false;
  const managed = await findManagedPatient(tx, professionalId, managedId);
  if (!managed) return false;

  const move = { where: { patientId: managedId }, data: { patientId: targetId } };
  await tx.appointment.updateMany(move);
  await tx.clinicalNote.updateMany(move);
  await tx.externalResult.updateMany(move);
  await tx.task.updateMany(move);
  await tx.assessmentAssignment.updateMany(move);
  await tx.feedback.updateMany(move);
  await tx.auditLog.updateMany(move);

  // Recursos: uno por paciente; si ya lo tenía asignado, queda el de la cuenta real.
  const already = await tx.resourceAssignment.findMany({
    where: { patientId: targetId },
    select: { resourceId: true },
  });
  await tx.resourceAssignment.updateMany({
    where: { patientId: managedId, resourceId: { notIn: already.map((r) => r.resourceId) } },
    data: { patientId: targetId },
  });

  // Ficha: una por profesional y paciente. Si ya existía, se completan los campos vacíos.
  const key = (patientId: string) => ({ professionalId_patientId: { professionalId, patientId } });
  const [from, to] = await Promise.all([
    tx.clinicalRecord.findUnique({ where: key(managedId) }),
    tx.clinicalRecord.findUnique({ where: key(targetId) }),
  ]);
  if (from && !to) {
    await tx.clinicalRecord.update({ where: { id: from.id }, data: { patientId: targetId } });
  } else if (from && to) {
    const data: Prisma.ClinicalRecordUpdateInput = {
      treatmentStartedAt: to.treatmentStartedAt ?? from.treatmentStartedAt,
    };
    for (const f of RECORD_FIELDS) data[f] = to[f] ?? from[f];
    await tx.clinicalRecord.update({ where: { id: to.id }, data });
  }

  await tx.patientProfile.delete({ where: { id: managedId } });
  return true;
}
