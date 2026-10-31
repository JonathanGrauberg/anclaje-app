import "server-only";

// Límite simple en memoria (por proceso) para acciones sensibles fuera de Better Auth,
// por ejemplo probar códigos de invitación. En producción con varias instancias conviene Redis.
const hits = new Map<string, number[]>();

/** true si todavía se permite; registra el intento. */
export function allow(key: string, max: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
