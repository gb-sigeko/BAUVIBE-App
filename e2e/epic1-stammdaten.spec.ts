import { test, expect } from "@playwright/test";

test.describe("Epic 1 – Stammdaten (P0)", () => {
  test("Projekt anlegen und in Liste sichtbar", async ({ page }) => {
    const suffix = Date.now();
    const name = `E2E-Proj-${suffix}`;
    await page.goto("/projects");
    await page.getByTestId("project-create-open").click();
    await page.getByTestId("project-name-input").fill(name);
    await page.getByTestId("project-site-input").fill("E2E-Ort München");
    await page.getByTestId("project-contractual-input").fill("6");
    const respSel = page.getByTestId("project-responsible-select");
    const mwOpt = respSel.locator("option", { hasText: "MW — Maria Weber" }).first();
    const mwVal = await mwOpt.getAttribute("value");
    if (!mwVal) throw new Error("Seed-Mitarbeiter MW nicht gefunden");
    await respSel.selectOption(mwVal);
    await page.getByTestId("project-create-submit").click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible({ timeout: 30_000 });
  });

  test("Organisation anlegen und in Liste sichtbar", async ({ page }) => {
    const suffix = Date.now();
    const orgName = `E2E-Org-${suffix}`;
    await page.goto("/kontakte");
    await page.getByTestId("organization-name-input").fill(orgName);
    await page.getByTestId("organization-industry-input").fill("E2E-Branche");
    await page.getByTestId("organization-create-submit").click();
    await expect(page.locator(`tr[data-organization-name="${orgName}"]`)).toBeVisible({ timeout: 30_000 });
  });

  test("Kontakt anlegen und in Liste sichtbar", async ({ page }) => {
    const suffix = Date.now();
    const contactName = `E2E-Kontakt-${suffix}`;
    await page.goto("/kontakte");
    await page.getByTestId("contact-name-input").fill(contactName);
    await page.getByTestId("contact-create-submit").click();
    await expect(page.locator(`tr[data-contact-name="${contactName}"]`)).toBeVisible({ timeout: 30_000 });
  });

  test("Mitarbeiter anlegen und in Liste sichtbar", async ({ page }) => {
    const suffix = Date.now();
    const shortCode = `E${String(suffix).slice(-6)}`;
    const displayName = `E2E Mitarbeiter ${suffix}`;
    await page.goto("/mitarbeiter");
    await page.getByTestId("employee-short-code-input").fill(shortCode);
    await page.getByTestId("employee-display-name-input").fill(displayName);
    await page.getByTestId("employee-kind-select").selectOption("INTERN");
    await page.getByTestId("employee-create-submit").click();
    await expect(page.getByTestId(`employee-row-${shortCode.toUpperCase()}`)).toBeVisible({ timeout: 30_000 });
  });
});
