import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { matchDuplicates, type AppForMatch } from "@/lib/duplicate-patients";
import { patientName } from "@/lib/patients";

// Única fuente de verdad de "qué puede ver una profesional".
// Solo entradas COMPARTIDAS (y terminadas) de pacientes con vínculo ACTIVO con ella.
// Usá siempre estos helpers en las queries del lado profesional.

const activeLinkTo = (professionalId: string) => ({
  links: { some: { professionalId, status: "ACTIVE" as const } },
});

export function sharedJournalWhere(professionalId: string): Prisma.JournalEntryWhereInput {
  return { visibility: "SHARED", isDraft: false, patient: activeLinkTo(professionalId) };
}

export function sharedEmotionWhere(professionalId: string): Prisma.EmotionEntryWhereInput {
  return { visibility: "SHARED", patient: activeLinkTo(professionalId) };
}

export function sharedCbtWhere(professionalId: string): Prisma.CbtRecordWhereInput {
  return { visibility: "SHARED", status: "COMPLETE", patient: activeLinkTo(professionalId) };
}

/** Temas de "para la próxima sesión": los ve la profesional vinculada. */
export function sessionTopicsWhere(professionalId: string): Prisma.SessionTopicWhereInput {
  return { patient: activeLinkTo(professionalId) };
}

export function linkedPatientsWhere(professionalId: string): Prisma.PatientProfileWhereInput {
  return activeLinkTo(professionalId);
}

/** Paciente con vínculo ACTIVO con esta profesional, o null. */
export async function findLinkedPatient(professionalId: string, patientId: string) {
  return prisma.patientProfile.findFirst({
    where: { id: patientId, ...activeLinkTo(professionalId) },
    select: {
      id: true,
      userId: true,
      displayName: true,
      contactEnc: true,
      isDemo: true,
      createdAt: true,
      user: { select: { name: true, email: true, phoneEnc: true } },
      links: {
        where: { professionalId, status: "ACTIVE" },
        select: { createdAt: true, consentVersion: true, consentAcceptedAt: true },
      },
    },
  });
}

export type LinkedPatient = NonNullable<Awaited<ReturnType<typeof findLinkedPatient>>>;

/**
 * Entrada compartida visible para la profesional. Devuelve su patientId o null.
 * Se usa antes de escribir una devolución: nunca sobre algo privado o de otro paciente.
 */
export async function findSharedTarget(
  professionalId: string,
  type: "JOURNAL" | "EMOTION" | "CBT",
  id: string,
) {
  const select = { patientId: true } as const;
  const found =
    type === "JOURNAL"
      ? await prisma.journalEntry.findFirst({
          where: { id, ...sharedJournalWhere(professionalId) },
          select,
        })
      : type === "EMOTION"
        ? await prisma.emotionEntry.findFirst({
            where: { id, ...sharedEmotionWhere(professionalId) },
            select,
          })
        : await prisma.cbtRecord.findFirst({
            where: { id, ...sharedCbtWhere(professionalId) },
            select,
          });
  return found?.patientId ?? null;
}

/**
 * Fichas repetidas de esta profesional: paciente "sin la app" → paciente vinculado con la app
 * que parece ser la misma persona (mismo email o nombre completo). Ver duplicate-patients.ts.
 */
export async function findDuplicatePatients(professionalId: string) {
  const patients = await prisma.patientProfile.findMany({
    where: linkedPatientsWhere(professionalId),
    select: {
      id: true,
      userId: true,
      displayName: true,
      contactEnc: true,
      user: { select: { name: true, email: true } },
    },
  });
  const managed = patients
    .filter((p) => !p.userId)
    .map((p) => ({ id: p.id, name: patientName(p), contact: decryptOptional(p.contactEnc) }));
  if (managed.length === 0) return new Map<string, AppForMatch>();
  const app = patients.flatMap((p) =>
    p.user ? [{ id: p.id, name: patientName(p), email: p.user.email }] : [],
  );
  return matchDuplicates(managed, app);
}
