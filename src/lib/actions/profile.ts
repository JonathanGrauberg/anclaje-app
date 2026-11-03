"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
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

/** El paciente corrige su nombre. Es el que ve su psicóloga. */
export async function updatePatientProfile(input: PatientProfileInput) {
  return safe(async () => {
    const patient = await patientForAction();
    if (!allow(`profile:${patient.userId}`, 10, 15 * 60_000)) return fail(TOO_MANY);
    const parsed = patientProfileSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { name } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: patient.userId },
      select: { name: true },
    });
    if (user?.name === name && (patient.displayName ?? name) === name) return ok(undefined);

    await prisma.$transaction([
      prisma.user.update({ where: { id: patient.userId }, data: { name } }),
      prisma.patientProfile.update({ where: { id: patient.id }, data: { displayName: name } }),
    ]);
    after(() => sendAccountChangedNotice(patient.userId, "profile"));
    revalidatePath("/app", "layout");
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

/**
 * La profesional corrige su nombre o su matrícula. Si cambia la matrícula, vuelve a quedar sin
 * verificar hasta que el admin la revise (igual que en el alta).
 */
export async function updateProfessionalProfile(input: ProfessionalProfileInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (!allow(`profile:${userId}`, 10, 15 * 60_000)) return fail(TOO_MANY);
    const parsed = professionalProfileSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { displayName, licenseJurisdiction, licenseNumber } = parsed.data;

    const licenseChanged =
      licenseJurisdiction !== professional.licenseJurisdiction ||
      licenseNumber !== professional.licenseNumber;
    if (!licenseChanged && displayName === professional.displayName) return ok(undefined);

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
        prisma.user.update({ where: { id: userId }, data: { name: displayName } }),
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
