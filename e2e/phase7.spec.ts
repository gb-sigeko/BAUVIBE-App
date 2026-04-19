import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
}

test.describe("Phase 7 – Vor-Ort-Rückmeldung & Arbeitskorb Fee", () => {
  test("Extern meldet Aushang fehlt; Fee sieht Eintrag im Arbeitskorb", async ({ page }) => {
    await login(page, "extern@bauvibe.local", "Bauvibe2026!");
    await expect(page).toHaveURL(/eigene-planung/, { timeout: 60_000 });

    const firstRow = page.locator('[data-testid^="eigene-planung-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 30_000 });
    await firstRow.getByTestId("vorort-open").click();

    await page.getByTestId("vorort-aushang-nein").click();
    await page.getByTestId("vorort-werbung-ja").click();
    const postVorOrt = page.waitForResponse(
      (r) => r.url().includes("/api/planung/entries/") && r.url().endsWith("/vorort") && r.request().method() === "POST",
    );
    await page.getByTestId("vorort-submit").click();
    const postRes = await postVorOrt;
    expect(postRes.ok(), await postRes.text()).toBeTruthy();

    await login(page, "fee@bauvibe.local", "Bauvibe2026!");
    await page.goto("/arbeitskorb", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/arbeitskorb/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Arbeitskorb" })).toBeVisible({ timeout: 30_000 });
    const box = page.getByTestId("arbeitskorb-vorort");
    await expect(box).toBeVisible({ timeout: 60_000 });
    await expect(box).toContainText("Aushang aktuell/lesbar: nein");
  });
});
