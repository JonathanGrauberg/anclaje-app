"use server";

import { revalidatePath } from "next/cache";
import { encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientForContentAction } from "@/lib/session";
import {
  copingCardSchema,
  taskProgressSchema,
  type CopingCardInput,
  type TaskProgressInput,
} from "@/lib/validation/pro";
import { fail, firstIssue, ok, safe } from "./result";

// Acciones del paciente sobre su plan de calma y sus tareas.

export async function addOwnCopingCard(input: CopingCardInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const parsed = copingCardSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _ignored, ...data } = parsed.data;
    const plan = await prisma.copingPlan.upsert({
      where: { patientId: patient.id },
      update: {},
      create: { patientId: patient.id },
      select: { id: true },
    });
    const last = await prisma.copingCard.aggregate({
      where: { planId: plan.id },
      _max: { sortOrder: true },
    });
    await prisma.copingCard.create({
      data: {
        ...data,
        planId: plan.id,
        author: "PATIENT",
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePath("/app/plan-de-calma");
    return ok(undefined);
  });
}

/** El paciente borra solo las fichas que agregó él. */
export async function deleteOwnCopingCard(id: string) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const res = await prisma.copingCard.deleteMany({
      where: { id, author: "PATIENT", plan: { patientId: patient.id } },
    });
    if (res.count === 0) return fail("No encontramos esa ficha");
    revalidatePath("/app/plan-de-calma");
    return ok(undefined);
  });
}

export async function updateTaskProgress(input: TaskProgressInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const parsed = taskProgressSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, done, comment } = parsed.data;
    const res = await prisma.task.updateMany({
      where: { id, patientId: patient.id },
      data: {
        completedAt: done ? new Date() : null,
        ...(comment !== undefined && { patientCommentEnc: encryptOptional(comment) }),
      },
    });
    if (res.count === 0) return fail("No encontramos esa tarea");
    revalidatePath("/app/tareas");
    revalidatePath("/app");
    return ok(undefined);
  });
}
