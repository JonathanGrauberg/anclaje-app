import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { digestEmail, summarizeDigest } from "@/lib/digest";
import { appUrl, sendEmail } from "@/lib/email";
import { pushConfigured, sendPushToUser } from "@/lib/push";
import { getPatientsWithAttention } from "@/lib/queries/pro";
import { isDigestDue, isReminderDue, reminderMessage } from "@/lib/reminders";

// Tareas programadas. Las llama un cron externo (Vercel Cron, GitHub Actions, `npm run cron` en
// dev) cada 5–15 minutos con `Authorization: Bearer $CRON_SECRET`. Son idempotentes: cada
// recordatorio y resumen se manda como mucho una vez por día.

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function runReminders(now: Date) {
  if (!pushConfigured()) return { skipped: "push sin configurar" };
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
  return { candidates: candidates.length, sent };
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
  if (job === "recordatorios") return Response.json(await runReminders(now));
  if (job === "resumen") return Response.json(await runDigests(now));
  return Response.json({ error: "Tarea desconocida" }, { status: 404 });
}

export { handle as GET, handle as POST };
