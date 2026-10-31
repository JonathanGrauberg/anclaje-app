"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { patientForAction } from "@/lib/session";
import { fail, firstIssue, ok, safe } from "./result";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Escribí tu contraseña").max(128),
  confirmation: z.literal("BORRAR", { message: "Escribí BORRAR para confirmar" }),
});

/** Borra la cuenta del paciente y todos sus datos. No se puede deshacer. */
export async function deleteMyAccount(input: { password: string; confirmation: string }) {
  return safe(async () => {
    const patient = await patientForAction();
    if (!allow(`delete-account:${patient.id}`, 5, 15 * 60_000))
      return fail("Probaste muchas veces. Esperá unos minutos.");
    const parsed = deleteAccountSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    try {
      await auth.api.deleteUser({
        body: { password: parsed.data.password },
        headers: await headers(),
      });
    } catch (e) {
      if (e instanceof APIError) {
        const msg = String(e.body?.message ?? "");
        if (/password/i.test(msg)) return fail("La contraseña no es correcta.");
        return fail(msg || "No pudimos borrar la cuenta.");
      }
      throw e;
    }
    return ok(undefined);
  });
}
