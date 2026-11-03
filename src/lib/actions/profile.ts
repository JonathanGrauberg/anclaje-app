"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { decryptOptional, encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { normalizeLicense } from "@/lib/licenses";
import { allow } from "@/lib/rate-limit";
import { sendAccountChangedNotice } from "@/lib/security-notice";
import { patientForAction, professionalForAction } from "@/lib/session";
import {
  patientProfileSchema,
  professionalProfileSchema,
  type PatientProfileInput,
  type ProfessionalProfileInput,
} from "@/lib/validation/profile";
import { fail, firstIssue, ok, safe } from "./result";

const TAKEN = "Esa matrícula ya está registrada en Anclaje. Si es tuya, escribinos y lo vemos.";
const TOO_MANY = "Guardaste muchas veces seguidas. Esperá unos minutos.";

/** El celular guardado (descifrado), para saber si cambió. */
async function currentPhone(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { phoneEnc: true } });
  return decryptOptional(u?.phoneEnc);
}

/** El paciente corrige su nombre y su celular. Los ve su psicóloga (el celular, para WhatsApp). */
export async function updatePatientProfile(input: PatientProfileInput) {
  return safe(async () => {
    const patient = await patientForAction();
    if (!allow(`profile:${patient.userId}`, 10, 15 * 60_000)) return fail(TOO_MANY);
    const parsed = patientProfileSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { name, phone } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: patient.userId },
      select: { name: true },
    });
    const samePhone = (await currentPhone(patient.userId)) === phone;
    if (user?.name === name && (patient.displayName ?? name) === name && samePhone)
      return ok(undefined);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: patient.userId },
        data: { name, phoneEnc: encryptOptional(phone) },
      }),
      prisma.patientProfile.update({ where: { id: patient.id }, data: { displayName: name } }),
    ]);
    after(() => sendAccountChangedNotice(patient.userId, "profile"));
    revalidatePath("/app", "layout");
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

/**
 * La profesional corrige su nombre, su matrícula o su celular. Si cambia la matrícula, vuelve a quedar sin
 * verificar hasta que el admin la revise (igual que en el alta).
 */
export async function updateProfessionalProfile(input: ProfessionalProfileInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (!allow(`profile:${userId}`, 10, 15 * 60_000)) return fail(TOO_MANY);
    const parsed = professionalProfileSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { displayName, licenseJurisdiction, licenseNumber, phone } = parsed.data;

    // La matrícula cargada a mano por el admin puede tener puntos o letras: se compara normalizada,
    // para no perder la verificación cuando solo se cambia otro dato.
    const licenseChanged =
      licenseJurisdiction !== professional.licenseJurisdiction ||
      licenseNumber !== normalizeLicense(professional.licenseNumber ?? "");
    const samePhone = (await currentPhone(userId)) === phone;
    if (!licenseChanged && displayName === professional.displayName && samePhone)
      return ok(undefined);

    if (licenseChanged) {
      const taken = await prisma.professionalProfile.findFirst({
        where: { licenseJurisdiction, licenseNumber, NOT: { id: professional.id } },
        select: { id: true },
      });
      if (taken) return fail(TAKEN);
    }
    try {
      await prisma.$transaction([
        prisma.professionalProfile.update({
          where: { id: professional.id },
          data: {
            displayName,
            licenseJurisdiction,
            licenseNumber,
            ...(licenseChanged ? { verifiedAt: null } : {}),
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { name: displayName, phoneEnc: encryptOptional(phone) },
        }),
      ]);
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return fail(TAKEN);
      throw e;
    }
    after(() => sendAccountChangedNotice(userId, "profile"));
    revalidatePath("/pro", "layout");
    revalidatePath("/app", "layout");
    return ok(undefined);
  });
}
