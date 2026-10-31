import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { buildEmotionIndex } from "@/lib/emotions/tree";
import { computePatterns, scoreSeries } from "@/lib/patterns";
import { getEmotionTree } from "./common";

export const RANGES = [
  { days: 30, label: "30 días" },
  { days: 90, label: "3 meses" },
  { days: 365, label: "1 año" },
] as const;

export function parseRange(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return RANGES.find((r) => r.days === n)?.days ?? 30;
}

/**
 * Patrones de la rueda. `where` lo arma quien llama: el paciente pasa los suyos (todos), la
 * profesional pasa `sharedEmotionWhere(...)` + patientId (solo lo compartido).
 */
export async function getPatterns(where: Prisma.EmotionEntryWhereInput, days: number) {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86_400_000);
  const [entries, tree] = await Promise.all([
    prisma.emotionEntry.findMany({
      where: { AND: [where, { occurredAt: { gte: since } }] },
      select: { occurredAt: true, items: { select: { nodeId: true, intensity: true } } },
      orderBy: { occurredAt: "asc" },
    }),
    getEmotionTree(),
  ]);
  return computePatterns(entries, buildEmotionIndex(tree), days, now);
}

/** Evolución de puntajes: solo respuestas de evaluaciones que asignó esta profesional. */
export async function getScoreSeries(professionalId: string, patientId: string) {
  const responses = await prisma.assessmentResponse.findMany({
    where: {
      patientId,
      status: "COMPLETED",
      assignment: { professionalId },
      totalScore: { not: null },
    },
    select: {
      completedAt: true,
      totalScore: true,
      interpretation: true,
      version: { select: { assessment: { select: { id: true, title: true } } } },
    },
  });
  return scoreSeries(
    responses
      .filter((r) => r.completedAt)
      .map((r) => ({
        completedAt: r.completedAt!,
        totalScore: r.totalScore,
        interpretation: r.interpretation,
        assessmentId: r.version.assessment.id,
        title: r.version.assessment.title,
      })),
  );
}
