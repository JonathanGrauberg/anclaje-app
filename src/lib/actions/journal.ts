"use server";

import { revalidatePath } from "next/cache";
import { encrypt, encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientForContentAction } from "@/lib/session";
import {
  journalSchema,
  shareSchema,
  type JournalInput,
  type ShareInput,
} from "@/lib/validation/entries";
import { fail, firstIssue, ok, safe } from "./result";

/**
 * Crea o actualiza una entrada del diario.
 * - Autoguardado (publish = false): una entrada nueva queda como borrador; una ya guardada sigue guardada.
 * - Guardar (publish = true): deja de ser borrador.
 */
export async function saveJournal(input: JournalInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const parsed = journalSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, title, body, emotionIds, share, publish } = parsed.data;
    if (publish && !body.trim()) return fail("Escribí algo antes de guardar");

    if (emotionIds.length) {
      const n = await prisma.emotionNode.count({ where: { id: { in: emotionIds }, active: true } });
      if (n !== new Set(emotionIds).size) return fail("Alguna emoción no existe");
    }

    const existing = id
      ? await prisma.journalEntry.findFirst({
          where: { id, patientId: patient.id },
          select: { id: true, visibility: true, sharedAt: true },
        })
      : null;
    if (id && !existing) return fail("No encontramos esa entrada");

    const sharedAt =
      share.visibility === "SHARED"
        ? existing?.visibility === "SHARED"
          ? existing.sharedAt
          : new Date()
        : null;
    const data = {
      titleEnc: encryptOptional(title),
      bodyEnc: encrypt(body),
      visibility: share.visibility,
      intention: share.intention,
      sharedAt,
    };
    const emotions = { create: [...new Set(emotionIds)].map((nodeId) => ({ nodeId })) };

    const entry = existing
      ? await prisma.journalEntry.update({
          where: { id: existing.id },
          data: {
            ...data,
            ...(publish ? { isDraft: false } : {}),
            emotions: { deleteMany: {}, ...emotions },
          },
          select: { id: true, updatedAt: true },
        })
      : await prisma.journalEntry.create({
          data: { ...data, patientId: patient.id, isDraft: !publish, emotions },
          select: { id: true, updatedAt: true },
        });

    revalidatePath("/app/diario");
    return ok({ id: entry.id, savedAt: entry.updatedAt.toISOString() });
  });
}

export async function updateJournalShare(id: string, input: ShareInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const parsed = shareSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { visibility, intention } = parsed.data;
    const entry = await prisma.journalEntry.findFirst({
      where: { id, patientId: patient.id },
      select: { visibility: true, sharedAt: true },
    });
    if (!entry) return fail("No encontramos esa entrada");
    await prisma.journalEntry.update({
      where: { id },
      data: {
        visibility,
        intention,
        sharedAt:
          visibility === "SHARED"
            ? entry.visibility === "SHARED"
              ? entry.sharedAt
              : new Date()
            : null,
      },
    });
    revalidatePath("/app/diario");
    revalidatePath(`/app/diario/${id}`);
    return ok(undefined);
  });
}

export async function deleteJournal(id: string) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const res = await prisma.journalEntry.deleteMany({ where: { id, patientId: patient.id } });
    if (res.count === 0) return fail("No encontramos esa entrada");
    revalidatePath("/app/diario");
    return ok(undefined);
  });
}
