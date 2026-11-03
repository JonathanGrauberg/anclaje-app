import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

// Web Push. El contenido de una notificación NUNCA lleva datos clínicos ni del paciente:
// se ve en la pantalla bloqueada. Solo un título amable y a dónde llevar al tocarla.

export type PushPayload = { title: string; body: string; url: string };

let configured: boolean | null = null;
let configError: string | null = null;

/** Variable sin espacios ni comillas pegadas (es fácil copiarlas así de `npm run gen:vapid`). */
export const cleanEnv = (v: string | undefined) =>
  v?.trim().replace(/^["']|["']$/g, "") || undefined;

export function pushConfigured() {
  if (configured === null) {
    const pub = cleanEnv(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const priv = cleanEnv(process.env.VAPID_PRIVATE_KEY);
    let subject = cleanEnv(process.env.VAPID_SUBJECT) ?? "mailto:hola@anclaje.test";
    if (subject.includes("@") && !subject.startsWith("mailto:")) subject = `mailto:${subject}`;
    configured = Boolean(pub && priv);
    if (configured) {
      try {
        webpush.setVapidDetails(subject, pub!, priv!);
      } catch (e) {
        // Los mensajes de web-push dicen qué está mal (formato, largo) sin mostrar las claves.
        configured = false;
        configError = (e as Error).message;
        console.error(`[push] claves VAPID inválidas: ${configError}`);
      }
    }
  }
  return configured;
}

/** Por qué no se pudieron configurar los avisos, si las claves están pero son inválidas. */
export function pushConfigError() {
  pushConfigured();
  return configError;
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
