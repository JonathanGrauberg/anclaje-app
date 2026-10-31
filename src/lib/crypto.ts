// Cifrado a nivel aplicación para texto libre sensible (diario, autorregistros, notas…).
// AES-256-GCM con IV aleatorio y versionado de clave.
//
// Formato: "v<versión>:<iv b64>:<authTag b64>:<datos b64>"
// Claves:  ENCRYPTION_KEYS="1:<base64 32 bytes>,2:<base64 32 bytes>"  ·  ENCRYPTION_KEY_VERSION="2"
// Se cifra siempre con la versión activa y se descifra con la que indica el propio texto,
// así que rotar es agregar una clave y cambiar la activa (sin borrar las anteriores).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const PREFIX = /^v(\d+):([^:]+):([^:]+):([^:]*)$/;

export type KeyRing = { current: number; keys: Map<number, Buffer> };

export function parseKeyRing(keysEnv: string | undefined, versionEnv: string | undefined): KeyRing {
  if (!keysEnv) throw new Error("Falta ENCRYPTION_KEYS");
  const keys = new Map<number, Buffer>();
  for (const part of keysEnv.split(",")) {
    const [rawVersion, rawKey] = part.trim().split(":");
    const version = Number(rawVersion);
    if (!Number.isInteger(version) || version < 1 || !rawKey) {
      throw new Error('ENCRYPTION_KEYS mal formada: se espera "versión:clave_base64"');
    }
    const key = Buffer.from(rawKey, "base64");
    if (key.length !== 32) throw new Error(`La clave v${version} tiene que ser de 32 bytes`);
    keys.set(version, key);
  }
  const current = Number(versionEnv ?? Math.max(...keys.keys()));
  if (!keys.has(current))
    throw new Error(`ENCRYPTION_KEY_VERSION=${current} no está en ENCRYPTION_KEYS`);
  return { current, keys };
}

let cachedRing: KeyRing | null = null;
function defaultRing(): KeyRing {
  cachedRing ??= parseKeyRing(process.env.ENCRYPTION_KEYS, process.env.ENCRYPTION_KEY_VERSION);
  return cachedRing;
}

export function encrypt(plain: string, ring: KeyRing = defaultRing()): string {
  const key = ring.keys.get(ring.current)!;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${ring.current}:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decrypt(payload: string, ring: KeyRing = defaultRing()): string {
  const match = PREFIX.exec(payload);
  if (!match) throw new Error("Texto cifrado con formato inválido");
  const [, rawVersion, iv, tag, data] = match;
  const key = ring.keys.get(Number(rawVersion));
  if (!key) throw new Error(`No hay clave para la versión v${rawVersion}`);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

export function encryptOptional(plain: string | null | undefined): string | null {
  return plain ? encrypt(plain) : null;
}

export function decryptOptional(payload: string | null | undefined): string | null {
  return payload ? decrypt(payload) : null;
}

/** Versión de clave con la que se cifró un texto (útil para re-cifrar al rotar). */
export function keyVersionOf(payload: string): number | null {
  const match = PREFIX.exec(payload);
  return match ? Number(match[1]) : null;
}
