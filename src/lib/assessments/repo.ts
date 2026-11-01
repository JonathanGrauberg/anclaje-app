import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AssessmentDoc } from "@/lib/validation/assessment";

// Traducción entre el documento de evaluación y las tablas. Las claves del documento se usan como
// id de Question / QuestionOption / Subscale, así las respuestas guardan esas mismas claves.

type Tx = Prisma.TransactionClient;

const versionInclude = {
  assessment: true,
  questions: {
    orderBy: { sortOrder: "asc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  },
  subscales: { orderBy: { name: "asc" } },
  ranges: { orderBy: [{ subscaleId: "asc" }, { min: "asc" }] },
} satisfies Prisma.AssessmentVersionInclude;

export type VersionWithContent = Prisma.AssessmentVersionGetPayload<{
  include: typeof versionInclude;
}>;

export function getVersion(versionId: string, db: Tx | typeof prisma = prisma) {
  return db.assessmentVersion.findUnique({ where: { id: versionId }, include: versionInclude });
}

type Config = AssessmentDoc["questions"][number]["config"];

export function versionToDoc(v: VersionWithContent): AssessmentDoc {
  return {
    format: "anclaje.assessment",
    formatVersion: 1,
    title: v.assessment.title,
    description: v.assessment.description,
    sourceNote: v.assessment.sourceNote,
    instructions: v.instructions,
    referencePeriod: v.referencePeriod,
    scoringMethod: v.scoringMethod,
    patientSeesScore: v.patientSeesScore,
    closingMessage: v.closingMessage,
    subscales: v.subscales.map((s) => ({ key: s.id, name: s.name, method: s.method })),
    ranges: v.ranges.map((r) => ({
      subscaleKey: r.subscaleId,
      min: r.min,
      max: r.max,
      label: r.label,
      color: r.color,
      text: r.text,
    })),
    questions: v.questions.map((q) => ({
      key: q.id,
      type: q.type,
      text: q.text,
      helpText: q.helpText,
      required: q.required,
      scored: q.scored,
      reverse: q.reverse,
      weight: q.weight,
      subscaleKey: q.subscaleId,
      blockKey: q.scaleBlockKey,
      criticalOperator: q.criticalOperator,
      criticalValue: q.criticalValue,
      config: (q.config ?? {}) as Config,
      options: q.options.map((o) => ({ key: o.id, label: o.label, value: o.value })),
    })),
  };
}

/** Reemplaza todo el contenido de una versión BORRADOR por el del documento. */
export async function writeDoc(tx: Tx, versionId: string, doc: AssessmentDoc) {
  const version = await tx.assessmentVersion.update({
    where: { id: versionId },
    data: {
      instructions: doc.instructions,
      referencePeriod: doc.referencePeriod,
      scoringMethod: doc.scoringMethod,
      patientSeesScore: doc.patientSeesScore,
      closingMessage: doc.closingMessage,
      assessment: {
        update: { title: doc.title, description: doc.description, sourceNote: doc.sourceNote },
      },
    },
    select: { id: true },
  });
  await tx.scoreRange.deleteMany({ where: { versionId } });
  await tx.question.deleteMany({ where: { versionId } });
  await tx.subscale.deleteMany({ where: { versionId } });

  if (doc.subscales.length) {
    await tx.subscale.createMany({
      data: doc.subscales.map((s) => ({ id: s.key, versionId, name: s.name, method: s.method })),
    });
  }
  if (doc.questions.length) {
    await tx.question.createMany({
      data: doc.questions.map((q, i) => ({
        id: q.key,
        versionId,
        sortOrder: i,
        type: q.type,
        text: q.text,
        helpText: q.helpText,
        required: q.required,
        scored: q.scored,
        reverse: q.reverse,
        weight: q.weight,
        subscaleId: q.subscaleKey,
        scaleBlockKey: q.blockKey,
        criticalOperator: q.criticalOperator,
        criticalValue: q.criticalValue,
        config: q.config,
      })),
    });
    const options = doc.questions.flatMap((q) =>
      q.options.map((o, i) => ({
        id: o.key,
        questionId: q.key,
        label: o.label,
        value: o.value,
        sortOrder: i,
      })),
    );
    if (options.length) await tx.questionOption.createMany({ data: options });
  }
  if (doc.ranges.length) {
    await tx.scoreRange.createMany({
      data: doc.ranges.map((r) => ({
        versionId,
        subscaleId: r.subscaleKey,
        min: r.min,
        max: r.max,
        label: r.label,
        color: r.color,
        text: r.text,
      })),
    });
  }
  return version;
}

/**
 * Crea una evaluación nueva de la profesional con una versión 1 en borrador.
 * Con `ownerId: null` es una plantilla del sistema y queda publicada.
 */
export async function createAssessmentFromDoc(ownerId: string | null, doc: AssessmentDoc) {
  const template = ownerId === null;
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        ownerId,
        isTemplate: template,
        title: doc.title,
        description: doc.description,
        sourceNote: doc.sourceNote,
      },
    });
    const version = await tx.assessmentVersion.create({
      data: {
        assessmentId: assessment.id,
        version: 1,
        ...(template && { status: "PUBLISHED" as const, publishedAt: new Date() }),
      },
    });
    await writeDoc(tx, version.id, doc);
    return assessment;
  });
}

/** Última versión (la editable si es borrador) y la última publicada. */
export async function getAssessmentVersions(assessmentId: string) {
  const versions = await prisma.assessmentVersion.findMany({
    where: { assessmentId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, publishedAt: true },
  });
  return {
    versions,
    latest: versions[0] ?? null,
    published: versions.find((v) => v.status === "PUBLISHED") ?? null,
  };
}
