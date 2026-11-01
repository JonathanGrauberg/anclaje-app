import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { STATE } from "./helpers";

// Revisión automática WCAG 2.1 AA con axe. No reemplaza probar con lector de pantalla y
// teclado, pero agarra contraste, labels, roles y estructura.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function check(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes
        .slice(0, 5)
        .map((n) => `   - ${n.target.join(" ")}: ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`)
        .join("\n")}`,
  );
  expect(report, `${url}\n${report.join("\n")}`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`modo ${scheme === "light" ? "claro" : "oscuro"}`, () => {
    test.use({ colorScheme: scheme });

    test("páginas públicas", async ({ page }) => {
      for (const url of ["/ingresar", "/registrarse", "/recuperar", "/offline"])
        await check(page, url);
    });

    test.describe("paciente", () => {
      test.use({ storageState: STATE.patient });
      for (const url of [
        "/app",
        "/app/rueda",
        "/app/rueda/historial",
        "/app/diario",
        "/app/diario/nueva",
        "/app/autorregistro",
        "/app/plan-de-calma",
        "/app/tareas",
        "/app/patrones",
        "/app/ajustes",
        "/app/devoluciones",
        "/app/proxima-sesion",
        "/app/turnos",
      ]) {
        test(url, async ({ page }) => check(page, url));
      }
    });

    test.describe("administración", () => {
      test.use({ storageState: STATE.admin });
      for (const url of [
        "/admin",
        "/admin/profesionales",
        "/admin/lineas",
        "/admin/plantillas",
        "/admin/auditoria",
        "/admin/ajustes",
      ]) {
        test(url, async ({ page }) => check(page, url));
      }
    });

    test.describe("profesional", () => {
      test.use({ storageState: STATE.pro });
      for (const url of [
        "/pro",
        "/pro/agenda",
        "/pro/invitaciones",
        "/pro/respuestas-rapidas",
        "/pro/biblioteca",
        "/pro/evaluaciones",
        "/pro/evaluaciones?vista=respuestas",
        "/pro/evaluaciones?archivadas=1",
        "/pro/ajustes",
      ]) {
        test(url, async ({ page }) => check(page, url));
      }
      test("ficha del paciente (todas las pestañas)", async ({ page }) => {
        await page.goto("/pro");
        await page.getByRole("link", { name: /Sofía/ }).first().click();
        const base = page.url().split("?")[0];
        for (const tab of ["compartido", "historia", "plan", "tareas", "evaluaciones", "patrones"])
          await check(page, `${base}?tab=${tab}`);
      });
    });
  });
}
