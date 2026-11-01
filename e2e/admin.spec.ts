import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { STATE, unique } from "./helpers";

// Panel de administración: solo para rol ADMIN y sin datos clínicos.

test.describe("acceso", () => {
  test("una paciente no entra al panel", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STATE.patient });
    const page = await ctx.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app$/);
    await ctx.close();
  });

  test("una profesional no entra al panel ni a sus descargas", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: STATE.pro });
    const page = await ctx.newPage();
    await page.goto("/admin/profesionales");
    await expect(page).toHaveURL(/\/pro$/);
    const res = await page.request.get("/admin/plantillas/cualquiera/exportar");
    expect(res.status()).toBe(401);
    await ctx.close();
  });
});

test.describe("admin", () => {
  test.use({ storageState: STATE.admin });

  test("da de alta una profesional que puede ingresar con la contraseña temporal", async ({
    page,
    browser,
  }) => {
    const email = `${unique("pro")}@demo.sentir.test`;
    await page.goto("/admin/profesionales");
    await page.getByLabel(/^Nombre/).fill("Lic. E2E");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    const status = page.getByRole("status").filter({ hasText: email });
    await expect(status).toBeVisible();
    const password = (await status.locator("code").textContent())!;
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Ingresa como la nueva profesional (sin tocar la sesión del admin).
    const ctx = await browser.newContext();
    const res = await ctx.request.post("/api/auth/sign-in/email", {
      data: { email, password },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(res.status()).toBe(200);
    const proPage = await ctx.newPage();
    await proPage.goto("/pro");
    await expect(proPage.getByRole("heading", { name: "Hola, Lic. E2E" })).toBeVisible();
    await ctx.close();
  });

  test("agrega y borra una línea de ayuda", async ({ page }) => {
    const name = unique("Línea E2E");
    await page.goto("/admin/lineas");
    await page.getByRole("button", { name: "Agregar línea" }).click();
    const form = page.getByRole("form", { name: "Nueva línea de ayuda" });
    await form.getByLabel("Nombre").fill(name);
    await form.getByLabel("Teléfono").fill("0800 000 0000");
    await form.getByRole("button", { name: "Agregar" }).click();
    const saved = page.getByRole("form", { name: `Línea ${name}` });
    await expect(saved).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await saved.getByRole("button", { name: "Borrar" }).click();
    await expect(saved).toHaveCount(0);
  });

  test("sube, descarga y borra una plantilla", async ({ page }) => {
    const doc = JSON.parse(readFileSync("e2e/fixtures/chequeo.anclaje.json", "utf8"));
    doc.title = unique("Plantilla E2E");
    await page.goto("/admin/plantillas");
    await page.locator('input[type="file"]').setInputFiles({
      name: "plantilla.anclaje.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(doc)),
    });
    await expect(page.getByRole("heading", { name: doc.title })).toBeVisible();

    const href = await page
      .getByRole("link", { name: `Descargar JSON de ${doc.title}` })
      .getAttribute("href");
    const exported = await (await page.request.get(href!)).json();
    expect(exported.title).toBe(doc.title);
    expect(exported.questions).toHaveLength(doc.questions.length);

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: `Borrar ${doc.title}` }).click();
    await expect(page.getByRole("heading", { name: doc.title })).toHaveCount(0);
  });
});
