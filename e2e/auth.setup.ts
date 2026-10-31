import { existsSync } from "node:fs";
import { test as setup } from "@playwright/test";
import { PATIENT, PATIENT_2, PRO, STATE, signIn } from "./helpers";

// Una sesión por rol. Si la guardada sigue valiendo se reusa: el ingreso tiene un límite de
// intentos por minuto y correr los tests seguido lo agotaría.
for (const [key, email] of [
  ["patient", PATIENT],
  ["patient2", PATIENT_2],
  ["pro", PRO],
] as const) {
  setup(`sesión de ${email}`, async ({ browser }) => {
    if (existsSync(STATE[key])) {
      const ctx = await browser.newContext({ storageState: STATE[key] });
      const res = await ctx.request.get("/api/auth/get-session");
      const session = res.ok() ? await res.json().catch(() => null) : null;
      await ctx.close();
      if (session?.user?.email === email) return;
    }
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, email);
    await ctx.storageState({ path: STATE[key] });
    await ctx.close();
  });
}
