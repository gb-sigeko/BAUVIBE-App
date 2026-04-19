import { test, expect } from "@playwright/test";

test.describe("Phase 2 – Projektakte", () => {
  test("Beteiligte hinzufügen und entfernen", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Beteiligte" }).click();

    await page.getByRole("button", { name: "Hinzufügen" }).click();
    await page.getByPlaceholder("Name, E-Mail oder Telefon").fill("Alex");
    await expect(page.getByRole("button", { name: /Alex/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Alex/i }).first().click();
    const role = `E2E-Rolle-${Date.now()}`;
    await page.getByPlaceholder("z. B. Bauherr").fill(role);
    await page.getByRole("dialog").getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByRole("cell", { name: role, exact: true })).toBeVisible();

    const row = page.locator("tr").filter({ has: page.getByText(role, { exact: true }) });
    await row.getByRole("button", { name: "Beteiligten entfernen" }).click();
    await page.getByRole("button", { name: "Entfernen" }).click();
    await expect(page.getByRole("cell", { name: role, exact: true })).toHaveCount(0);
  });

  test("Fester Termin in Planung als FEST sichtbar", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Termine / Planung" }).click();

    const desc = `E2E-Fest-${Date.now()}`;
    const inOneWeek = new Date();
    inOneWeek.setDate(inOneWeek.getDate() + 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${inOneWeek.getFullYear()}-${pad(inOneWeek.getMonth() + 1)}-${pad(inOneWeek.getDate())}T09:00`;

    await page.getByTestId("fest-termin-datetime").fill(local);
    await page.getByTestId("fest-termin-beschreibung").fill(desc);
    await page.getByTestId("fest-termin-submit").click();

    await page.goto("/planung");
    await expect(page.getByText("Fester Termin").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(desc).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Telefonnotiz im Kommunikationstab", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Kommunikation" }).click();

    const text = `E2E-Telefon-${Date.now()}`;
    await page.getByTestId("telefonnotiz-text").fill(text);
    await page.getByTestId("telefonnotiz-save").click();
    await expect(page.getByTestId("kommunikation-telefon-card").getByText(text)).toBeVisible();
  });
});
