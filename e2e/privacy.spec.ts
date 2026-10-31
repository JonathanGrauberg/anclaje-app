import { expect, test } from "@playwright/test";
import { STATE, unique } from "./helpers";

test("una entrada privada del diario no la ve la psicóloga", async ({ browser }) => {
  const secret = unique("privado");

  const patient = await browser.newContext({ storageState: STATE.patient });
  const p = await patient.newPage();
  await p.goto("/app/diario/nueva");
  await p.getByLabel("Entrada del diario").fill(`Esto es solo para mí: ${secret}`);
  await expect(p.getByText("Compartir con mi psicóloga")).toBeVisible();
  await p.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(p).toHaveURL(/\/app\/diario$/);
  await expect(p.getByText(secret)).toBeVisible();
  await patient.close();

  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();
  await q.goto("/pro");
  await q.getByRole("link", { name: /Sofía/ }).first().click();
  await expect(q.getByRole("heading", { level: 1, name: "Sofía" })).toBeVisible();
  await q.goto(`${q.url().split("?")[0]}?tipo=diario`);
  await expect(q.getByText(secret)).toHaveCount(0);
  await pro.close();
});

test("un paciente sin vínculo no ve el panel ni archivos ajenos", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: STATE.patient2 });
  const page = await ctx.newPage();
  const res = await page.request.get("/api/files/resources/00000000000000000000000000000000.pdf");
  expect(res.status()).toBe(404);
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/app$/);
  await ctx.close();
});
