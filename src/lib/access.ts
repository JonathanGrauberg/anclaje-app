import "server-only";
import type { Prisma } from "@/generated/prisma/client";

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
