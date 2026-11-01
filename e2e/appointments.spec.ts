import { expect, test } from "@playwright/test";
import { STATE } from "./helpers";

// Turnera: la psicóloga da un turno, el paciente lo ve y avisa que no puede ir, y ella lo ve.
test("turno: agendar, el paciente avisa que no va y la psicóloga lo ve", async ({ browser }) => {
  // Un día dentro de 20 días a las 7:MM (hora de Buenos Aires), con minutos "únicos" por corrida.
  const day = new Date(Date.now() + 20 * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const minute = String(5 + (Math.floor(Date.now() / 1000) % 50)).padStart(2, "0");
  const time = `07:${minute}`;

  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();
  await q.goto("/pro/agenda");
  await q.getByLabel("Paciente").selectOption({ label: "Sofía" });
  await q.getByLabel("Día y hora").first().fill(`${day}T${time}`);
  await q.getByRole("button", { name: "Agendar" }).click();
  await expect(q.getByRole("status").filter({ hasText: "Turno agendado" })).toBeVisible();
  const row = q.getByRole("listitem").filter({ hasText: `${time}–` });
  await expect(row.first()).toBeVisible();

  const patient = await browser.newContext({ storageState: STATE.patient });
  const p = await patient.newPage();
  await p.goto("/app/turnos");
  const card = p
    .getByRole("listitem")
    .filter({ hasText: `${time} a` })
    .first();
  await expect(card).toBeVisible();
  p.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "No puedo ir" }).click();
  await expect(card.getByText("Avisaste que no podés ir.")).toBeVisible();
  await patient.close();

  await q.reload();
  await expect(row.first().getByText("Avisó que no puede venir")).toBeVisible();
  await pro.close();
});
