"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { decrypt, decryptOptional, encrypt, encryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { appUrl, sendEmailQuietly } from "@/lib/email";
import { createManagedPatient } from "@/lib/managed-patients";
import { getPublicProfile, hashToken, newToken } from "@/lib/public-profile";
import { allow } from "@/lib/rate-limit";
import { professionalForAction } from "@/lib/session";
import {
  appointmentRequestSchema,
  type AppointmentRequestInput,
} from "@/lib/validation/public-profile";
import { fail, firstIssue, ok, safe } from "./result";

// Solicitudes de turno desde el perfil público. Quien la manda confirma su mail primero (así no
// llegan pedidos con mails ajenos ni de bots); recién ahí le avisamos a la profesional.

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Pública: no requiere sesión. */
export async function requestAppointment(input: AppointmentRequestInput) {
  return safe(async () => {
    const parsed = appointmentRequestSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const v = parsed.data;
    if (v.website) return ok(undefined); // bot: se descarta en silencio
    const ip = await clientIp();
    if (
      !allow(`turno-ip:${ip}`, 5, 60 * 60_000) ||
      !allow(`turno-mail:${v.email}`, 3, 24 * 60 * 60_000)
    )
      return fail("Mandaste varias solicitudes seguidas. Probá más tarde.");

    const pro = await getPublicProfile(v.slug);
    if (!pro || !pro.acceptsRequests)
      return fail("Esta profesional no está recibiendo solicitudes.");
    if (!allow(`turno-pro:${pro.id}`, 40, 24 * 60 * 60_000))
      return fail("Esta profesional recibió muchas solicitudes hoy. Probá mañana.");

    const token = newToken();
    await prisma.appointmentRequest.create({
      data: {
        professionalId: pro.id,
        nameEnc: encrypt(v.name),
        emailEnc: encrypt(v.email),
        phoneEnc: encryptOptional(v.phone),
        messageEnc: encryptOptional(v.message),
        modality: v.modality === "ANY" ? null : v.modality,
        tokenHash: hashToken(token),
      },
    });
    const link = appUrl(`/turno/confirmar?t=${token}`);
    after(() =>
      sendEmailQuietly(
        {
          to: v.email,
          subject: `Confirmá tu solicitud de turno con ${pro.displayName}`,
          text: [
            `Hola, ${v.name.split(" ")[0]}:`,
            `\nPara que tu solicitud le llegue a ${pro.displayName}, confirmá que este es tu mail:`,
            link,
            `\nEl link vence en 3 días. Si no fuiste vos, ignorá este mail y no se manda nada.`,
            `\nAnclaje`,
          ].join("\n"),
        },
        "confirmar solicitud de turno",
      ),
    );
    return ok(undefined);
  });
}

// ─── Lado profesional ───

async function ownRequest(id: string, professionalId: string) {
  return prisma.appointmentRequest.findFirst({
    where: { id: String(id), professionalId, status: { not: "UNCONFIRMED" } },
  });
}

/** Marca (o desmarca) "ya la contacté". */
export async function markRequestContacted(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await ownRequest(id, professional.id);
    if (!r) return fail("No encontramos esa solicitud");
    await prisma.appointmentRequest.update({
      where: { id: r.id },
      data: { status: r.status === "CONTACTED" ? "NEW" : "CONTACTED" },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "AppointmentRequest",
      entityId: r.id,
    });
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}

/** Crea la ficha (paciente sin la app) con su nombre y contacto. Después la puede invitar. */
export async function acceptRequest(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await ownRequest(id, professional.id);
    if (!r) return fail("No encontramos esa solicitud");
    if (r.patientId) return ok({ patientId: r.patientId });
    const contact = [decrypt(r.emailEnc), decryptOptional(r.phoneEnc)].filter(Boolean).join(" · ");
    const patient = await prisma.$transaction(async (tx) => {
      const p = await createManagedPatient(tx, professional.id, {
        name: decrypt(r.nameEnc).slice(0, 120),
        contact: contact.slice(0, 300),
      });
      await tx.appointmentRequest.update({
        where: { id: r.id },
        data: { status: "ACCEPTED", patientId: p.id },
      });
      return p;
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "ManagedPatient",
      entityId: patient.id,
      patientId: patient.id,
      meta: { fromRequest: r.id },
    });
    revalidatePath("/pro", "layout");
    return ok({ patientId: patient.id });
  });
}

/** Borra la solicitud y sus datos. */
export async function deleteRequest(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await ownRequest(id, professional.id);
    if (!r) return fail("No encontramos esa solicitud");
    await prisma.appointmentRequest.delete({ where: { id: r.id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "AppointmentRequest",
      entityId: r.id,
    });
    revalidatePath("/pro", "layout");
    return ok(undefined);
  });
}
