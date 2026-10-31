import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Capa de almacenamiento de archivos. En dev: disco local (carpeta `storage/`, fuera de git).
// En producción: S3 o compatible (Cloudflare R2, MinIO…), con el bucket PRIVADO y cifrado en reposo.
// Los archivos NUNCA se sirven estáticos: pasan por /api/files, que chequea permisos.

export type StoredFile = { data: Buffer; contentType: string };

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;
export type AllowedType = keyof typeof ALLOWED_TYPES;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EXT_TO_TYPE = Object.fromEntries(
  Object.entries(ALLOWED_TYPES).map(([type, ext]) => [ext, type]),
) as Record<string, AllowedType>;

/** Tipo real según los primeros bytes (no confiamos en lo que dice el navegador). */
export function sniffType(data: Buffer): AllowedType | null {
  if (data.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (
    data.subarray(0, 4).toString("latin1") === "RIFF" &&
    data.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "image/webp";
  return null;
}

const KEY_RE = /^[a-z]+\/[a-f0-9]{32}\.(pdf|png|jpg|webp)$/;
export const isValidKey = (key: string) => KEY_RE.test(key);

export function newStorageKey(scope: "resources" | "external", type: AllowedType) {
  return `${scope}/${randomBytes(16).toString("hex")}.${ALLOWED_TYPES[type]}`;
}

function localDriver(root: string): StorageDriver {
  const resolve = (key: string) => {
    if (!isValidKey(key)) throw new Error("Clave de archivo inválida");
    return path.join(root, ...key.split("/"));
  };
  return {
    async put(key, data) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    },
    async get(key) {
      try {
        const data = await readFile(resolve(key));
        const ext = key.split(".").pop()!;
        return { data, contentType: EXT_TO_TYPE[ext] ?? "application/octet-stream" };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
  };
}

/** S3 o compatible. Para R2: S3_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com y S3_REGION=auto. */
function s3Driver(): StorageDriver {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("Falta S3_BUCKET");
  const client = new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  const check = (key: string) => {
    if (!isValidKey(key)) throw new Error("Clave de archivo inválida");
    return key;
  };
  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: check(key),
          Body: data,
          ContentType: contentType,
          ServerSideEncryption: process.env.S3_SSE === "none" ? undefined : "AES256",
        }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: check(key) }));
        if (!res.Body) return null;
        const data = Buffer.from(await res.Body.transformToByteArray());
        const ext = key.split(".").pop()!;
        return { data, contentType: EXT_TO_TYPE[ext] ?? "application/octet-stream" };
      } catch (e) {
        if (e instanceof NoSuchKey || (e as { name?: string }).name === "NoSuchKey") return null;
        throw e;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: check(key) }));
    },
  };
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  if (kind === "s3") driver = s3Driver();
  else if (kind === "local")
    // La carpeta se resuelve en runtime: que el build no intente empaquetarla.
    driver = localDriver(
      path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        process.env.STORAGE_LOCAL_DIR ?? "storage",
      ),
    );
  else throw new Error(`STORAGE_DRIVER desconocido: ${kind}`);
  return driver;
}
