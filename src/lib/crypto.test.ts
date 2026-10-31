import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, keyVersionOf, parseKeyRing } from "./crypto";

const k1 = randomBytes(32).toString("base64");
const k2 = randomBytes(32).toString("base64");

describe("crypto", () => {
  it("cifra y descifra (incluye acentos y emojis)", () => {
    const ring = parseKeyRing(`1:${k1}`, "1");
    const text = "Hoy me sentí angustiada en el colectivo 🚌 — ¿por qué?";
    const enc = encrypt(text, ring);
    expect(enc).not.toContain("angustiada");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decrypt(enc, ring)).toBe(text);
  });

  it("usa un IV distinto en cada cifrado", () => {
    const ring = parseKeyRing(`1:${k1}`, "1");
    expect(encrypt("hola", ring)).not.toBe(encrypt("hola", ring));
  });

  it("descifra textos de una clave anterior después de rotar", () => {
    const old = parseKeyRing(`1:${k1}`, "1");
    const enc = encrypt("secreto", old);
    const rotated = parseKeyRing(`1:${k1},2:${k2}`, "2");
    expect(decrypt(enc, rotated)).toBe("secreto");
    const fresh = encrypt("nuevo", rotated);
    expect(keyVersionOf(fresh)).toBe(2);
  });

  it("detecta texto manipulado", () => {
    const ring = parseKeyRing(`1:${k1}`, "1");
    const enc = encrypt("no tocar", ring);
    const parts = enc.split(":");
    const data = Buffer.from(parts[3], "base64");
    data[0] ^= 0xff;
    parts[3] = data.toString("base64");
    expect(() => decrypt(parts.join(":"), ring)).toThrow();
  });

  it("valida la configuración de claves", () => {
    expect(() => parseKeyRing(undefined, "1")).toThrow();
    expect(() => parseKeyRing("1:corta", "1")).toThrow(/32 bytes/);
    expect(() => parseKeyRing(`1:${k1}`, "3")).toThrow();
  });
});
