import path from "node:path";
import { expect, test } from "@playwright/test";
import { STATE } from "./helpers";

// Flujo completo: la psicóloga importa, publica y asigna; el paciente responde con un ítem
// crítico y ve las líneas de ayuda; la psicóloga ve la alerta, la respuesta y la archiva.
test("evaluación con ítem crítico, de punta a punta", async ({ browser }) => {
  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();
  await q.goto("/pro/evaluaciones");
  await q
    .locator('input[type="file"]')
    .setInputFiles(path.join(__dirname, "fixtures", "chequeo.sentir.json"));
  await expect(q).toHaveURL(/\/pro\/evaluaciones\/[a-z0-9]+$/);
  await q.getByRole("button", { name: "Publicar" }).click();
  await expect(q.getByText(/Publicada/)).toBeVisible();

  await q.goto("/pro");
  await q.getByRole("link", { name: /Sofía/ }).first().click();
  await expect(q.getByRole("heading", { level: 1, name: "Sofía" })).toBeVisible();
  await q.goto(`${q.url().split("?")[0]}?tab=evaluaciones`);
  await q
    .getByRole("combobox", { name: "Evaluación", exact: true })
    .selectOption({ label: "Chequeo E2E" });
  await q.getByRole("button", { name: "Asignar" }).click();
  await expect(q.getByText("Chequeo E2E v1").first()).toBeVisible();

  const patient = await browser.newContext({ storageState: STATE.patient });
  const p = await patient.newPage();
  await p.goto("/app/tareas");
  await p
    .getByRole("listitem")
    .filter({ hasText: "Chequeo E2E" })
    .getByRole("button", { name: /Empezar|Seguir/ })
    .click();
  await expect(p).toHaveURL(/\/app\/evaluaciones\//);
  await p.getByRole("button", { name: "Empezar" }).click();
  await p
    .getByRole("radiogroup", { name: "Me sentí con poca energía" })
    .getByRole("radio", { name: "Seguido" })
    .click();
  await p
    .getByRole("radiogroup", { name: "Me costó dormir" })
    .getByRole("radio", { name: "Nunca" })
    .click();
  await p
    .getByRole("radiogroup", { name: "Disfruté de algo" })
    .getByRole("radio", { name: "A veces" })
    .click();
  await p.getByRole("button", { name: "Seguir" }).click();
  await p.getByRole("button", { name: "Enviar" }).click();
  await expect(p.getByText("Gracias por tomarte este tiempo.")).toBeVisible();
  await expect(p.getByText("135")).toBeVisible(); // líneas de ayuda
  await patient.close();

  await q.goto("/pro");
  await expect(q.getByText("Ítem crítico en una evaluación").first()).toBeVisible();

  // La respuesta aparece en la lista de respuestas, filtrando por críticos.
  await q.goto("/pro/evaluaciones?vista=respuestas&mostrar=criticos");
  await expect(q.getByRole("cell", { name: /Chequeo E2E/ }).first()).toBeVisible();

  // Archivar: sale de la lista (no se puede borrar porque tiene respuestas) y queda en archivadas.
  await q.goto("/pro/evaluaciones");
  const card = q
    .getByRole("listitem")
    .filter({ has: q.getByRole("link", { name: "Chequeo E2E", exact: true }) });
  await expect(card.getByRole("button", { name: /Borrar/ })).toHaveCount(0);
  q.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Archivar" }).click();
  await expect(card).toHaveCount(0);
  await q.goto("/pro/evaluaciones?archivadas=1");
  await expect(q.getByRole("link", { name: "Chequeo E2E", exact: true }).first()).toBeVisible();
  await pro.close();
});
