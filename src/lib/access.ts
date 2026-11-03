import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

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
