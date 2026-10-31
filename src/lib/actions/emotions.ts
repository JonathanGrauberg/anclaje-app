"use server";

import { revalidatePath } from "next/cache";
import { HIGH_INTENSITY } from "@/lib/constants";
import { encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientForAction } from "@/lib/session";
import {
  emotionEntrySchema,
  shareSchema,
  type EmotionEntryInput,
  type ShareInput,
} from "@/lib/validation/entries";
import { fail, firstIssue, ok, safe } from "./result";

export async function saveEmotionEntry(input: EmotionEntryInput) {
  return safe(async () => {
    const patient = await patientForAction();
    const parsed = emotionEntrySchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { picks, bodyZones, note, share } = parsed.data;

    const validNodes = await prisma.emotionNode.count({
      where: { id: { in: picks.map((p) => p.nodeId) }, active: true },
    });
    if (validNodes !== picks.length) return fail("Alguna emoción no existe");

    const entry = await prisma.emotionEntry.create({
      data: {
        patientId: patient.id,
        bodyZones,
        noteEnc: encryptOptional(note),
        visibility: share.visibility,
        intention: share.intention,
        sharedAt: share.visibility === "SHARED" ? new Date() : null,
        items: { create: picks.map((p) => ({ nodeId: p.nodeId, intensity: p.intensity })) },
      },
      select: { id: true },
    });

    revalidatePath("/app/rueda/historial");
    return ok({ id: entry.id, high: picks.some((p) => p.intensity >= HIGH_INTENSITY) });
  });
}

export async function updateEmotionShare(id: string, input: ShareInput) {
  return safe(async () => {
    const patient = await patientForAction();
    const parsed = shareSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { visibility, intention } = parsed.data;
    // updateMany con patientId: nadie puede tocar entradas ajenas.
    const res = await prisma.emotionEntry.updateMany({
      where: { id, patientId: patient.id },
      data: { visibility, intention, sharedAt: visibility === "SHARED" ? new Date() : null },
    });
    if (res.count === 0) return fail("No encontramos ese registro");
    revalidatePath("/app/rueda/historial");
    return ok(undefined);
  });
}

export async function deleteEmotionEntry(id: string) {
  return safe(async () => {
    const patient = await patientForAction();
    const res = await prisma.emotionEntry.deleteMany({ where: { id, patientId: patient.id } });
    if (res.count === 0) return fail("No encontramos ese registro");
    revalidatePath("/app/rueda/historial");
    return ok(undefined);
  });
}
