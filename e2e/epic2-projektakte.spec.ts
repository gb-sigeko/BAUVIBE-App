import { test, expect } from "@playwright/test";

test.describe("Epic 2 – Projektakte Tabs", () => {
  test("Beteiligten hinzufügen (Kontakt)", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Beteiligte" }).click();

    await page.getByTestId("beteiligte-add-open").click();
    await page.getByRole("dialog").getByPlaceholder("Name, E-Mail oder Telefon").fill("Alex");
    await expect(page.getByRole("button", { name: /Alex/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Alex/i }).first().click();
    const role = `E2E-Rolle-${Date.now()}`;
    await page.getByTestId("beteiligte-role-input").fill(role);
    await page.getByTestId("beteiligte-add-save").click();
    await expect(page.getByRole("cell", { name: role, exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("Fester Termin erscheint und Planung-Link fokussiert KW", async ({ page }) => {
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

    const row = page.locator("tr", { has: page.getByText(desc, { exact: false }) });
    await expect(row).toBeVisible({ timeout: 15_000 });
    const href = await row.getByRole("link", { name: "Wochenplanung" }).getAttribute("href");
    expect(href).toBeTruthy();
    await row.getByRole("link", { name: "Wochenplanung" }).click();
    const m = href!.match(/isoYear=(\d+).*isoWeek=(\d+)/);
    expect(m).toBeTruthy();
    if (m) {
      await expect(page.getByTestId(`planung-week-${m[1]}-${m[2]}`)).toBeVisible({ timeout: 20_000 });
    }
  });

  test("Telefonnotiz mit überfälligem Follow-up im Arbeitskorb", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Kommunikation" }).click();

    const text = `E2E-WV-${Date.now()}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const followLocal = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}T08:00`;

    await page.getByTestId("telefonnotiz-dialog-open").click();
    await page.getByTestId("telefonnotiz-text").fill(text);
    await page.getByTestId("telefonnotiz-followup").fill(followLocal);
    await page.getByTestId("telefonnotiz-save").click();
    await expect(page.getByTestId(/telefonnotiz-row-/).filter({ hasText: text })).toBeVisible({ timeout: 15_000 });

    await page.goto("/arbeitskorb");
    await expect(page.getByTestId("arbeitskorb-wiedervorlagen")).toContainText(text, { timeout: 15_000 });
  });
});
