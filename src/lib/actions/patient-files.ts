"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { findLinkedPatient } from "@/lib/access";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify";
import { pushMessages } from "@/lib/push-messages";
import { professionalForAction } from "@/lib/session";
import { isValidKey, storage } from "@/lib/storage";
import { fail, firstIssue, ok, safe } from "./result";

// "Subir archivo" desde la ficha del paciente. Dos destinos:
// - para el paciente: va a la Biblioteca de la profesional y se le asigna (lo ve en la app);
// - solo para la profesional: queda en la ficha (PatientFile, título cifrado).

const schema = z.object({
  patientId: z.string().min(1).max(40),
  title: z.string().trim().min(1, "Poné un título").max(200),
  storageKey: z.string().max(200).refine(isValidKey, "Archivo inválido"),
  forPatient: z.boolean(),
});

export async function addPatientFile(input: z.input<typeof schema>) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, title, storageKey, forPatient } = parsed.data;
    const patient = await findLinkedPatient(professional.id, patientId);
    if (!patient) return fail("No tenés vínculo activo");

    if (forPatient) {
      if (!patient.userId) return fail("Este paciente no tiene la app: guardalo solo para vos.");
      if (!storageKey.startsWith("resources/")) return fail("Archivo inválido");
      const resource = await prisma.resource.create({
        data: {
          professionalId: professional.id,
          kind: storageKey.endsWith(".pdf") ? "PDF" : "IMAGE",
          title,
          storageKey,
          assignments: { create: { patientId } },
        },
        select: { id: true },
      });
      after(() => notifyPatient(patientId, "assignments", pushMessages.resource()));
      await audit({
        actorId: userId,
        action: "create",
        entityType: "ResourceAssignment",
        entityId: resource.id,
        patientId,
      });
      revalidatePath("/pro/biblioteca");
    } else {
      if (!storageKey.startsWith("files/")) return fail("Archivo inválido");
      const file = await prisma.patientFile.create({
        data: { patientId, professionalId: professional.id, titleEnc: encrypt(title), storageKey },
        select: { id: true },
      });
      await audit({
        actorId: userId,
        action: "create",
        entityType: "PatientFile",
        entityId: file.id,
        patientId,
      });
    }
    revalidatePath(`/pro/pacientes/${patientId}`);
    return ok(undefined);
  });
}

export async function deletePatientFile(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const file = await prisma.patientFile.findFirst({
      where: { id: String(id), professionalId: professional.id },
      select: { id: true, patientId: true, storageKey: true },
    });
    if (!file) return fail("No encontramos ese archivo");
    await prisma.patientFile.delete({ where: { id: file.id } });
    await storage().delete(file.storageKey);
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "PatientFile",
      entityId: file.id,
      patientId: file.patientId,
    });
    revalidatePath(`/pro/pacientes/${file.patientId}`);
    return ok(undefined);
  });
}
