"use server";

import { revalidatePath } from "next/cache";
import { findLinkedPatient, findSharedTarget, sessionTopicsWhere } from "@/lib/access";
import { audit } from "@/lib/audit";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { professionalForAction } from "@/lib/session";
import {
  clinicalNoteSchema,
  copingCardSchema,
  feedbackSchema,
  quickReplySchema,
  taskSchema,
  type ClinicalNoteInput,
  type CopingCardInput,
  type FeedbackInput,
  type QuickReplyInput,
  type TaskInput,
} from "@/lib/validation/pro";
import { fail, firstIssue, ok, safe } from "./result";

// Acciones de la profesional. Todas re-verifican sesión, rol y vínculo ACTIVO con el paciente,
// y registran auditoría.

const patientPath = (patientId: string) => `/pro/pacientes/${patientId}`;

async function linkedOrNull(professionalId: string, patientId: string) {
  return (await findLinkedPatient(professionalId, patientId)) !== null;
}

// ── Devoluciones ─────────────────────────────────────────────

export async function addFeedback(input: FeedbackInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = feedbackSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { targetType, targetId, body, discussInSession, resourceId } = parsed.data;

    const patientId = await findSharedTarget(professional.id, targetType, targetId);
    if (!patientId) return fail("Esta entrada ya no está compartida con vos");

    if (resourceId) {
      const own = await prisma.resource.count({
        where: { id: resourceId, professionalId: professional.id },
      });
      if (!own) return fail("No encontramos ese recurso");
    }

    const fb = await prisma.feedback.create({
      data: {
        professionalId: professional.id,
        patientId,
        targetType,
        targetId,
        bodyEnc: encrypt(body),
        discussInSession,
        resourceId: resourceId ?? null,
      },
      select: { id: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Feedback",
      entityId: fb.id,
      patientId,
      meta: { targetType, targetId },
    });
    revalidatePath(patientPath(patientId), "layout");
    revalidatePath("/pro");
    return ok({ id: fb.id });
  });
}

export async function deleteFeedback(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const fb = await prisma.feedback.findFirst({
      where: { id, professionalId: professional.id },
      select: { patientId: true },
    });
    if (!fb) return fail("No encontramos esa devolución");
    await prisma.feedback.delete({ where: { id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "Feedback",
      entityId: id,
      patientId: fb.patientId,
    });
    revalidatePath(patientPath(fb.patientId), "layout");
    return ok(undefined);
  });
}

// ── Respuestas rápidas ───────────────────────────────────────

export async function saveQuickReply(input: QuickReplyInput) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const parsed = quickReplySchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, title, body } = parsed.data;
    if (id) {
      const res = await prisma.quickReply.updateMany({
        where: { id, professionalId: professional.id },
        data: { title, body },
      });
      if (res.count === 0) return fail("No encontramos esa respuesta");
    } else {
      await prisma.quickReply.create({ data: { professionalId: professional.id, title, body } });
    }
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

export async function deleteQuickReply(id: string) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const res = await prisma.quickReply.deleteMany({
      where: { id, professionalId: professional.id },
    });
    if (res.count === 0) return fail("No encontramos esa respuesta");
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

// ── Notas clínicas (solo las ve su autora) ───────────────────

export async function saveClinicalNote(input: ClinicalNoteInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = clinicalNoteSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, patientId, body } = parsed.data;

    let noteId = id;
    if (id) {
      // Editar una nota propia. No exige vínculo activo: es su registro profesional.
      const res = await prisma.clinicalNote.updateMany({
        where: { id, professionalId: professional.id, patientId },
        data: { bodyEnc: encrypt(body) },
      });
      if (res.count === 0) return fail("No encontramos esa nota");
    } else {
      if (!(await linkedOrNull(professional.id, patientId))) return fail("No tenés vínculo activo");
      const note = await prisma.clinicalNote.create({
        data: { professionalId: professional.id, patientId, bodyEnc: encrypt(body) },
        select: { id: true },
      });
      noteId = note.id;
    }
    await audit({
      actorId: userId,
      action: id ? "update" : "create",
      entityType: "ClinicalNote",
      entityId: noteId,
      patientId,
    });
    revalidatePath(patientPath(patientId));
    return ok({ id: noteId! });
  });
}

export async function deleteClinicalNote(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const note = await prisma.clinicalNote.findFirst({
      where: { id, professionalId: professional.id },
      select: { patientId: true },
    });
    if (!note) return fail("No encontramos esa nota");
    await prisma.clinicalNote.delete({ where: { id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "ClinicalNote",
      entityId: id,
      patientId: note.patientId,
    });
    revalidatePath(patientPath(note.patientId));
    return ok(undefined);
  });
}

