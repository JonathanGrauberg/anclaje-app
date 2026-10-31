import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "sentir-demo-2026";
export const PATIENT = "paciente@demo.sentir.test";
export const PATIENT_2 = "paciente2@demo.sentir.test";
export const PRO = "psicologa@demo.sentir.test";

/** Sesiones guardadas por `auth.setup.ts`. */
export const STATE = {
  patient: "e2e/.auth/paciente.json",
  patient2: "e2e/.auth/paciente2.json",
  pro: "e2e/.auth/psicologa.json",
};

/** Ingresa por el formulario real. */
export async function signIn(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/(app|pro)(\/|$)/);
}

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
