import { expect, test } from "@playwright/test";
import { STATE, unique } from "./helpers";

// Historia clínica: la psicóloga completa la ficha y la descarga; el paciente no tiene acceso.
test("historia clínica: guardar la ficha, descargar el PDF y que el paciente no acceda", async ({
  browser,
}) => {
  const reason = unique("Motivo E2E");
  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();
  await q.goto("/pro");
  await q.getByRole("link", { name: /Sofía/ }).first().click();
  await expect(q.getByRole("heading", { level: 1, name: "Sofía" })).toBeVisible();
  const base = q.url().split("?")[0];
  await q.goto(`${base}?tab=historia`);

  // Esperar a que la página termine de cargar: si se escribe antes, React pisa el texto.
  await q.waitForLoadState("networkidle");
  await q.getByLabel("Motivo de consulta").fill(reason);
  await expect(q.getByText("Hay cambios sin guardar")).toBeVisible();
  await q.getByRole("button", { name: "Guardar ficha" }).click();
  await expect(q.getByText("Hay cambios sin guardar")).toHaveCount(0);
  await expect(q.getByText(/Guardada/)).toBeVisible();
  await q.reload();
  await expect(q.getByLabel("Motivo de consulta")).toHaveValue(reason);

  const pdf = await q.request.get(`${base}/historia-clinica`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // El paciente no puede descargarla aunque conozca la dirección.
  const patient = await browser.newContext({ storageState: STATE.patient });
  const res = await patient.request.get(`${new URL(base).pathname}/historia-clinica`);
  expect(res.status()).toBe(401);
  await patient.close();
  await pro.close();
});
