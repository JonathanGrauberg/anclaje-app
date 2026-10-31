import "server-only";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { buildEmotionIndex, pathLabel } from "@/lib/emotions/tree";
import { getEmotionTree } from "@/lib/queries/common";

// Exportación de datos del paciente (derecho de acceso, Ley 25.326 art. 14).
// Incluye todo lo que el paciente escribió o recibió en la app, descifrado y con nombres legibles.
// No incluye: notas clínicas (son de la profesional) ni resultados externos (los carga ella y el
// paciente no los ve en la app). Ver docs/DECISIONES.md.

export const EXPORT_FORMAT = "sentir.patient-export";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function buildPatientExport(patientId: string) {
  const [patient, tree] = await Promise.all([
    prisma.patientProfile.findUniqueOrThrow({
      where: { id: patientId },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        sharingDefaults: true,
        links: { include: { professional: { select: { displayName: true } } } },
        emotionEntries: { include: { items: true }, orderBy: { occurredAt: "asc" } },
        journalEntries: { include: { emotions: true }, orderBy: { createdAt: "asc" } },
        cbtRecords: {
          include: { emotions: true, distortions: { include: { distortion: true } } },
          orderBy: { occurredAt: "asc" },
        },
        sessionTopics: { orderBy: { createdAt: "asc" } },
        feedbacks: {
          include: { professional: { select: { displayName: true } } },
          orderBy: { createdAt: "asc" },
        },
        copingPlan: { include: { cards: { orderBy: { sortOrder: "asc" } } } },
        tasks: {
          include: { professional: { select: { displayName: true } } },
          orderBy: { createdAt: "asc" },
        },
        resourceAssignments: { include: { resource: { select: { title: true, kind: true } } } },
        responses: {
          where: { status: "COMPLETED" },
          include: {
            answers: { include: { question: { include: { options: true } } } },
            version: { select: { version: true, assessment: { select: { title: true } } } },
          },
          orderBy: { completedAt: "asc" },
        },
      },
    }),
    getEmotionTree(),
  ]);
  const index = buildEmotionIndex(tree);
  const emotion = (id: string) => pathLabel(index, id) || id;
  const reminder = await prisma.reminderSettings.findUnique({ where: { userId: patient.userId } });

  return {
    format: EXPORT_FORMAT,
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      name: patient.user.name,
      displayName: patient.displayName,
      email: patient.user.email,
      createdAt: iso(patient.user.createdAt),
    },
    professionals: patient.links.map((l) => ({
      name: l.professional.displayName,
      status: l.status,
      linkedAt: iso(l.createdAt),
      consentVersion: l.consentVersion,
      consentAcceptedAt: iso(l.consentAcceptedAt),
    })),
    sharingDefaults: patient.sharingDefaults && {
      journal: patient.sharingDefaults.journal,
      emotions: patient.sharingDefaults.emotions,
      cbt: patient.sharingDefaults.cbt,
    },
    reminders: reminder && { enabled: reminder.enabled, time: reminder.time, days: reminder.days },
    emotionEntries: patient.emotionEntries.map((e) => ({
      occurredAt: iso(e.occurredAt),
      emotions: e.items.map((i) => ({ emotion: emotion(i.nodeId), intensity: i.intensity })),
      bodyZones: e.bodyZones,
      note: decryptOptional(e.noteEnc),
      visibility: e.visibility,
    })),
    journal: patient.journalEntries.map((j) => ({
      createdAt: iso(j.createdAt),
      updatedAt: iso(j.updatedAt),
      title: decryptOptional(j.titleEnc),
      body: decrypt(j.bodyEnc),
      emotions: j.emotions.map((x) => emotion(x.nodeId)),
      draft: j.isDraft,
      visibility: j.visibility,
    })),
    cbtRecords: patient.cbtRecords.map((c) => ({
      occurredAt: iso(c.occurredAt),
      status: c.status,
      situation: decryptOptional(c.situationEnc),
      thought: decryptOptional(c.thoughtEnc),
      beliefBefore: c.beliefBefore,
      emotions: c.emotions.map((x) => ({
        emotion: emotion(x.nodeId),
        intensityBefore: x.intensityBefore,
        intensityAfter: x.intensityAfter,
      })),
      distortions: c.distortions.map((d) => d.distortion.name),
      bodyZones: c.bodyZones,
      behavior: decryptOptional(c.behaviorEnc),
      alternative: decryptOptional(c.alternativeEnc),
      beliefAfter: c.beliefAfter,
      visibility: c.visibility,
    })),
    sessionTopics: patient.sessionTopics.map((t) => ({
      createdAt: iso(t.createdAt),
      text: decrypt(t.textEnc),
      discussedAt: iso(t.discussedAt),
    })),
    feedbackReceived: patient.feedbacks.map((f) => ({
      createdAt: iso(f.createdAt),
      from: f.professional.displayName,
      about: f.targetType,
      body: decrypt(f.bodyEnc),
      discussInSession: f.discussInSession,
    })),
    copingPlan: (patient.copingPlan?.cards ?? []).map((c) => ({
      type: c.type,
      title: c.title,
      body: c.body,
      phone: c.phone,
      author: c.author,
    })),
    tasks: patient.tasks.map((t) => ({
      title: t.title,
      description: t.description,
      from: t.professional.displayName,
      dueAt: iso(t.dueAt),
      completedAt: iso(t.completedAt),
      myComment: decryptOptional(t.patientCommentEnc),
    })),
    materials: patient.resourceAssignments.map((r) => ({
      title: r.resource.title,
      kind: r.resource.kind,
      assignedAt: iso(r.assignedAt),
      viewedAt: iso(r.viewedAt),
    })),
    assessments: patient.responses.map((r) => ({
      title: r.version.assessment.title,
      version: r.version.version,
      completedAt: iso(r.completedAt),
      totalScore: r.totalScore,
      interpretation: r.interpretation,
      answers: r.answers
        .sort((a, b) => a.question.sortOrder - b.question.sortOrder)
        .map((a) => ({
          question: a.question.text,
          answer:
            a.optionIds.length > 0
              ? a.question.options
                  .filter((o) => a.optionIds.includes(o.id))
                  .map((o) => o.label)
                  .join(", ")
              : (decryptOptional(a.textEnc) ??
                (a.valueDate ? iso(a.valueDate)!.slice(0, 10) : null) ??
                (a.valueNumber !== null ? String(a.valueNumber) : null)),
        })),
    })),
  };
}

export type PatientExport = Awaited<ReturnType<typeof buildPatientExport>>;
