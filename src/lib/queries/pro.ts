import "server-only";
import type { ShareIntention } from "@/generated/prisma/client";
import {
  linkedPatientsWhere,
  sessionTopicsWhere,
  sharedCbtWhere,
  sharedEmotionWhere,
  sharedJournalWhere,
} from "@/lib/access";
import { HIGH_INTENSITY } from "@/lib/constants";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { toPlainText } from "@/lib/markdown";
import type { FeedbackTarget } from "@/lib/validation/pro";

// Consultas del lado profesional. Todas pasan por los filtros de src/lib/access.ts.

export type TimelineKind = "diario" | "rueda" | "autorregistro";

export const KIND_TO_TARGET: Record<TimelineKind, FeedbackTarget> = {
  diario: "JOURNAL",
  rueda: "EMOTION",
  autorregistro: "CBT",
};

export const TARGET_TO_KIND: Record<FeedbackTarget, TimelineKind> = {
  JOURNAL: "diario",
  EMOTION: "rueda",
  CBT: "autorregistro",
};

const DAY = 86_400_000;

/** Pacientes vinculados + lo que "pide atención" para cada uno. */
export async function getPatientsWithAttention(pid: string, now = new Date()) {
  const patients = await prisma.patientProfile.findMany({
    where: linkedPatientsWhere(pid),
    select: {
      id: true,
      displayName: true,
      user: { select: { name: true } },
      links: { where: { professionalId: pid }, select: { createdAt: true } },
    },
  });
  const ids = patients.map((p) => p.id);
  if (ids.length === 0) return [];

  const wantsFeedback = { intention: "WANT_FEEDBACK" as ShareIntention, patientId: { in: ids } };
  const [journals, emotions, cbts, feedbacks, overdue, topics, highItems, lastShared] =
    await Promise.all([
      prisma.journalEntry.findMany({
        where: { ...sharedJournalWhere(pid), ...wantsFeedback },
        select: { id: true, patientId: true },
      }),
      prisma.emotionEntry.findMany({
        where: { ...sharedEmotionWhere(pid), ...wantsFeedback },
        select: { id: true, patientId: true },
      }),
      prisma.cbtRecord.findMany({
        where: { ...sharedCbtWhere(pid), ...wantsFeedback },
        select: { id: true, patientId: true },
      }),
      prisma.feedback.findMany({
        where: { professionalId: pid, patientId: { in: ids } },
        select: { targetId: true },
      }),
      prisma.task.groupBy({
        by: ["patientId"],
        where: {
          professionalId: pid,
          completedAt: null,
          dueAt: { lt: now },
          patientId: { in: ids },
        },
        _count: true,
      }),
      prisma.sessionTopic.groupBy({
        by: ["patientId"],
        where: { ...sessionTopicsWhere(pid), discussedAt: null, patientId: { in: ids } },
        _count: true,
      }),
      // Alertas: intensidades altas en registros compartidos de los últimos 7 días.
      prisma.emotionEntry.findMany({
        where: {
          ...sharedEmotionWhere(pid),
          patientId: { in: ids },
          occurredAt: { gte: new Date(now.getTime() - 7 * DAY) },
          items: { some: { intensity: { gte: HIGH_INTENSITY } } },
        },
        select: { patientId: true, occurredAt: true },
        orderBy: { occurredAt: "desc" },
      }),
      Promise.all(
        ids.map((id) =>
          Promise.all([
            prisma.journalEntry.findFirst({
              where: { ...sharedJournalWhere(pid), patientId: id },
              orderBy: { sharedAt: "desc" },
              select: { sharedAt: true },
            }),
            prisma.emotionEntry.findFirst({
              where: { ...sharedEmotionWhere(pid), patientId: id },
              orderBy: { occurredAt: "desc" },
              select: { occurredAt: true },
            }),
            prisma.cbtRecord.findFirst({
              where: { ...sharedCbtWhere(pid), patientId: id },
              orderBy: { updatedAt: "desc" },
              select: { updatedAt: true },
            }),
          ]).then(([j, e, c]) => {
            const dates = [j?.sharedAt, e?.occurredAt, c?.updatedAt].filter(Boolean) as Date[];
            return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
          }),
        ),
      ),
    ]);

  const answered = new Set(feedbacks.map((f) => f.targetId));
  const pending = new Map<string, number>();
  for (const e of [...journals, ...emotions, ...cbts]) {
    if (!answered.has(e.id)) pending.set(e.patientId, (pending.get(e.patientId) ?? 0) + 1);
  }
  const countBy = (rows: { patientId: string; _count: number }[]) =>
    new Map(rows.map((r) => [r.patientId, r._count]));
  const overdueBy = countBy(overdue);
  const topicsBy = countBy(topics);
  const highBy = new Map<string, Date>();
  for (const h of highItems) if (!highBy.has(h.patientId)) highBy.set(h.patientId, h.occurredAt);

  return patients
    .map((p, i) => ({
      id: p.id,
      name: p.displayName ?? p.user.name,
      linkedAt: p.links[0]?.createdAt ?? null,
      lastSharedAt: lastShared[i],
      pendingFeedback: pending.get(p.id) ?? 0,
      overdueTasks: overdueBy.get(p.id) ?? 0,
      openTopics: topicsBy.get(p.id) ?? 0,
      highIntensityAt: highBy.get(p.id) ?? null,
    }))
    .sort(
      (a, b) =>
        Number(!!b.highIntensityAt) - Number(!!a.highIntensityAt) ||
        b.pendingFeedback + b.overdueTasks - (a.pendingFeedback + a.overdueTasks) ||
        a.name.localeCompare(b.name, "es"),
    );
}

