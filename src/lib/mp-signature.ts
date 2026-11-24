// Firma de los webhooks de Mercado Pago (header x-signature: "ts=...,v1=..."). Igual que el
// WebhookSignatureValidator del SDK oficial: HMAC-SHA256 con la clave secreta del webhook sobre
// "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" (los pares sin valor se omiten).
// Puro para poder probarlo.

import { createHmac, timingSafeEqual } from "node:crypto";

export function mpManifest(dataId: string | null, requestId: string | null, ts: string) {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return parts.join(";") + ";";
}

const sign = (secret: string, manifest: string) =>
  createHmac("sha256", secret).update(manifest).digest("hex");

const same = (a: string, b: string) =>
  Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** true si la notificación la firmó Mercado Pago con esta clave y no es de hace más de 10 min. */
export function verifyMpSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
  toleranceSeconds?: number;
}) {
  const { xSignature, xRequestId, dataId, secret, now = Date.now(), toleranceSeconds = 600 } = opts;
  if (!xSignature || !secret) return false;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;
  if (Math.abs(now - Number(ts) * 1000) / 1000 > toleranceSeconds) return false;
  // La doc pide el data.id en minúsculas si es alfanumérico; el SDK lo usa tal cual: vale cualquiera.
  const ids = dataId ? [...new Set([dataId, dataId.toLowerCase()])] : [null];
  return ids.some((id) => same(sign(secret, mpManifest(id, xRequestId, ts!)), v1!));
}