// ── Plan de calma ────────────────────────────────────────────

export async function saveCopingCardForPatient(patientId: string, input: CopingCardInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (!(await linkedOrNull(professional.id, patientId))) return fail("No tenés vínculo activo");
    const parsed = copingCardSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, ...data } = parsed.data;

    const plan = await prisma.copingPlan.upsert({
      where: { patientId },
      update: {},
      create: { patientId },
      select: { id: true },
    });
    if (id) {
      // La profesional edita solo las fichas que escribió ella; las del paciente son del paciente.
      const res = await prisma.copingCard.updateMany({
        where: { id, planId: plan.id, author: "PROFESSIONAL" },
        data,
      });
      if (res.count === 0) return fail("No encontramos esa ficha");
    } else {
      const last = await prisma.copingCard.aggregate({
        where: { planId: plan.id },
        _max: { sortOrder: true },
      });
      await prisma.copingCard.create({
        data: {
          ...data,
          planId: plan.id,
          author: "PROFESSIONAL",
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
    }
    await audit({
      actorId: userId,
      action: id ? "update" : "create",
      entityType: "CopingCard",
      entityId: id ?? null,
      patientId,
    });
    revalidatePath(patientPath(patientId));
    return ok(undefined);
  });
}

export async function deleteCopingCardForPatient(patientId: string, cardId: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (!(await linkedOrNull(professional.id, patientId))) return fail("No tenés vínculo activo");
    const res = await prisma.copingCard.deleteMany({
      where: { id: cardId, author: "PROFESSIONAL", plan: { patientId } },
    });
    if (res.count === 0) return fail("No encontramos esa ficha");
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "CopingCard",
      entityId: cardId,
      patientId,
    });
    revalidatePath(patientPath(patientId));
    return ok(undefined);
  });
}

/** Subir o bajar una ficha en el orden del plan (incluye las del paciente). */
export async function moveCopingCard(patientId: string, cardId: string, direction: -1 | 1) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    if (!(await linkedOrNull(professional.id, patientId))) return fail("No tenés vínculo activo");
    const cards = await prisma.copingCard.findMany({
      where: { plan: { patientId } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const from = cards.findIndex((c) => c.id === cardId);
    const to = from + (direction === 1 ? 1 : -1);
    if (from === -1) return fail("No encontramos esa ficha");
    if (to < 0 || to >= cards.length) return ok(undefined);
    [cards[from], cards[to]] = [cards[to], cards[from]];
    await prisma.$transaction(
      cards.map((c, i) =>
        prisma.copingCard.update({ where: { id: c.id }, data: { sortOrder: i } }),
      ),
    );
    revalidatePath(patientPath(patientId));
    return ok(undefined);
  });
}

// ── Tareas ───────────────────────────────────────────────────

export async function createTask(input: TaskInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, title, description, dueAt } = parsed.data;
    if (!(await linkedOrNull(professional.id, patientId))) return fail("No tenés vínculo activo");
    const task = await prisma.task.create({
      data: {
        professionalId: professional.id,
        patientId,
        title,
        description: description || null,
        dueAt: dueAt ?? null,
      },
      select: { id: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Task",
      entityId: task.id,
      patientId,
    });
    revalidatePath(patientPath(patientId));
    revalidatePath("/pro");
    return ok({ id: task.id });
  });
}

export async function deleteTask(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const task = await prisma.task.findFirst({
      where: { id, professionalId: professional.id },
      select: { patientId: true },
    });
    if (!task) return fail("No encontramos esa tarea");
    await prisma.task.delete({ where: { id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "Task",
      entityId: id,
      patientId: task.patientId,
    });
    revalidatePath(patientPath(task.patientId));
    revalidatePath("/pro");
    return ok(undefined);
  });
}

// ── Temas de la próxima sesión ───────────────────────────────

export async function markTopicDiscussedByPro(id: string, discussed: boolean) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const topic = await prisma.sessionTopic.findFirst({
      where: { id, ...sessionTopicsWhere(professional.id) },
      select: { patientId: true },
    });
    if (!topic) return fail("No encontramos ese tema");
    await prisma.sessionTopic.update({
      where: { id },
      data: { discussedAt: discussed ? new Date() : null },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "SessionTopic",
      entityId: id,
      patientId: topic.patientId,
    });
    revalidatePath(patientPath(topic.patientId));
    revalidatePath("/pro");
    return ok(undefined);
  });
}