export type PatientAttention = Awaited<ReturnType<typeof getPatientsWithAttention>>[number];

export type TimelineItem = {
  kind: TimelineKind;
  id: string;
  at: Date;
  intention: ShareIntention | null;
  title: string;
  preview: string;
  emotions: { nodeId: string; intensity: number | null }[];
  feedbackCount: number;
  high: boolean;
};

/** Línea de tiempo de lo compartido por un paciente (solo lo que la profesional puede ver). */
export async function getTimeline(
  pid: string,
  patientId: string,
  filter: { kind?: TimelineKind; intention?: ShareIntention },
  take = 60,
): Promise<TimelineItem[]> {
  const intention = filter.intention ? { intention: filter.intention } : {};
  const want = (k: TimelineKind) => !filter.kind || filter.kind === k;

  const [journals, emotions, cbts, feedbacks] = await Promise.all([
    want("diario")
      ? prisma.journalEntry.findMany({
          where: { ...sharedJournalWhere(pid), patientId, ...intention },
          orderBy: { sharedAt: "desc" },
          take,
          include: { emotions: { select: { nodeId: true } } },
        })
      : [],
    want("rueda")
      ? prisma.emotionEntry.findMany({
          where: { ...sharedEmotionWhere(pid), patientId, ...intention },
          orderBy: { occurredAt: "desc" },
          take,
          include: { items: { orderBy: { intensity: "desc" } } },
        })
      : [],
    want("autorregistro")
      ? prisma.cbtRecord.findMany({
          where: { ...sharedCbtWhere(pid), patientId, ...intention },
          orderBy: { occurredAt: "desc" },
          take,
          include: { emotions: true },
        })
      : [],
    prisma.feedback.groupBy({
      by: ["targetId"],
      where: { professionalId: pid, patientId },
      _count: true,
    }),
  ]);
  const fbCount = new Map(feedbacks.map((f) => [f.targetId, f._count]));
  const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

  const items: TimelineItem[] = [
    ...journals.map((j) => ({
      kind: "diario" as const,
      id: j.id,
      at: j.sharedAt ?? j.updatedAt,
      intention: j.intention,
      title: decryptOptional(j.titleEnc) || "Entrada del diario",
      preview: clip(toPlainText(decrypt(j.bodyEnc))),
      emotions: j.emotions.map((e) => ({ nodeId: e.nodeId, intensity: null })),
      feedbackCount: fbCount.get(j.id) ?? 0,
      high: false,
    })),
    ...emotions.map((e) => ({
      kind: "rueda" as const,
      id: e.id,
      at: e.occurredAt,
      intention: e.intention,
      title: "Registro de la rueda",
      preview: clip(decryptOptional(e.noteEnc) ?? ""),
      emotions: e.items.map((i) => ({ nodeId: i.nodeId, intensity: i.intensity })),
      feedbackCount: fbCount.get(e.id) ?? 0,
      high: e.items.some((i) => i.intensity >= HIGH_INTENSITY),
    })),
    ...cbts.map((c) => ({
      kind: "autorregistro" as const,
      id: c.id,
      at: c.occurredAt,
      intention: c.intention,
      title: "Autorregistro",
      preview: clip(decryptOptional(c.thoughtEnc) ?? ""),
      emotions: c.emotions.map((e) => ({ nodeId: e.nodeId, intensity: e.intensityBefore })),
      feedbackCount: fbCount.get(c.id) ?? 0,
      high: c.emotions.some((e) => e.intensityBefore >= HIGH_INTENSITY),
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}

/** Devoluciones de esta profesional sobre una entrada, descifradas. */
export async function getOwnFeedbacks(pid: string, targetType: FeedbackTarget, targetId: string) {
  const rows = await prisma.feedback.findMany({
    where: { professionalId: pid, targetType, targetId },
    orderBy: { createdAt: "asc" },
    include: { resource: { select: { id: true, title: true } } },
  });
  return rows.map((f) => ({
    id: f.id,
    body: decrypt(f.bodyEnc),
    discussInSession: f.discussInSession,
    readAt: f.readAt,
    createdAt: f.createdAt,
    resource: f.resource,
  }));
}
