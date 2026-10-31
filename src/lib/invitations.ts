// Códigos de invitación: 8 caracteres sin ambiguos (sin 0/O, 1/I/L), mostrados "ABCD-EFGH".
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;
export const INVITATION_DAYS = 7;

export function generateCode() {
  // Rechazo de bytes ≥ 248 (8 × 31) para que todos los caracteres sean equiprobables.
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(CODE_LENGTH))) {
      if (b < 248 && code.length < CODE_LENGTH) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return code;
}

/** "abcd efgh" / "ABCD-EFGH" → "ABCDEFGH". null si no tiene forma de código. */
export function normalizeCode(input: string) {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) return null;
  if ([...code].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return code;
}

export function formatCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
