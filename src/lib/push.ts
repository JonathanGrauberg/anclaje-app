import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

// Web Push. El contenido de una notificación NUNCA lleva datos clínicos ni del paciente:
// se ve en la pantalla bloqueada. Solo un título amable y a dónde llevar al tocarla.

export type PushPayload = { title: string; body: string; url: string };

let configured: boolean | null = null;

export function pushConfigured() {
  if (configured === null) {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    configured = Boolean(pub && priv);
    if (configured) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hola@anclaje.test", pub!, priv!);
    }
  }
  return configured;
}

/** Manda a todos los dispositivos del usuario. Borra las suscripciones vencidas. Devuelve cuántos llegaron. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6, urgency: "normal" },
        );
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error(`Push falló (${status ?? "sin status"})`);
        }
      }
    }),
  );
  return delivered;
}
