import "server-only";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";

/** Autorregistro propio del paciente, descifrado. null si no es suyo. */
export async function getOwnCbtRecord(id: string, patientId: string) {
  const r = await prisma.cbtRecord.findFirst({
    where: { id, patientId },
    include: {
      distortions: { select: { distortionId: true } },
      emotions: { select: { nodeId: true, intensityBefore: true, intensityAfter: true } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    currentStep: r.currentStep,
    occurredAt: r.occurredAt,
    situation: decryptOptional(r.situationEnc) ?? "",
    thought: decryptOptional(r.thoughtEnc) ?? "",
    beliefBefore: r.beliefBefore,
    distortionIds: r.distortions.map((d) => d.distortionId),
    emotions: r.emotions,
    bodyZones: r.bodyZones,
    behavior: decryptOptional(r.behaviorEnc) ?? "",
    alternative: decryptOptional(r.alternativeEnc) ?? "",
    beliefAfter: r.beliefAfter,
    visibility: r.visibility,
    intention: r.intention,
  };
}

export type CbtRecordDTO = NonNullable<Awaited<ReturnType<typeof getOwnCbtRecord>>>;
