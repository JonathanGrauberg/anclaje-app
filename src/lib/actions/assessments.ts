"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findLinkedPatient } from "@/lib/access";
import { emptyDoc, publishProblems, rekey } from "@/lib/assessments/doc";
import {
  createAssessmentFromDoc,
  getVersion,
  versionToDoc,
  writeDoc,
} from "@/lib/assessments/repo";
import { audit } from "@/lib/audit";
import { encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { professionalForAction } from "@/lib/session";
import { isValidKey } from "@/lib/storage";
import {
  assessmentDocSchema,
  assignAssessmentSchema,
  externalResultSchema,
  type AssessmentDocInput,
  type AssignAssessmentInput,
  type ExternalResultInput,
} from "@/lib/validation/assessment";
import { fail, firstIssue, ok, safe } from "./result";

// Evaluaciones del lado profesional: armado, versiones, asignación y revisión.

const builderPath = (id: string) => `/pro/evaluaciones/${id}`;

/** Evaluación propia + su última versión. Las plantillas del sistema no se editan. */
async function ownAssessment(professionalId: string, assessmentId: string) {
  return prisma.assessment.findFirst({
    where: { id: assessmentId, ownerId: professionalId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
}

export async function createAssessment(formData: FormData) {
  const { professional } = await professionalForAction();
  const title =
    String(formData.get("title") ?? "")
      .trim()
      .slice(0, 200) || "Evaluación sin título";
  const a = await createAssessmentFromDoc(professional.id, emptyDoc(title));
  redirect(builderPath(a.id));
}

export async function saveAssessmentDraft(assessmentId: string, input: AssessmentDocInput) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const parsed = assessmentDocSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const a = await ownAssessment(professional.id, assessmentId);
    const latest = a?.versions[0];
    if (!latest) return fail("No encontramos esa evaluación");
    if (latest.status !== "DRAFT")
      return fail("Esta versión ya está publicada. Creá una versión nueva.");

    // Las claves se usan como id: si alguna ya existe en otra versión, la rechazamos.
    const keys = parsed.data.questions.map((q) => q.key);
    const clash = await prisma.question.count({
      where: { id: { in: keys }, versionId: { not: latest.id } },
    });
    if (clash) return fail("Hay preguntas copiadas de otra versión. Recargá la página.");

    await prisma.$transaction((tx) => writeDoc(tx, latest.id, parsed.data));
    revalidatePath(builderPath(assessmentId));
    revalidatePath("/pro/evaluaciones");
    return ok({ savedAt: new Date().toISOString() });
  });
}

export async function publishAssessment(assessmentId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const a = await ownAssessment(professional.id, assessmentId);
    const latest = a?.versions[0];
    if (!latest) return fail("No encontramos esa evaluación");
    if (latest.status !== "DRAFT") return fail("Ya está publicada");
    const v = await getVersion(latest.id);
    const problems = publishProblems(versionToDoc(v!));
    if (problems.length) return fail(problems.slice(0, 3).join(" "));

    await prisma.$transaction([
      prisma.assessmentVersion.updateMany({
        where: { assessmentId, status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      }),
      prisma.assessmentVersion.update({
        where: { id: latest.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      }),
    ]);
    await audit({
      actorId: userId,
      action: "update",
      entityType: "AssessmentVersion",
      entityId: latest.id,
      meta: { status: "PUBLISHED" },
    });
    revalidatePath(builderPath(assessmentId));
    revalidatePath("/pro/evaluaciones");
    return ok(undefined);
  });
}

/** Nueva versión en borrador a partir de la última (las respuestas viejas quedan con su versión). */
export async function createNewVersion(assessmentId: string) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const a = await ownAssessment(professional.id, assessmentId);
    const latest = a?.versions[0];
    if (!latest) return fail("No encontramos esa evaluación");
    if (latest.status === "DRAFT") return ok(undefined);
    const doc = rekey(versionToDoc((await getVersion(latest.id))!));
    await prisma.$transaction(async (tx) => {
      const v = await tx.assessmentVersion.create({
        data: { assessmentId, version: latest.version + 1 },
      });
      await writeDoc(tx, v.id, doc);
    });
    revalidatePath(builderPath(assessmentId));
    return ok(undefined);
  });
}

/** Duplica una evaluación propia o una plantilla del sistema como borrador nuevo. */
export async function duplicateAssessment(assessmentId: string) {
  const { professional } = await professionalForAction();
  const source = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      OR: [{ ownerId: professional.id }, { ownerId: null, isTemplate: true }],
    },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  const version = source?.versions.find((v) => v.status === "PUBLISHED") ?? source?.versions[0];
  if (!source || !version) redirect("/pro/evaluaciones");
  const doc = rekey(versionToDoc((await getVersion(version.id))!));
  const copy = await createAssessmentFromDoc(professional.id, {
    ...doc,
    title: source.isTemplate ? doc.title : `Copia de ${doc.title}`.slice(0, 200),
  });
  redirect(builderPath(copy.id));
}

