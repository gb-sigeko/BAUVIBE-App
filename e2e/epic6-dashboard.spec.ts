import { test, expect } from "@playwright/test";

test.describe("Epic 6 – Dashboards Fee/GF", () => {
  test("Fee-Start zeigt erweiterte KPI-Karten", async ({ page }) => {
    await page.goto("/fee");
    await expect(page.getByRole("heading", { name: "Fee – Start" })).toBeVisible();
    await expect(page.getByTestId("fee-kpi-angebote-laufend")).toBeVisible();
    await expect(page.getByTestId("fee-kpi-vk-offen")).toBeVisible();
    await expect(page.getByTestId("fee-kpi-angebote-laufend-value")).toHaveText(/\d+/);
    await expect(page.getByTestId("fee-kpi-vk-offen-value")).toHaveText(/\d+/);
  });

  test("GF-Dashboard zeigt Pipeline-KPIs", async ({ page }) => {
    await page.goto("/gf");
    await expect(page.getByRole("heading", { name: "GF-Dashboard" })).toBeVisible();
    await expect(page.getByTestId("gf-kpi-angebote-pipeline")).toBeVisible();
    await expect(page.getByTestId("gf-kpi-vorankuendigungen-offen")).toBeVisible();
    await expect(page.getByTestId("gf-kpi-angebote-pipeline-value")).toHaveText(/\d+/);
    await expect(page.getByTestId("gf-kpi-vorankuendigungen-offen-value")).toHaveText(/\d+/);
  });
});
