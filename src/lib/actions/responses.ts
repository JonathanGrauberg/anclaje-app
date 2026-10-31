"use server";

import { redirect } from "next/navigation";
import { toScoringInput, type AnswerMap } from "@/lib/assessments/doc";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { dueAssignmentsWhere } from "@/lib/queries/patient";
import { scoreAssessment } from "@/lib/scoring";
import { patientForAction } from "@/lib/session";
import { answerSchema, type AnswerInput } from "@/lib/validation/assessment";
import { fail, firstIssue, ok, safe } from "./result";

// Respuestas del paciente: empezar/continuar, guardado parcial y cierre con puntaje.

const DAY = 86_400_000;

/** Empieza (o retoma) la evaluación de una asignación vigente y lleva al cuestionario. */
export async function startAssessment(assignmentId: string) {
  const patient = await patientForAction();
  const assignment = await prisma.assessmentAssignment.findFirst({
    where: { id: assignmentId, ...dueAssignmentsWhere(patient.id) },
    select: { id: true, versionId: true },
  });
  if (!assignment) redirect("/app/tareas");
  const existing = await prisma.assessmentResponse.findFirst({
    where: { assignmentId, patientId: patient.id, status: "IN_PROGRESS" },
    select: { id: true },
  });
  const response =
    existing ??
    (await prisma.assessmentResponse.create({
      data: { assignmentId, versionId: assignment.versionId, patientId: patient.id },
      select: { id: true },
    }));
  redirect(`/app/evaluaciones/${response.id}`);
}

async function ownOpenResponse(responseId: string, patientId: string) {
  return prisma.assessmentResponse.findFirst({
    where: { id: responseId, patientId, status: "IN_PROGRESS" },
    select: { id: true, versionId: true },
  });
}

export async function saveAnswer(input: AnswerInput) {
  return safe(async () => {
    const patient = await patientForAction();
    const parsed = answerSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const a = parsed.data;
    const response = await ownOpenResponse(a.responseId, patient.id);
    if (!response) return fail("Esta evaluación ya se cerró");
    const q = await prisma.question.findFirst({
      where: { id: a.questionId, versionId: response.versionId },
      include: { options: { select: { id: true } } },
    });
    if (!q || q.type === "INFO") return fail("Pregunta inválida");

    // Validación según el tipo de pregunta (en el servidor, siempre).
    const cfg = (q.config ?? {}) as { min?: number; max?: number };
    let valueNumber: number | null = null;
    let optionIds: string[] = [];
    let textEnc: string | null = null;
    let valueDate: Date | null = null;
    switch (q.type) {
      case "SINGLE_CHOICE":
      case "LIKERT":
      case "YES_NO":
      case "MULTIPLE_CHOICE": {
        optionIds = [...new Set(a.optionIds ?? [])];
        const valid = new Set(q.options.map((o) => o.id));
        if (optionIds.some((id) => !valid.has(id))) return fail("Opción inválida");
        if (q.type !== "MULTIPLE_CHOICE" && optionIds.length > 1)
          return fail("Elegí una sola opción");
        break;
      }
      case "SLIDER":
      case "PERCENTAGE":
      case "NUMBER": {
        valueNumber = a.valueNumber ?? null;
        const [min, max] = q.type === "PERCENTAGE" ? [0, 100] : [cfg.min, cfg.max];
        if (
          valueNumber !== null &&
          ((min !== undefined && valueNumber < min) || (max !== undefined && valueNumber > max))
        )
          return fail("El valor está fuera del rango");
        break;
      }
      case "SHORT_TEXT":
      case "LONG_TEXT":
        textEnc = encryptOptional(a.text?.trim());
        break;
      case "DATE":
        valueDate = a.valueDate ? new Date(`${a.valueDate}T12:00:00-03:00`) : null;
        break;
    }

    await prisma.answer.upsert({
      where: { responseId_questionId: { responseId: response.id, questionId: q.id } },
      update: { valueNumber, optionIds, textEnc, valueDate },
      create: {
        responseId: response.id,
        questionId: q.id,
        valueNumber,
        optionIds,
        textEnc,
        valueDate,
      },
    });
    return ok(undefined);
  });
}

export async function completeAssessment(responseId: string) {
  return safe(async () => {
    const patient = await patientForAction();
    const response = await ownOpenResponse(responseId, patient.id);
    if (!response) return fail("Esta evaluación ya se cerró");
    const version = await getVersion(response.versionId);
    if (!version) return fail("No encontramos la evaluación");
    const doc = versionToDoc(version);
    const answers = await prisma.answer.findMany({ where: { responseId } });

    const answerMap: AnswerMap = {};
    const answered = new Set<string>();
    for (const ans of answers) {
      answerMap[ans.questionId] = { valueNumber: ans.valueNumber, optionKeys: ans.optionIds };
      if (ans.valueNumber !== null || ans.optionIds.length || ans.textEnc || ans.valueDate)
        answered.add(ans.questionId);
    }
    const missing = doc.questions.filter(
      (q) => q.required && q.type !== "INFO" && !answered.has(q.key),
    );
    if (missing.length) {
      return fail(
        missing.length === 1
          ? "Te quedó una pregunta obligatoria sin responder."
          : `Te quedaron ${missing.length} preguntas obligatorias sin responder.`,
      );
    }

    const result = scoreAssessment(toScoringInput(doc, answerMap));
    const now = new Date();
    const assignment = await prisma.assessmentResponse.findUnique({
      where: { id: responseId },
      select: { assignment: { select: { id: true, recurrenceDays: true } } },
    });
    await prisma.$transaction([
      prisma.assessmentResponse.update({
        where: { id: responseId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          totalScore: result.total,
          subscaleScores: result.subscales.map((s) => ({
            key: s.key,
            name: s.name,
            score: s.score,
            label: s.range?.label ?? null,
          })),
          interpretation: result.totalRange?.label ?? null,
          criticalQuestionIds: result.criticalKeys,
        },
      }),
      ...(assignment?.assignment
        ? [
            prisma.assessmentAssignment.update({
              where: { id: assignment.assignment.id },
              data: assignment.assignment.recurrenceDays
                ? {
                    nextDueAt: new Date(now.getTime() + assignment.assignment.recurrenceDays * DAY),
                  }
                : { active: false, nextDueAt: null },
            }),
          ]
        : []),
    ]);
    // Sin revalidatePath: refrescaría esta misma página y taparía la pantalla de cierre (con las
    // líneas de ayuda si hubo un ítem crítico). /app y /app/tareas son dinámicas igual.

    return ok({
      critical: result.criticalKeys.length > 0,
      closingMessage: doc.closingMessage,
      score: doc.patientSeesScore
        ? {
            total: result.total,
            label: result.totalRange?.label ?? null,
            text: result.totalRange?.text ?? null,
          }
        : null,
    });
  });
}
