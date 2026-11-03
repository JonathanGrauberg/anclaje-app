import "server-only";
import { prisma } from "@/lib/db";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { NOTIFY_DEFAULTS, type NotifyKind, type PushMessage } from "@/lib/push-messages";

// Avisos al celular por evento (turno nuevo, devolución, tarea…). Respetan lo que cada persona
// eligió en Ajustes y nunca frenan la acción que los dispara: si el envío falla, se sigue igual.

/** ¿Esta persona quiere este aviso? Sin preferencias guardadas, valen las de por defecto. */
export async function wantsNotification(userId: string, kind: NotifyKind) {
  const prefs = await prisma.notificationPrefs.findUnique({
    where: { userId },
    select: { [kind]: true },
  });
  return (prefs as Record<NotifyKind, boolean> | null)?.[kind] ?? NOTIFY_DEFAULTS[kind];
}

export async function notifyUser(userId: string, kind: NotifyKind, message: PushMessage) {
  if (!pushConfigured()) return 0;
  try {
    if (!(await wantsNotification(userId, kind))) return 0;
    return await sendPushToUser(userId, message);
  } catch (e) {
    console.error(`[aviso] no se pudo mandar: ${kind}`, (e as Error).message);
    return 0;
  }
}

/** Al paciente (perfil). Los pacientes sin la app no tienen cuenta: no les llega nada. */
export async function notifyPatient(patientId: string, kind: NotifyKind, message: PushMessage) {
  if (!pushConfigured()) return 0;
  const p = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  return p?.userId ? notifyUser(p.userId, kind, message) : 0;
}

/** A la profesional (perfil). */
export async function notifyProfessional(
  professionalId: string,
  kind: NotifyKind,
  message: PushMessage,
) {
  if (!pushConfigured()) return 0;
  const p = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { userId: true },
  });
  return p ? notifyUser(p.userId, kind, message) : 0;
}
