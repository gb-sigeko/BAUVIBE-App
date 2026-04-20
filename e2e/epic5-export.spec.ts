import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test.describe("Epic 5 – Exporte", () => {
  test("CSV-Export Projekte und Export-Ping", async ({ page }) => {
    await page.goto("/projects");

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-projects-csv").click()]);

    expect(download.suggestedFilename()).toMatch(/projekte/i);
    const diskPath = await download.path();
    expect(diskPath).toBeTruthy();
    const text = await readFile(diskPath!, "utf8");
    expect(text).toContain("code,name,status");
    expect(text).toContain("PRJ-2401");

    const ping = await page.evaluate(async () => {
      const r = await fetch("/api/export/ping");
      return (await r.json()) as { ok?: boolean; role?: string };
    });
    expect(ping.ok).toBe(true);
    expect(ping.role).toBeTruthy();
  });

  test("Projektakte: Aufgaben-CSV", async ({ page }) => {
    await page.goto("/projects");
    await page.locator("tr").filter({ has: page.getByText("PRJ-2401", { exact: true }) }).getByRole("link", { name: "Öffnen" }).click();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("export-project-tasks-csv").click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/aufgaben/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import("node:fs/promises");
    const text = await fs.readFile(path!, "utf8");
    expect(text).toContain("title,status,priority");
  });
});
