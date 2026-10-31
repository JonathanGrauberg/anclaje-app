import { expect, test } from "@playwright/test";
import { PRO, STATE } from "./helpers";

test("sin sesión, /app manda a ingresar", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/ingresar/);
});

test("contraseña incorrecta muestra un error", async ({ page }) => {
  await page.goto("/ingresar");
  await page.getByLabel("Email").fill(PRO);
  await page.getByLabel("Contraseña").fill("no-es-esta-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/no coinciden|muchos intentos/i)).toBeVisible();
  await expect(page).toHaveURL(/\/ingresar/);
});

test.describe("paciente", () => {
  test.use({ storageState: STATE.patient });

  test("entra a su inicio y no puede abrir el panel profesional", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/app$/);
    await page.goto("/pro");
    await expect(page).toHaveURL(/\/app$/);
  });
});
