import type { Page } from "@playwright/test";

export async function loginFee(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(process.env.E2E_EMAIL ?? "fee@bauvibe.local");
  await page.getByLabel("Passwort").fill(process.env.E2E_PASSWORD ?? "Bauvibe2026!");
  await page.getByRole("button", { name: /Anmelden|Anmeldung/ }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 90_000,
    waitUntil: "domcontentloaded",
  });
}
