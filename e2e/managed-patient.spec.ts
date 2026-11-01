import { expect, test } from "@playwright/test";
import { STATE, unique } from "./helpers";

// Paciente sin la app: la psicóloga le da turno y le carga la historia clínica sin que tenga
// cuenta. Después lo invita, la persona crea su cuenta y acepta: el turno pasa a su cuenta.
test("paciente sin la app: turno, historia clínica, invitación y unión de datos", async ({
  browser,
}) => {
  const name = unique("Pasajero");
  const reason = unique("Motivo sin app");
  const day = new Date(Date.now() + 25 * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const minute = String(5 + (Math.floor(Date.now() / 1000) % 50)).padStart(2, "0");
  const time = `06:${minute}`;

  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();

  // Turno con paciente nuevo, desde el calendario de la agenda.
  await q.goto(`/pro/agenda?dia=${day}`);
  await q.waitForLoadState("networkidle");
  await expect(q.getByLabel("Día y hora").first()).toHaveValue(`${day}T09:00`);
  await q.getByLabel("Paciente").selectOption({ label: "+ Paciente nuevo, sin la app" });
  await q.getByLabel("Nombre del paciente").fill(name);
  await q.getByLabel("Contacto (opcional)").fill("11 5555-0000");
  await q.getByLabel("Día y hora").first().fill(`${day}T${time}`);
  await q.getByRole("button", { name: "Agendar" }).click();
  const status = q.getByRole("status").filter({ hasText: "Turno agendado" });
  await expect(status).toContainText(`${name} todavía no tiene la app`);
  const row = q.getByRole("listitem").filter({ hasText: name });
  await expect(row.getByText("Sin la app")).toBeVisible();

  // Su ficha: solo historia clínica.
  await status.getByRole("link", { name: "ver su ficha e invitarlo" }).click();
  await expect(q.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(q.getByText("11 5555-0000")).toBeVisible();
  await expect(q.getByRole("link", { name: "Lo compartido" })).toHaveCount(0);
  await q.waitForLoadState("networkidle");
  await q.getByLabel("Motivo de consulta").fill(reason);
  await q.getByRole("button", { name: "Guardar ficha" }).click();
  await expect(q.getByText(/Guardada/)).toBeVisible();

  // Invitación dirigida a este paciente.
  await q.getByRole("button", { name: "Invitar a la app" }).click();
  const link = await q.getByText(/\/vincular\//).textContent();
  const path = new URL(link!.trim()).pathname;

  // La persona crea su cuenta y acepta.
  const email = `${unique("e2e-sinapp")}@demo.sentir.test`;
  const password = `prueba-${Date.now()}`;
  const newcomer = await browser.newContext();
  const p = await newcomer.newPage();
  await p.goto(path);
  await p.getByRole("link", { name: "Crear mi cuenta" }).click();
  await p.getByLabel("¿Cómo te gusta que te digan?").fill(name);
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Contraseña", { exact: true }).fill(password);
  await p.getByLabel("Repetí la contraseña").fill(password);
  await p.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(p).toHaveURL(/\/vincular\//);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Aceptar y vincularme" }).click();
  await expect(p).toHaveURL(/\/app\/ajustes\?vinculado=1/);
  await p.goto("/app/turnos");
  await expect(p.getByRole("listitem").filter({ hasText: `${time} a` }).first()).toBeVisible();

  // La psicóloga lo ve como paciente con la app, con la historia clínica conservada.
  await q.goto("/pro/agenda?dia=" + day);
  const merged = q.getByRole("listitem").filter({ hasText: name });
  await expect(merged).toBeVisible();
  await expect(merged.getByText("Sin la app")).toHaveCount(0);
  const href = await merged.getByRole("link").first().getAttribute("href");
  await q.goto(`${href}?tab=historia`);
  await expect(q.getByLabel("Motivo de consulta")).toHaveValue(reason);

  // Limpieza: la cuenta de prueba se borra.
  await p.goto("/app/ajustes");
  await p.getByRole("button", { name: "Borrar mi cuenta" }).click();
  const dialog = p.getByRole("dialog");
  await dialog.getByLabel("Tu contraseña").fill(password);
  await dialog.getByLabel(/para confirmar/).fill("BORRAR");
  await dialog.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(p).toHaveURL(/\/ingresar/);
  await newcomer.close();
  await pro.close();
});

// Dar de baja: sin historia clínica se borra; con historia se archiva y se puede reactivar.
test("paciente sin la app: dar de baja, borrar o archivar y reactivar", async ({ browser }) => {
  const pro = await browser.newContext({ storageState: STATE.pro });
  const q = await pro.newPage();
  q.on("dialog", (d) => d.accept());

  async function addPatient(name: string) {
    await q.goto("/pro/invitaciones");
    await q.waitForLoadState("networkidle");
    await q.getByLabel("Nombre", { exact: true }).fill(name);
    await q.getByRole("button", { name: "Agregar paciente" }).click();
    await expect(q.getByRole("heading", { level: 1, name })).toBeVisible();
    await q.waitForLoadState("networkidle");
  }

  // Sin historia: se borra.
  const temp = unique("Prueba");
  await addPatient(temp);
  await q.getByRole("button", { name: "Dar de baja" }).click();
  await expect(q.getByRole("status").filter({ hasText: "el paciente se borró" })).toBeVisible();
  await expect(q.getByText(temp)).toHaveCount(0);

  // Con historia: se archiva y se reactiva.
  const kept = unique("Archivado");
  await addPatient(kept);
  await q.getByLabel("Motivo de consulta").fill("Motivo de prueba");
  await q.getByRole("button", { name: "Guardar ficha" }).click();
  await expect(q.getByText(/Guardada/)).toBeVisible();
  await q.getByRole("button", { name: "Dar de baja" }).click();
  await expect(q.getByRole("status").filter({ hasText: "quedó dado de baja" })).toBeVisible();
  await expect(q.getByText(kept)).toHaveCount(0);

  await q.goto("/pro/invitaciones");
  const row = q.getByRole("listitem").filter({ hasText: kept });
  await row.getByRole("button", { name: "Reactivar" }).click();
  await expect(row).toHaveCount(0);
  await q.goto("/pro");
  await expect(q.getByText(kept)).toBeVisible();

  // Limpieza: se vuelve a dar de baja (queda archivado, no aparece en la lista).
  await q.getByRole("link", { name: new RegExp(kept) }).click();
  await q.waitForLoadState("networkidle");
  await q.getByRole("button", { name: "Dar de baja" }).click();
  await expect(q.getByRole("status").filter({ hasText: "quedó dado de baja" })).toBeVisible();
  await pro.close();
});
