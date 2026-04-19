import { test, expect } from "@playwright/test";

test.describe("Phase 6 – Arbeitskorb Fehlende Unterlagen", () => {
  test("zeigt verzögert erwartetes Protokoll (>3 Tage, keine Unterlage)", async ({ page }) => {
    await page.goto("/arbeitskorb");
    await expect(page.getByTestId("arbeitskorb-fehlende-unterlagen")).toBeVisible({ timeout: 60_000 });
    const delayed = page.locator('[data-testid^="arbeitskorb-delayed-protokoll-"]');
    await expect(delayed.first()).toBeVisible();
    await expect(delayed.first()).toContainText("E2E verzögertes Protokoll");
  });
});
