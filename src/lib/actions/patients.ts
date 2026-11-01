"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { createManagedPatient, findManagedPatient } from "@/lib/managed-patients";
import { professionalForAction } from "@/lib/session";
import {
  managedPatientSchema,
  updateManagedPatientSchema,
  type ManagedPatientInput,
  type UpdateManagedPatientInput,
} from "@/lib/validation/patients";
import { fail, firstIssue, ok, safe } from "./result";

/** La profesional carga un paciente que no usa la app (para la agenda y la historia clínica). */
export async function addManagedPatient(input: ManagedPatientInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = managedPatientSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const patient = await prisma.$transaction((tx) =>
      createManagedPatient(tx, professional.id, parsed.data),
    );
    await audit({
      actorId: userId,
      action: "create",
      entityType: "ManagedPatient",
      entityId: patient.id,
      patientId: patient.id,
    });
    revalidatePath("/pro", "layout");
    return ok({ id: patient.id });
  });
}

/** Cambiar nombre o contacto de un paciente sin la app. */
export async function updateManagedPatient(input: UpdateManagedPatientInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = updateManagedPatientSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, name, contact } = parsed.data;
    const patient = await findManagedPatient(prisma, professional.id, patientId);
    if (!patient) return fail("No encontramos ese paciente");
    await prisma.patientProfile.update({
      where: { id: patient.id },
      data: { displayName: name, contactEnc: contact ? encrypt(contact) : null },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "ManagedPatient",
      entityId: patient.id,
      patientId: patient.id,
    });
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

/**
 * Dar de baja a un paciente sin la app. Si no tiene historia clínica cargada se borra del todo
 * (por ejemplo, uno de prueba). Si tiene, se archiva: se conserva (Ley 26.529) y se puede
 * reactivar. En los dos casos se cancelan sus turnos futuros.
 */
export async function removeManagedPatient(patientId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (typeof patientId !== "string" || patientId.length > 40) return fail("Paciente inválido");
    const patient = await findManagedPatient(prisma, professional.id, patientId);
    if (!patient) return fail("No encontramos ese paciente");

    const [notes, record] = await Promise.all([
      prisma.clinicalNote.count({ where: { patientId } }),
      prisma.clinicalRecord.findFirst({ where: { patientId }, select: { id: true } }),
    ]);
    const archived = notes > 0 || !!record;
    if (archived) {
      const now = new Date();
      await prisma.$transaction([
        prisma.careLink.updateMany({
          where: { patientId, professionalId: professional.id },
          data: { status: "REVOKED", revokedAt: now },
        }),
        prisma.appointment.updateMany({
          where: { patientId, status: "SCHEDULED", startsAt: { gte: now } },
          data: { status: "CANCELLED", cancelledBy: "PROFESSIONAL", cancelledAt: now },
        }),
      ]);
    } else {
      await prisma.patientProfile.delete({ where: { id: patientId } });
    }
    await audit({
      actorId: userId,
      action: archived ? "update" : "delete",
      entityType: "ManagedPatient",
      entityId: patientId,
      patientId: archived ? patientId : undefined,
      meta: archived ? { status: "REVOKED" } : undefined,
    });
    revalidatePath("/pro", "layout");
    return ok({ archived });
  });
}

/** Volver a activar un paciente sin la app que estaba dado de baja. */
export async function restoreManagedPatient(patientId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (typeof patientId !== "string" || patientId.length > 40) return fail("Paciente inválido");
    const res = await prisma.careLink.updateMany({
      where: {
        patientId,
        professionalId: professional.id,
        status: "REVOKED",
        patient: { userId: null, managedById: professional.id },
      },
      data: { status: "ACTIVE", revokedAt: null },
    });
    if (res.count === 0) return fail("No encontramos ese paciente");
    await audit({
      actorId: userId,
      action: "update",
      entityType: "ManagedPatient",
      entityId: patientId,
      patientId,
      meta: { status: "ACTIVE" },
    });
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}
