import { test, expect } from "@playwright/test";

test.describe("Phase 10 – Sicherheit / Health", () => {
  test("GET /api/health ist öffentlich und liefert 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", database: "up" });
  });

  test("Extern: Login, dann /api/export → 403 oder 401", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("E-Mail").fill("extern@bauvibe.local");
    await page.getByLabel("Passwort").fill("Bauvibe2026!");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).toHaveURL(/\/eigene-planung/, { timeout: 60_000 });

    const res = await page.request.get("/api/export");
    expect([401, 403]).toContain(res.status());
  });
});
