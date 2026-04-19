import { test, expect } from "@playwright/test";

test.describe("Phase 8 – Exporte", () => {
  test("Wochenliste CSV: Content-Type und Header", async ({ page }) => {
    await page.goto("/fee");
    const plan = await page.request.get("/api/planung?weeks=8");
    expect(plan.ok()).toBeTruthy();
    const data = (await plan.json()) as { entries: { isoYear: number; isoWeek: number }[] };
    const e0 = data.entries[0];
    if (!e0) throw new Error("Keine Planungseinträge für Export-Test");

    const res = await page.request.get(
      `/api/export/wochenliste?isoYear=${e0.isoYear}&kw=${e0.isoWeek}&format=csv`,
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    expect(res.headers()["content-type"] ?? "").toMatch(/csv/i);
    const body = await res.text();
    expect(body).toMatch(/Projekt/);
  });

  test("Wochenliste PDF beginnt mit %PDF", async ({ page }) => {
    await page.goto("/fee");
    const plan = await page.request.get("/api/planung?weeks=8");
    const data = (await plan.json()) as { entries: { isoYear: number; isoWeek: number }[] };
    const e0 = data.entries[0];
    if (!e0) throw new Error("Keine Planungseinträge für Export-Test");

    const res = await page.request.get(
      `/api/export/wochenliste?isoYear=${e0.isoYear}&kw=${e0.isoWeek}&format=pdf`,
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const buf = Buffer.from(await res.body());
    expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
