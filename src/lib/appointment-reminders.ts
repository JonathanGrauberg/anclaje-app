import "server-only";
import { decryptOptional } from "@/lib/crypto";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email";
import { appointmentReminderEmail, extractEmail } from "@/lib/emails";
import { notifyUser } from "@/lib/notify";
import { pushConfigured } from "@/lib/push";
import { pushMessages } from "@/lib/push-messages";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Manda el recordatorio de los turnos de MAÑANA (día de Buenos Aires). Lo corre el cron una vez
 * por día. Idempotente: cada turno se marca con `reminderSentAt` antes de mandar, así un segundo
 * llamado el mismo día no repite. Al paciente con la app le llega a su email de la cuenta; al que
 * no la tiene, solo si su profesional cargó un mail en el contacto.
 */
export async function sendAppointmentReminders(now = new Date()) {
  const tomorrow = dayKey(new Date(now.getTime() + DAY));
  const from = new Date(`${tomorrow}T00:00:00-03:00`);
  const to = new Date(from.getTime() + DAY);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      startsAt: { gte: from, lt: to },
      professional: { appointmentReminders: true },
      patient: { appointmentEmails: true },
    },
    select: {
      id: true,
      startsAt: true,
      durationMin: true,
      modality: true,
      place: true,
      professional: { select: { displayName: true } },
      patient: {
        select: {
          displayName: true,
          contactEnc: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });

  let sent = 0;
  let withoutEmail = 0;
  for (const a of appointments) {
    const email = a.patient.user?.email ?? extractEmail(decryptOptional(a.patient.contactEnc));
    if (!email) {
      withoutEmail++;
      continue;
    }
    const claimed = await prisma.appointment.updateMany({
      where: { id: a.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;
    try {
      await sendEmail({
        to: email,
        ...appointmentReminderEmail({
          patientName: a.patient.displayName ?? a.patient.user?.name ?? null,
          professionalName: a.professional.displayName,
          startsAt: a.startsAt,
          durationMin: a.durationMin,
          modality: a.modality,
          place: a.place,
          appUrl: a.patient.user ? appUrl("/app/turnos") : null,
        }),
      });
      sent++;
    } catch (e) {
      // No se reintenta: mejor un recordatorio de menos que mandar dos. Sin datos del paciente en el log.
      console.error("[recordatorio de turno] falló el envío", a.id, (e as Error).message);
    }
  }
  return { day: tomorrow, appointments: appointments.length, sent, withoutEmail };
}

const DAY_MS = DAY;

/**
 * Aviso al celular de los turnos de MAÑANA (lo corre el mismo cron que el mail). Se respeta el
 * interruptor de la profesional y el de cada paciente. Idempotente con `pushDayBeforeAt`.
 */
export async function sendAppointmentDayBeforePushes(now = new Date()) {
  if (!pushConfigured()) return { skipped: "push sin configurar" };
  const from = new Date(`${dayKey(new Date(now.getTime() + DAY_MS))}T00:00:00-03:00`);
  return pushAppointments(
    { gte: from, lt: new Date(from.getTime() + DAY_MS) },
    "pushDayBeforeAt",
    now,
  );
}

/** Aviso unas 2 horas antes (lo corre el cron de cada 10 minutos). Idempotente con `pushSoonAt`. */
export async function sendAppointmentSoonPushes(now = new Date()) {
  if (!pushConfigured()) return { skipped: "push sin configurar" };
  const t = now.getTime();
  return pushAppointments(
    { gte: new Date(t + 60 * 60_000), lte: new Date(t + 2 * 60 * 60_000) },
    "pushSoonAt",
    now,
  );
}

async function pushAppointments(
  startsAt: { gte: Date; lt?: Date; lte?: Date },
  claim: "pushDayBeforeAt" | "pushSoonAt",
  now: Date,
) {
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      [claim]: null,
      startsAt,
      professional: { appointmentReminders: true },
      patient: { userId: { not: null } },
    },
    select: { id: true, startsAt: true, patient: { select: { userId: true } } },
  });
  let sent = 0;
  for (const a of appointments) {
    const claimed = await prisma.appointment.updateMany({
      where: { id: a.id, [claim]: null },
      data: { [claim]: now },
    });
    if (claimed.count === 0 || !a.patient.userId) continue;
    const delivered =
      claim === "pushDayBeforeAt"
        ? await notifyUser(
            a.patient.userId,
            "appointmentDayBefore",
            pushMessages.appointmentTomorrow(a.startsAt),
          )
        : await notifyUser(
            a.patient.userId,
            "appointmentSoon",
            pushMessages.appointmentSoon(a.startsAt),
          );
    if (delivered) sent++;
  }
  return { appointments: appointments.length, sent };
}
