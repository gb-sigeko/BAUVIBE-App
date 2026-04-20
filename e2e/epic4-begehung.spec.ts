import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Epic 4 – Begehung aus Projektakte", () => {
  test("Neue Begehung, Detail: Foto, Mangel, Verteiler, PDF", async ({ page }) => {
    await page.goto("/projects");
    await page.locator("tr").filter({ has: page.getByText("PRJ-2401", { exact: true }) }).getByRole("link", { name: "Öffnen" }).click();
    await page.getByRole("tab", { name: "Begehungen" }).click();

    const title = `E2E-BG-${Date.now()}`;
    await page.getByTestId("begehung-neu-open").click();
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${inTwoDays.getFullYear()}-${pad(inTwoDays.getMonth() + 1)}-${pad(inTwoDays.getDate())}T10:00`;
    await page.getByTestId("begehung-neu-datetime").fill(local);
    await page.getByTestId("begehung-neu-title").fill(title);
    await page.getByTestId("begehung-neu-save").click();

    const row = page.locator(`[data-testid^="begehung-row-"]`).filter({ hasText: title });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole("link", { name: "Bearbeiten" }).click();

    await expect(page.getByRole("heading", { name: "Begehung" })).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("begehung-uebersicht-file").setInputFiles({
      name: "u.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await expect(page.locator('img[alt="Übersicht"]')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("begehung-mangel-open").click();
    const mLabel = `E2E-Mangel-${Date.now()}`;
    await page.getByTestId("begehung-mangel-file").setInputFiles({
      name: "m.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.getByTestId("begehung-mangel-desc").fill(mLabel);
    const tb = page.getByTestId("begehung-mangel-tb");
    if ((await tb.locator("option").count()) > 1) {
      await tb.selectOption({ index: 1 });
    }
    await page.getByTestId("begehung-mangel-save").click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(mLabel, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Stammdaten und Verteiler speichern" }).click();
    await expect(page.getByRole("button", { name: "Stammdaten und Verteiler speichern" })).toBeEnabled({ timeout: 15_000 });

    const pdfP = page.waitForResponse((r) => r.url().includes("/generate-pdf") && r.request().method() === "POST");
    await page.getByTestId("begehung-generate-pdf").click();
    const pdfResp = await pdfP;
    expect(pdfResp.ok()).toBeTruthy();
    const pdfJson = (await pdfResp.json()) as { path: string };
    expect(pdfJson.path).toMatch(/^\/protokolle\//);

    const idMatch = pdfJson.path.match(/begehung-(.+)\.pdf$/);
    expect(idMatch).toBeTruthy();
    const begehungId = idMatch![1]!;

    const pdfRes = await page.request.get(`/api/begehungen/${begehungId}/protokoll-pdf`);
    expect(pdfRes.ok(), `PDF API HTTP ${pdfRes.status()} for ${begehungId}`).toBeTruthy();
    const buf = Buffer.from(await pdfRes.body());
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
    const parsed = await pdfParse(buf);
    expect(parsed.text.length).toBeGreaterThan(20);
  });
});
