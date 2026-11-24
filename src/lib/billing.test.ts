import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { billingState, joinedInLaunch, planCharge } from "./billing";
import { mpManifest, verifyMpSignature } from "./mp-signature";

const UNTIL = "2026-11-30";
const dec = (d: number, h = 15) => new Date(Date.UTC(2026, 11, d, h));
const sub = (status: string, nextPaymentAt: Date | null = null) => ({
  plan: "mensual",
  amount: 20000,
  status,
  nextPaymentAt,
  createdAt: dec(10),
});

describe("billingState", () => {
  it("quien se sumó hasta el 30 de noviembre (hora de Buenos Aires) es gratis para siempre", () => {
    expect(joinedInLaunch(new Date("2026-12-01T02:30:00Z"), UNTIL)).toBe(true); // 23:30 del 30
    expect(joinedInLaunch(new Date("2026-12-01T03:30:00Z"), UNTIL)).toBe(false);
    const s = billingState({
      createdAt: new Date("2026-11-20T12:00:00Z"),
      freeForever: false,
      sub: null,
      now: dec(90),
      until: UNTIL,
    });
    expect(s.kind).toBe("free");
  });

  it("el pedido por formulario en el lanzamiento y la marca del admin también", () => {
    expect(
      billingState({
        createdAt: dec(5),
        freeForever: false,
        leadInLaunch: true,
        sub: null,
        now: dec(30),
        until: UNTIL,
      }).kind,
    ).toBe("free");
    expect(
      billingState({ createdAt: dec(5), freeForever: true, sub: null, now: dec(30), until: UNTIL })
        .kind,
    ).toBe("free");
  });

  it("14 días de prueba desde el alta y después se bloquea", () => {
    const trial = billingState({
      createdAt: dec(2),
      freeForever: false,
      sub: null,
      now: dec(10),
      until: UNTIL,
    });
    expect(trial.kind).toBe("trial");
    if (trial.kind === "trial") expect(trial.daysLeft).toBe(6);
    const blocked = billingState({
      createdAt: dec(2),
      freeForever: false,
      sub: null,
      now: dec(16, 16),
      until: UNTIL,
    });
    expect(blocked).toMatchObject({ kind: "blocked", access: false });
  });

  it("con la suscripción autorizada tiene acceso; una pendiente no alcanza", () => {
    expect(
      billingState({
        createdAt: dec(2),
        freeForever: false,
        sub: sub("authorized"),
        now: dec(25),
        until: UNTIL,
      }).kind,
    ).toBe("active");
    expect(
      billingState({
        createdAt: dec(2),
        freeForever: false,
        sub: sub("pending"),
        now: dec(25),
        until: UNTIL,
      }).access,
    ).toBe(false);
  });

  it("si cancela, sigue hasta el próximo débito", () => {
    const s = billingState({
      createdAt: dec(2),
      freeForever: false,
      sub: sub("canceled", dec(28)),
      now: dec(25),
      until: UNTIL,
    });
    expect(s.kind).toBe("ending");
    expect(
      billingState({
        createdAt: dec(2),
        freeForever: false,
        sub: sub("canceled", dec(28)),
        now: dec(29),
        until: UNTIL,
      }).access,
    ).toBe(false);
  });

  it("cobra el total del período", () => {
    expect(planCharge("mensual")).toBe(20000);
    expect(planCharge("semestral")).toBe(108000);
    expect(planCharge("anual")).toBe(180000);
  });

  it("la cuenta de prueba de cobros no tiene gratis ni días de prueba", () => {
    const s = billingState({
      createdAt: new Date("2026-11-20T12:00:00Z"),
      freeForever: false,
      leadInLaunch: true,
      billingTest: true,
      sub: null,
      now: new Date("2026-11-24T12:00:00Z"),
      until: UNTIL,
    });
    expect(s).toMatchObject({ kind: "blocked", access: false });
  });
});

describe("firma del webhook de Mercado Pago", () => {
  const secret = "secreto-de-prueba";
  const ts = "1764000000";
  const now = Number(ts) * 1000 + 5000;
  const v1 = createHmac("sha256", secret)
    .update(mpManifest("123456", "req-1", ts))
    .digest("hex");

  it("arma el manifiesto como el SDK", () => {
    expect(mpManifest("123456", "req-1", ts)).toBe(`id:123456;request-id:req-1;ts:${ts};`);
    expect(mpManifest(null, null, ts)).toBe(`ts:${ts};`);
  });

  it("acepta la firma correcta y rechaza otra clave, otro id o una vieja", () => {
    const base = {
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: "req-1",
      dataId: "123456",
      secret,
      now,
    };
    expect(verifyMpSignature(base)).toBe(true);
    expect(verifyMpSignature({ ...base, secret: "otra" })).toBe(false);
    expect(verifyMpSignature({ ...base, dataId: "999" })).toBe(false);
    expect(verifyMpSignature({ ...base, now: now + 3_600_000 })).toBe(false);
    expect(verifyMpSignature({ ...base, xSignature: null })).toBe(false);
  });
});
