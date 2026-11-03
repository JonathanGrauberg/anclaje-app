import { timingSafeEqual } from "node:crypto";
import {
  sendAppointmentDayBeforePushes,
  sendAppointmentReminders,
  sendAppointmentSoonPushes,
} from "@/lib/appointment-reminders";
import { NOTIFICATIONS_ENABLED } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { digestEmail, summarizeDigest } from "@/lib/digest";
import { appUrl, sendEmail } from "@/lib/email";
import { pushConfigError, pushConfigured, sendPushToUser } from "@/lib/push";
import { getPatientsWithAttention } from "@/lib/queries/pro";
import { isDigestDue, isReminderDue, reminderMessage } from "@/lib/reminders";

// Tareas programadas, con `Authorization: Bearer $CRON_SECRET`:
// - `turnos` (10 h) y `resumen` (9 h, diario o los lunes según cada profesional): Vercel Cron,
//   una vez por día (vercel.json).
// - `recordatorios` (avisos push a la hora que eligió cada paciente): un cron externo cada 10 min
//   (cron-job.org; el plan gratis de Vercel no permite más de una vez por día). En dev, `npm run cron`.
// Son idempotentes: cada recordatorio y resumen se manda como mucho una vez por día.

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function runReminders(now: Date) {
  if (!pushConfigured()) {
    const error = pushConfigError();
    if (error) throw new Error(`Claves VAPID inválidas: ${error}`);
    return { skipped: "push sin configurar" };
  }
  const candidates = await prisma.reminderSettings.findMany({
    where: { enabled: true, user: { pushSubscriptions: { some: {} } } },
  });
  let sent = 0;
  for (const r of candidates.filter((c) => isReminderDue(c, now))) {
    // Se marca antes de mandar: si el envío falla no se reintenta en loop durante el día.
    await prisma.reminderSettings.update({ where: { id: r.id }, data: { lastSentAt: now } });
    sent += (await sendPushToUser(r.userId, { ...reminderMessage(now), url: "/app/rueda" }))
      ? 1
      : 0;
  }
  return {
    candidates: candidates.length,
    sent,
    appointmentsSoon: await sendAppointmentSoonPushes(now),
  };
}

async function runDigests(now: Date) {
  const pros = await prisma.professionalProfile.findMany({
    where: { digestFrequency: { not: "NEVER" } },
    select: {
      id: true,
      displayName: true,
      digestFrequency: true,
      lastDigestAt: true,
      user: { select: { email: true } },
    },
  });
  let sent = 0;
  for (const p of pros.filter((x) => isDigestDue(x.digestFrequency, x.lastDigestAt, now))) {
    await prisma.professionalProfile.update({ where: { id: p.id }, data: { lastDigestAt: now } });
    const summary = summarizeDigest(await getPatientsWithAttention(p.id, now));
    if (summary.empty) continue; // si no hay nada, no se manda nada
    await sendEmail({
      to: p.user.email,
      ...digestEmail(p.displayName, summary.lines, appUrl("/pro")),
    });
    sent++;
  }
  return { candidates: pros.length, sent };
}

async function handle(req: Request, ctx: RouteContext<"/api/cron/[job]">) {
  if (!authorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { job } = await ctx.params;
  const now = new Date();
  // Recordatorio de turnos por mail: no depende de los avisos push, solo de tener SMTP.
  if (job === "turnos") {
    const push = await sendAppointmentDayBeforePushes(now);
    if (!process.env.SMTP_URL) return Response.json({ skipped: "mail sin configurar", push });
    return Response.json({ ...(await sendAppointmentReminders(now)), push });
  }
  if (!NOTIFICATIONS_ENABLED) return Response.json({ skipped: "avisos apagados" });
  if (job === "recordatorios") {
    try {
      return Response.json(await runReminders(now));
    } catch (e) {
      // Sin datos de nadie: solo qué falló, para verlo en la prueba de cron-job.org.
      console.error("[cron] recordatorios:", (e as Error).message);
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  }
  if (job === "resumen") return Response.json(await runDigests(now));
  return Response.json({ error: "Tarea desconocida" }, { status: 404 });
}

export { handle as GET, handle as POST };
