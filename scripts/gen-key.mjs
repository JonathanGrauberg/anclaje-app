// Genera una clave AES-256 (32 bytes) en base64 para ENCRYPTION_KEYS o un secreto para Better Auth.
import { randomBytes } from "node:crypto";

console.log(randomBytes(32).toString("base64"));
