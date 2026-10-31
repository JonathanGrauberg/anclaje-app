"use server";

import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientForAction } from "@/lib/session";
import { sessionTopicSchema, type SessionTopicInput } from "@/lib/validation/entries";
import { fail, firstIssue, ok, safe } from "./result";

export async function addSessionTopic(input: SessionTopicInput) {
  return safe(async () => {
    const patient = await patientForAction();
    const parsed = sessionTopicSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { text, sourceType, sourceId } = parsed.data;
    const topic = await prisma.sessionTopic.create({
      data: {
        patientId: patient.id,
        textEnc: encrypt(text),
        sourceType: sourceId ? sourceType : null,
        sourceId: sourceType ? sourceId : null,
      },
      select: { id: true },
    });
    revalidatePath("/app/proxima-sesion");
    revalidatePath("/app");
    return ok({ id: topic.id });
  });
}

export async function setTopicDiscussed(id: string, discussed: boolean) {
  return safe(async () => {
    const patient = await patientForAction();
    const res = await prisma.sessionTopic.updateMany({
      where: { id, patientId: patient.id },
      data: { discussedAt: discussed ? new Date() : null },
    });
    if (res.count === 0) return fail("No encontramos ese tema");
    revalidatePath("/app/proxima-sesion");
    revalidatePath("/app");
    return ok(undefined);
  });
}

export async function deleteSessionTopic(id: string) {
  return safe(async () => {
    const patient = await patientForAction();
    const res = await prisma.sessionTopic.deleteMany({ where: { id, patientId: patient.id } });
    if (res.count === 0) return fail("No encontramos ese tema");
    revalidatePath("/app/proxima-sesion");
    revalidatePath("/app");
    return ok(undefined);
  });
}
