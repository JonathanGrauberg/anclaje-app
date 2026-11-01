import { expect, test } from "@playwright/test";
import { unique } from "./helpers";

// Cuenta de prueba descartable: se crea, exporta sus datos y se borra.
test("crear cuenta, descargar mis datos y borrar la cuenta", async ({ page }) => {
  const email = `${unique("e2e")}@demo.sentir.test`;
  const password = `prueba-${Date.now()}`;

  await page.goto("/registrarse");
  await page.getByLabel("¿Cómo te gusta que te digan?").fill("Prueba");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Repetí la contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/app$/);

  await page.goto("/app/ajustes");
  const res = await page.request.get("/app/ajustes/exportar?formato=json");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.format).toBe("anclaje.patient-export");
  expect(data.account.email).toBe(email);
  const pdf = await page.request.get("/app/ajustes/exportar?formato=pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu contraseña").fill("no-es-esta");
  await dialog.getByLabel(/para confirmar/).fill("BORRAR");
  await dialog.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(dialog.getByText("La contraseña no es correcta.")).toBeVisible();

  await dialog.getByLabel("Tu contraseña").fill(password);
  await dialog.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/ingresar\?cuenta=borrada/);
  await expect(page.getByText("tu cuenta y todos tus datos se borraron")).toBeVisible();

  // La sesión ya no sirve.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/ingresar/);
});
