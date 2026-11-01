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
