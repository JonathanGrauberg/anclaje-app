import { describe, expect, it } from "vitest";
import { CODE_LENGTH, formatCode, generateCode, normalizeCode } from "./invitations";

describe("códigos de invitación", () => {
  it("genera códigos válidos y normalizables", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(normalizeCode(formatCode(code))).toBe(code);
    }
  });

  it("acepta minúsculas, espacios y guiones", () => {
    expect(normalizeCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(normalizeCode("abcd efgh")).toBe("ABCDEFGH");
  });

  it("rechaza largos incorrectos y caracteres ambiguos", () => {
    expect(normalizeCode("ABC")).toBeNull();
    expect(normalizeCode("ABCDEFG0")).toBeNull();
    expect(normalizeCode("ABCDEFGI")).toBeNull();
  });
});
