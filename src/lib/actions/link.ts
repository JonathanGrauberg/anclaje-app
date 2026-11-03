"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { CONSENT_VERSION } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { appUrl, sendEmailQuietly } from "@/lib/email";
import { patientLinkedEmail } from "@/lib/emails";
import { normalizeCode } from "@/lib/invitations";
import { mergeManagedPatient } from "@/lib/managed-patients";
import { allow } from "@/lib/rate-limit";
import { patientForAction } from "@/lib/session";
import {
  acceptInvitationSchema,
  sharingDefaultsSchema,
  type AcceptInvitationInput,
  type SharingDefaultsInput,
} from "@/lib/validation/pro";
import { fail, firstIssue, ok, safe } from "./result";

/** El paciente acepta una invitación + el consentimiento informado (se guarda versión y fecha). */
export async function acceptInvitation(input: AcceptInvitationInput) {
  return safe(async () => {
    const patient = await patientForAction();
    if (!allow(`invite:${patient.id}`, 10, 10 * 60_000)) {
      return fail("Probaste muchos códigos seguidos. Esperá unos minutos.");
    }
    const parsed = acceptInvitationSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const code = normalizeCode(parsed.data.code);
    if (!code) return fail("Ese código no es válido");

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // Marcar como usada solo si sigue disponible: evita que dos personas usen el mismo código.
      const claimed = await tx.invitation.updateMany({
        where: { code, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now, usedById: patient.id },
      });
      if (claimed.count === 0) return null;
      const invitation = await tx.invitation.findUniqueOrThrow({ where: { code } });
      // Si la profesional ya lo tenía cargado "sin la app", sus turnos e historia pasan a esta cuenta.
      const merged = invitation.patientId
        ? await mergeManagedPatient(tx, invitation.patientId, invitation.professionalId, patient.id)
        : false;
      const link = await tx.careLink.upsert({
        where: {
          patientId_professionalId: {
            patientId: patient.id,
            professionalId: invitation.professionalId,
          },
        },
        update: {
          status: "ACTIVE",
          revokedAt: null,
          consentVersion: CONSENT_VERSION,
          consentAcceptedAt: now,
        },
        create: {
          patientId: patient.id,
          professionalId: invitation.professionalId,
          consentVersion: CONSENT_VERSION,
          consentAcceptedAt: now,
        },
      });
      return { ...link, merged };
    });
    if (!result) return fail("El código venció o ya se usó. Pedile uno nuevo a tu psicóloga.");

    await audit({
      actorId: patient.userId,
      action: "create",
      entityType: "CareLink",
      entityId: result.id,
      patientId: patient.id,
      meta: { consentVersion: CONSENT_VERSION, merged: result.merged },
    });
    const pro = await prisma.professionalProfile.findUnique({
      where: { id: result.professionalId },
      select: { displayName: true, user: { select: { email: true } } },
    });
    if (pro) {
      await sendEmailQuietly(
        {
          to: pro.user.email,
          ...patientLinkedEmail({
            professionalName: pro.displayName,
            url: appUrl("/pro"),
            merged: result.merged,
          }),
        },
        "vinculación",
      );
    }
    revalidatePath("/app", "layout");
    return ok(undefined);
  });
}

/** Desvincularse: la profesional deja de ver todo lo del paciente (pasado y futuro). */
export async function unlinkProfessional(linkId: string) {
  return safe(async () => {
    const patient = await patientForAction();
    const res = await prisma.careLink.updateMany({
      where: { id: linkId, patientId: patient.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (res.count === 0) return fail("No encontramos ese vínculo");
    // Los turnos futuros con esa profesional se cancelan.
    const link = await prisma.careLink.findUnique({
      where: { id: linkId },
      select: { professionalId: true },
    });
    if (link) {
      await prisma.appointment.updateMany({
        where: {
          patientId: patient.id,
          professionalId: link.professionalId,
          status: "SCHEDULED",
          startsAt: { gte: new Date() },
        },
        data: { status: "CANCELLED", cancelledBy: "PATIENT", cancelledAt: new Date() },
      });
    }
    await audit({
      actorId: patient.userId,
      action: "update",
      entityType: "CareLink",
      entityId: linkId,
      patientId: patient.id,
      meta: { status: "REVOKED" },
    });
    revalidatePath("/app", "layout");
    return ok(undefined);
  });
}

export async function updateSharingDefaults(input: SharingDefaultsInput) {
  return safe(async () => {
    const patient = await patientForAction();
    const parsed = sharingDefaultsSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    await prisma.sharingDefaults.upsert({
      where: { patientId: patient.id },
      update: parsed.data,
      create: { patientId: patient.id, ...parsed.data },
    });
    revalidatePath("/app/ajustes");
    return ok(undefined);
  });
}
