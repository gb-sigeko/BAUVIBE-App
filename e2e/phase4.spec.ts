import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Phase 4 – Begehungsprotokoll", () => {
  test("Upload, Mangel, PDF, E-Mail (Mock)", async ({ page }) => {
    await page.goto("/projects");
    await page.locator("tr").filter({ has: page.getByText("PRJ-2401", { exact: true }) }).getByRole("link", { name: "Öffnen" }).click();
    await page.getByRole("tab", { name: "Begehungen" }).click();
    await page.getByTestId("begehung-protokoll-link").first().click();

    await expect(page.getByRole("heading", { name: "Begehungsprotokoll" })).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("proto-uebersicht-file").setInputFiles({
      name: "u.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await expect(page.locator('img[alt="Übersicht"]')).toBeVisible({ timeout: 20_000 });

    const mLabel = `E2E-Mangel-${Date.now()}`;
    await page.getByTestId("proto-mangel-open").click();
    await page.getByTestId("proto-mangel-desc").fill(mLabel);
    const tb = page.getByTestId("proto-mangel-tb");
    if ((await tb.locator("option").count()) > 1) {
      await tb.selectOption({ index: 1 });
    }
    await page.getByTestId("proto-mangel-save").click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".font-medium", { hasText: mLabel }).first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("proto-verteiler-save").click();
    await expect(page.getByText("Verteiler gespeichert.")).toBeVisible({ timeout: 15_000 });

    const pdfRespP = page.waitForResponse((r) => r.url().includes("/generate-pdf") && r.request().method() === "POST");
    await page.getByTestId("proto-pdf-gen").click();
    const pdfResp = await pdfRespP;
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
    expect(parsed.text).toMatch(/Mangel/i);

    const sendP = page.waitForResponse((r) => r.url().includes("/send") && r.request().method() === "POST");
    await page.getByTestId("proto-send").click();
    const sendR = await sendP;
    expect(sendR.ok()).toBeTruthy();
    await expect(page.getByText("Protokoll versendet.")).toBeVisible();
  });
});
