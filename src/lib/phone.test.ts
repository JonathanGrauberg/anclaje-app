import { describe, expect, it } from "vitest";
import { buildPhone, formatPhone, splitPhone } from "./phone";

describe("celular", () => {
  it("arma el número argentino para WhatsApp (549 + área + número)", () => {
    expect(buildPhone("54", "11 2345 6789")).toEqual({ ok: true, value: "5491123456789" });
    expect(buildPhone("54", "343 456-7890")).toEqual({ ok: true, value: "5493434567890" });
    // Con el 0 de larga distancia o el 15 colado, igual queda bien.
    expect(buildPhone("54", "011 2345 6789")).toEqual({ ok: true, value: "5491123456789" });
    expect(buildPhone("54", "11 15 2345 6789")).toEqual({ ok: true, value: "5491123456789" });
    expect(buildPhone("54", "0343 15 456 7890")).toEqual({ ok: true, value: "5493434567890" });
  });

  it("rechaza números argentinos mal armados", () => {
    expect(buildPhone("54", "2345 6789").ok).toBe(false);
    expect(buildPhone("54", "11 2345 67890").ok).toBe(false);
    expect(buildPhone("54", "9 11 2345 6789").ok).toBe(false);
  });

  it("controla la cantidad de números de otros países", () => {
    expect(buildPhone("598", "094 123 456")).toEqual({ ok: true, value: "59894123456" });
    expect(buildPhone("598", "94 123 45").ok).toBe(false);
    expect(buildPhone("99", "123456").ok).toBe(false);
  });

  it("vuelve a separar y muestra el número", () => {
    expect(splitPhone("5491123456789")).toEqual({ code: "54", national: "1123456789" });
    expect(splitPhone("59894123456")).toEqual({ code: "598", national: "94123456" });
    expect(formatPhone("5491123456789")).toBe("+54 9 11 2345-6789");
    expect(formatPhone("5493434567890")).toBe("+54 9 343 456-7890");
  });
});
