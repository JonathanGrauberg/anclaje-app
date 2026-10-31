import "server-only";
import type { EntryType } from "@/generated/prisma/client";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";

// Devoluciones vistas desde el paciente (siempre filtradas por su patientId).

const include = {
  professional: { select: { displayName: true } },
  resource: { select: { id: true, title: true, url: true } },
} as const;

type Row = Awaited<ReturnType<typeof findRows>>[number];
const findRows = (where: { patientId: string; targetType?: EntryType; targetId?: string }) =>
  prisma.feedback.findMany({ where, orderBy: { createdAt: "desc" }, include, take: 100 });

const toDTO = (f: Row) => ({
  id: f.id,
  body: decrypt(f.bodyEnc),
  from: f.professional.displayName,
  discussInSession: f.discussInSession,
  createdAt: f.createdAt,
  unread: f.readAt === null,
  targetType: f.targetType,
  targetId: f.targetId,
  resource: f.resource,
});
export type PatientFeedback = ReturnType<typeof toDTO>;

/** Devoluciones del paciente y las marca como leídas (las está viendo ahora). */
export async function readPatientFeedbacks(
  patientId: string,
  target?: { type: EntryType; id: string },
) {
  const rows = await findRows({ patientId, targetType: target?.type, targetId: target?.id });
  const unread = rows.filter((r) => r.readAt === null).map((r) => r.id);
  if (unread.length) {
    await prisma.feedback.updateMany({
      where: { id: { in: unread }, patientId },
      data: { readAt: new Date() },
    });
  }
  return rows.map(toDTO);
}

export function countUnreadFeedback(patientId: string) {
  return prisma.feedback.count({ where: { patientId, readAt: null } });
}
