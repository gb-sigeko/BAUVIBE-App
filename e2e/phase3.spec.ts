import { test, expect } from "@playwright/test";

test.describe("Phase 3 – Verfügbarkeit, Turnus, Vertretung", () => {
  test("Kein Turnus-Vorschlag mit MW in Urlaubswoche (PRJ-2401)", async ({ page }) => {
    await page.goto("/planung");
    const row = page.getByTestId("planung-row-PRJ-2401");
    await expect(row).toBeVisible({ timeout: 60_000 });
    const cell = row.getByTestId("planung-cell-2026-19");
    await expect(cell).toBeVisible();
    /* Nur das SiGeKo-Kürzel im Chip (nicht „Vertretung für MW“ in der Notiz). */
    await expect(cell.locator("span.font-semibold", { hasText: /^MW$/ })).toHaveCount(0);
  });

  test("Vertretung: geplanter Termin von MW wird auf TK umgebucht", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Termine / Planung" }).click();

    const desc = `E2E-Vertretung-${Date.now()}`;
    const local = "2026-05-05T09:00";

    await page.getByTestId("fest-termin-datetime").fill(local);
    await page.getByTestId("fest-termin-beschreibung").fill(desc);
    const empSel = page.getByTestId("fest-termin-employee");
    const mwVal = await empSel.locator("option").filter({ hasText: /^MW\b/ }).first().getAttribute("value");
    if (!mwVal) throw new Error("MW option missing");
    await empSel.selectOption(mwVal);

    const respP = page.waitForResponse(
      (r) => r.url().includes("/planung-entries") && r.request().method() === "POST" && r.ok(),
    );
    await page.getByTestId("fest-termin-submit").click();
    const created = (await (await respP).json()) as { isoYear: number; isoWeek: number };

    await page.goto("/planung");
    const row = page.getByTestId("planung-row-PRJ-2401");
    await expect(row).toBeVisible({ timeout: 60_000 });
    const cell = row.getByTestId(`planung-cell-${created.isoYear}-${created.isoWeek}`);
    await expect(cell.locator("span.font-semibold", { hasText: /^TK$/ }).first()).toBeVisible({ timeout: 30_000 });
    await expect(cell.locator("span.font-semibold", { hasText: /^MW$/ })).toHaveCount(0);
  });
});