export async function importAssessmentJson(text: string) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    if (text.length > 500_000) return fail("El archivo es demasiado grande");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fail("El archivo no es un JSON válido");
    }
    const parsed = assessmentDocSchema.safeParse(json);
    if (!parsed.success)
      return fail(`El JSON no tiene el formato de Sentir: ${firstIssue(parsed.error)}`);
    const a = await createAssessmentFromDoc(professional.id, rekey(parsed.data));
    revalidatePath("/pro/evaluaciones");
    return ok({ id: a.id });
  });
}

export async function deleteAssessment(assessmentId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const a = await ownAssessment(professional.id, assessmentId);
    if (!a) return fail("No encontramos esa evaluación");
    const used = await prisma.assessmentResponse.count({ where: { version: { assessmentId } } });
    if (used) return fail("Ya tiene respuestas de pacientes: no se puede borrar.");
    await prisma.assessment.delete({ where: { id: assessmentId } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "Assessment",
      entityId: assessmentId,
    });
    revalidatePath("/pro/evaluaciones");
    return ok(undefined);
  });
}

// ── Asignación y revisión ────────────────────────────────────

export async function assignAssessment(input: AssignAssessmentInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = assignAssessmentSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { assessmentId, patientId, recurrenceDays } = parsed.data;
    if (!(await findLinkedPatient(professional.id, patientId)))
      return fail("No tenés vínculo activo");
    const version = await prisma.assessmentVersion.findFirst({
      where: { assessmentId, status: "PUBLISHED", assessment: { ownerId: professional.id } },
      select: { id: true },
    });
    if (!version) return fail("Publicá la evaluación antes de asignarla");
    const a = await prisma.assessmentAssignment.create({
      data: {
        versionId: version.id,
        patientId,
        professionalId: professional.id,
        recurrenceDays,
        nextDueAt: new Date(),
      },
      select: { id: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "AssessmentAssignment",
      entityId: a.id,
      patientId,
      meta: { recurrenceDays },
    });
    revalidatePath(`/pro/pacientes/${patientId}`);
    return ok(undefined);
  });
}

export async function cancelAssignment(assignmentId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const a = await prisma.assessmentAssignment.findFirst({
      where: { id: assignmentId, professionalId: professional.id },
      select: { patientId: true },
    });
    if (!a) return fail("No encontramos esa asignación");
    await prisma.assessmentAssignment.update({
      where: { id: assignmentId },
      data: { active: false },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "AssessmentAssignment",
      entityId: assignmentId,
      patientId: a.patientId,
      meta: { active: false },
    });
    revalidatePath(`/pro/pacientes/${a.patientId}`);
    return ok(undefined);
  });
}

export async function markResponseReviewed(responseId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await prisma.assessmentResponse.findFirst({
      where: {
        id: responseId,
        status: "COMPLETED",
        assignment: { professionalId: professional.id },
        patient: { links: { some: { professionalId: professional.id, status: "ACTIVE" } } },
      },
      select: { patientId: true },
    });
    if (!r) return fail("No encontramos esa respuesta");
    await prisma.assessmentResponse.update({
      where: { id: responseId },
      data: { reviewedAt: new Date() },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "AssessmentResponse",
      entityId: responseId,
      patientId: r.patientId,
      meta: { reviewed: true },
    });
    revalidatePath(`/pro/pacientes/${r.patientId}`, "layout");
    revalidatePath("/pro");
    return ok(undefined);
  });
}

export async function addExternalResult(input: ExternalResultInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = externalResultSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, name, score, interpretation, takenAt, notes, storageKey } = parsed.data;
    if (!(await findLinkedPatient(professional.id, patientId)))
      return fail("No tenés vínculo activo");
    if (storageKey && (!isValidKey(storageKey) || !storageKey.startsWith("external/")))
      return fail("Archivo inválido");
    const r = await prisma.externalResult.create({
      data: {
        patientId,
        professionalId: professional.id,
        name,
        score: score ?? null,
        interpretation: interpretation || null,
        takenAt,
        storageKey: storageKey ?? null,
        notesEnc: encryptOptional(notes),
      },
      select: { id: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "ExternalResult",
      entityId: r.id,
      patientId,
    });
    revalidatePath(`/pro/pacientes/${patientId}`);
    return ok(undefined);
  });
}

export async function deleteExternalResult(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await prisma.externalResult.findFirst({
      where: { id, professionalId: professional.id },
      select: { patientId: true },
    });
    if (!r) return fail("No encontramos ese resultado");
    await prisma.externalResult.delete({ where: { id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "ExternalResult",
      entityId: id,
      patientId: r.patientId,
    });
    revalidatePath(`/pro/pacientes/${r.patientId}`);
    return ok(undefined);
  });
}
