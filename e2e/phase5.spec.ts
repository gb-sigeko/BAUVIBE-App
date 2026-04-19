import { test, expect } from "@playwright/test";

type PlanEntry = {
  id: string;
  projectId: string;
  isoYear: number;
  isoWeek: number;
  employeeId: string;
  project: { code: string };
};

test.describe("Phase 5 – Touren", () => {
  test("Tour-ID in Planung; Reihenfolge per API/UI-Liste persistiert", async ({ page }) => {
    const planRes = await page.request.get("/api/planung?weeks=52");
    expect(planRes.ok()).toBeTruthy();
    const plan = (await planRes.json()) as { entries: PlanEntry[] };
    const e1 = plan.entries.find((e) => e.project?.code === "PRJ-2401");
    const e2 = plan.entries.find((e) => e.project?.code === "PRJ-2402");
    if (!e1 || !e2) throw new Error("Seed-Planungseinträge PRJ-2401 / PRJ-2402 fehlen");
    if (e1.isoYear !== e2.isoYear || e1.isoWeek !== e2.isoWeek) {
      throw new Error("Erwartung: PRJ-2401 und PRJ-2402 haben dieselbe ISO-KW im Seed");
    }
    const { isoYear, isoWeek } = e1;
    const employeeId = e1.employeeId;

    const tourPost = await page.request.post("/api/tours", {
      data: {
        isoYear,
        isoWeek,
        employeeId,
        region: "E2E",
        sortOrder: [e1.projectId, e2.projectId],
      },
    });
    expect(tourPost.ok()).toBeTruthy();
    const tour = (await tourPost.json()) as { id: string };
    const tourId = tour.id;
    const snippet = tourId.slice(0, 6);

    try {
      const put1 = await page.request.put(`/api/planung/${e1.id}`, { data: { tourId } });
      const put2 = await page.request.put(`/api/planung/${e2.id}`, { data: { tourId } });
      expect(put1.ok(), await put1.text()).toBeTruthy();
      expect(put2.ok(), await put2.text()).toBeTruthy();

      await page.goto("/planung");
      const row1 = page.getByTestId("planung-row-PRJ-2401");
      const row2 = page.getByTestId("planung-row-PRJ-2402");
      await expect(row1).toBeVisible({ timeout: 60_000 });
      const cell1 = row1.getByTestId(`planung-cell-${isoYear}-${isoWeek}`);
      const cell2 = row2.getByTestId(`planung-cell-${isoYear}-${isoWeek}`);
      await expect(cell1.getByTestId("planung-tour-id")).toContainText(snippet);
      await expect(cell2.getByTestId("planung-tour-id")).toContainText(snippet);

      await page.goto(`/touren?isoYear=${isoYear}&isoWeek=${isoWeek}`);
      await expect(page.getByText(`Tour ${snippet}`).first()).toBeVisible({ timeout: 30_000 });

      const rowA = page.getByTestId(`tour-sort-row-${e1.projectId}`);
      const rowB = page.getByTestId(`tour-sort-row-${e2.projectId}`);
      await expect(rowA).toContainText("1.");
      await expect(rowB).toContainText("2.");
      /* Reihenfolge wie nach DnD-Ende: gleicher PUT wie `TourenClient.onDragEnd`. */
      const putOrder = await page.request.put(`/api/tours/${tourId}`, {
        data: { sortOrder: [e2.projectId, e1.projectId] },
      });
      expect(putOrder.ok(), await putOrder.text()).toBeTruthy();
      await page.reload();
      await expect(page.getByTestId(`tour-sort-row-${e2.projectId}`)).toContainText("1.");
      await expect(page.getByTestId(`tour-sort-row-${e1.projectId}`)).toContainText("2.");
      const verify = await page.request.get(`/api/tours?isoYear=${isoYear}&isoWeek=${isoWeek}`);
      expect(verify.ok()).toBeTruthy();
      const rows = (await verify.json()) as { id: string; sortOrder: string[] }[];
      const t = rows.find((x) => x.id === tourId);
      expect(t?.sortOrder).toEqual([e2.projectId, e1.projectId]);
    } finally {
      await page.request.delete(`/api/tours/${tourId}`);
    }
  });
});
