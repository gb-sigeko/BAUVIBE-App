import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-Mail").fill("fee@bauvibe.local");
  await page.getByLabel("Passwort").fill("Bauvibe2026!");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/(fee|gf)(\/|$)/, { timeout: 60_000 });
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
