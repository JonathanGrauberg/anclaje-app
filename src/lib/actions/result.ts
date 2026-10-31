import type { z } from "zod";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos inválidos";
}

/** Envuelve una acción: los errores inesperados no filtran detalles al cliente. */
export async function safe<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === "No autorizado")
      return fail("Tu sesión venció. Volvé a ingresar.");
    console.error(e);
    return fail("Algo salió mal. Probá de nuevo.");
  }
}
