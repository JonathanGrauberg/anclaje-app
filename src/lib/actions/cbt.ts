"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientForContentAction } from "@/lib/session";
import {
  cbtDraftSchema,
  shareSchema,
  type CbtDraftInput,
  type ShareInput,
} from "@/lib/validation/entries";
import { fail, firstIssue, ok, safe } from "./result";

/** Crea un autorregistro en borrador y abre el asistente. */
export async function startCbtRecord() {
  const patient = await patientForContentAction();
  const visibility = patient.sharingDefaults?.cbt ?? "SHARED";
  const record = await prisma.cbtRecord.create({
    data: {
      patientId: patient.id,
      visibility,
      intention: visibility === "SHARED" ? "JUST_FYI" : null,
    },
    select: { id: true },
  });
  redirect(`/app/autorregistro/${record.id}`);
}

async function writeDraft(patientId: string, input: CbtDraftInput, complete: boolean) {
  const parsed = cbtDraftSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const d = parsed.data;

  const record = await prisma.cbtRecord.findFirst({
    where: { id: d.id, patientId },
    select: { id: true, status: true, visibility: true, sharedAt: true },
  });
  if (!record) return fail("No encontramos ese autorregistro");
  if (record.status === "COMPLETE") return fail("Este autorregistro ya está terminado");

  if (d.distortionIds?.length) {
    const n = await prisma.cognitiveDistortion.count({ where: { id: { in: d.distortionIds } } });
    if (n !== new Set(d.distortionIds).size) return fail("Alguna distorsión no existe");
  }
  if (d.emotions?.length) {
    const ids = d.emotions.map((e) => e.nodeId);
    if (new Set(ids).size !== ids.length) return fail("Emociones repetidas");
    const n = await prisma.emotionNode.count({ where: { id: { in: ids }, active: true } });
    if (n !== ids.length) return fail("Alguna emoción no existe");
  }
  if (complete && (!d.situation?.trim() || !d.thought?.trim())) {
    return fail("Contá qué pasó y qué pensaste para poder terminarlo");
  }

  const share = d.share;
  await prisma.cbtRecord.update({
    where: { id: record.id },
    data: {
      currentStep: d.currentStep,
      ...(d.occurredAt ? { occurredAt: d.occurredAt } : {}),
      ...(d.situation !== undefined ? { situationEnc: encryptOptional(d.situation) } : {}),
      ...(d.thought !== undefined ? { thoughtEnc: encryptOptional(d.thought) } : {}),
      ...(d.behavior !== undefined ? { behaviorEnc: encryptOptional(d.behavior) } : {}),
      ...(d.alternative !== undefined ? { alternativeEnc: encryptOptional(d.alternative) } : {}),
      ...(d.beliefBefore !== undefined ? { beliefBefore: d.beliefBefore } : {}),
      ...(d.beliefAfter !== undefined ? { beliefAfter: d.beliefAfter } : {}),
      ...(d.bodyZones !== undefined ? { bodyZones: d.bodyZones } : {}),
      ...(share
        ? {
            visibility: share.visibility,
            intention: share.intention,
            sharedAt:
              share.visibility === "SHARED"
                ? record.visibility === "SHARED" && record.sharedAt
                  ? record.sharedAt
                  : complete
                    ? new Date()
                    : null
                : null,
          }
        : {}),
      ...(complete ? { status: "COMPLETE" as const } : {}),
      ...(d.distortionIds !== undefined
        ? {
            distortions: {
              deleteMany: {},
              create: [...new Set(d.distortionIds)].map((distortionId) => ({ distortionId })),
            },
          }
        : {}),
      ...(d.emotions !== undefined
        ? {
            emotions: {
              deleteMany: {},
              create: d.emotions.map((e) => ({
                nodeId: e.nodeId,
                intensityBefore: e.intensityBefore,
                intensityAfter: e.intensityAfter ?? null,
              })),
            },
          }
        : {}),
    },
  });
  return ok(undefined);
}

export async function saveCbtDraft(input: CbtDraftInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    return writeDraft(patient.id, input, false);
  });
}

export async function completeCbtRecord(input: CbtDraftInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const res = await writeDraft(patient.id, input, true);
    if (res.ok) {
      revalidatePath("/app/autorregistro");
      revalidatePath("/app");
    }
    return res;
  });
}

export async function updateCbtShare(id: string, input: ShareInput) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const parsed = shareSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { visibility, intention } = parsed.data;
    const record = await prisma.cbtRecord.findFirst({
      where: { id, patientId: patient.id },
      select: { visibility: true, sharedAt: true },
    });
    if (!record) return fail("No encontramos ese autorregistro");
    await prisma.cbtRecord.update({
      where: { id },
      data: {
        visibility,
        intention,
        sharedAt:
          visibility === "SHARED"
            ? (record.visibility === "SHARED" && record.sharedAt) || new Date()
            : null,
      },
    });
    revalidatePath("/app/autorregistro");
    revalidatePath(`/app/autorregistro/${id}`);
    return ok(undefined);
  });
}

export async function deleteCbtRecord(id: string) {
  return safe(async () => {
    const patient = await patientForContentAction();
    const res = await prisma.cbtRecord.deleteMany({ where: { id, patientId: patient.id } });
    if (res.count === 0) return fail("No encontramos ese autorregistro");
    revalidatePath("/app/autorregistro");
    revalidatePath("/app");
    return ok(undefined);
  });
}
