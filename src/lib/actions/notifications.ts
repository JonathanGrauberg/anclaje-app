"use server";

import { prisma } from "@/lib/db";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { allow } from "@/lib/rate-limit";
import { pushMessages } from "@/lib/push-messages";
import { getSession, patientForAction, professionalForAction } from "@/lib/session";
import {
  digestSchema,
  notificationPrefSchema,
  PATIENT_NOTIFY_KINDS,
  pushSubscriptionSchema,
  reminderSettingsSchema,
  type NotificationPrefInput,
  type PushSubscriptionInput,
  type ReminderSettingsInput,
} from "@/lib/validation/notifications";
import { fail, firstIssue, ok, safe } from "./result";

async function currentUserId() {
  const session = await getSession();
  if (!session) throw new Error("No autorizado");
  return session.user.id;
}

/** Guarda la suscripción push de este dispositivo (un usuario puede tener varias). */
export async function savePushSubscription(input: PushSubscriptionInput) {
  return safe(async () => {
    const userId = await currentUserId();
    const parsed = pushSubscriptionSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { endpoint, keys } = parsed.data;
    // Si el endpoint era de otro usuario (dispositivo compartido), pasa a ser de este.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });
    return ok(undefined);
  });
}

export async function removePushSubscription(endpoint: string) {
  return safe(async () => {
    const userId = await currentUserId();
    await prisma.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId } });
    return ok(undefined);
  });
}

export async function saveReminderSettings(input: ReminderSettingsInput) {
  return safe(async () => {
    const userId = await currentUserId();
    const parsed = reminderSettingsSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const days = [...new Set(parsed.data.days)].sort();
    await prisma.reminderSettings.upsert({
      where: { userId },
      update: { enabled: parsed.data.enabled, time: parsed.data.time, days },
      create: { userId, enabled: parsed.data.enabled, time: parsed.data.time, days },
    });
    return ok(undefined);
  });
}

/** Manda una notificación de prueba a los dispositivos del usuario. */
export async function sendTestNotification() {
  return safe(async () => {
    const session = await getSession();
    if (!session) throw new Error("No autorizado");
    const userId = session.user.id;
    if (!pushConfigured()) return fail("Las notificaciones no están configuradas en el servidor.");
    if (!allow(`push-test:${userId}`, 3, 10 * 60_000)) return fail("Esperá unos minutos.");
    const delivered = await sendPushToUser(
      userId,
      pushMessages.test(session.user.role === "PROFESSIONAL"),
    );
    if (!delivered) return fail("No encontramos este dispositivo. Volvé a activar los avisos.");
    return ok(undefined);
  });
}

/** Resumen por email de la profesional: diario, semanal o nunca. */
export async function saveDigestFrequency(frequency: "DAILY" | "WEEKLY" | "NEVER") {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const parsed = digestSchema.safeParse({ frequency });
    if (!parsed.success) return fail(firstIssue(parsed.error));
    await prisma.professionalProfile.update({
      where: { id: professional.id },
      data: { digestFrequency: parsed.data.frequency },
    });
    return ok(undefined);
  });
}

/** Recordatorio de turnos por mail: la profesional lo apaga para todos sus pacientes. */
export async function saveAppointmentReminders(enabled: boolean) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    await prisma.professionalProfile.update({
      where: { id: professional.id },
      data: { appointmentReminders: enabled === true },
    });
    return ok(undefined);
  });
}

/** Recordatorio de turnos por mail: el paciente decide si lo recibe. */
export async function saveAppointmentEmails(enabled: boolean) {
  return safe(async () => {
    const patient = await patientForAction();
    await prisma.patientProfile.update({
      where: { id: patient.id },
      data: { appointmentEmails: enabled === true },
    });
    return ok(undefined);
  });
}

/** Prende o apaga un tipo de aviso al celular. Cada lado solo puede tocar los suyos. */
export async function saveNotificationPref(input: NotificationPrefInput) {
  return safe(async () => {
    const session = await getSession();
    if (!session) throw new Error("No autorizado");
    const parsed = notificationPrefSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { kind, enabled } = parsed.data;
    const patientKind = (PATIENT_NOTIFY_KINDS as readonly string[]).includes(kind);
    if (patientKind !== (session.user.role === "PATIENT")) return fail("No autorizado");
    await prisma.notificationPrefs.upsert({
      where: { userId: session.user.id },
      update: { [kind]: enabled },
      create: { userId: session.user.id, [kind]: enabled },
    });
    return ok(undefined);
  });
}
