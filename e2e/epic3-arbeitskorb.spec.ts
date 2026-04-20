import { test, expect } from "@playwright/test";

test.describe("Epic 3 – Arbeitskorb erweitert", () => {
  test("Telefon-Wiedervorlage: Erledigt entfernt Eintrag", async ({ page }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Öffnen" }).first().click();
    await page.getByRole("tab", { name: "Kommunikation" }).click();

    const text = `E2E-WV-ERL-${Date.now()}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const followLocal = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}T08:00`;

    await page.getByTestId("telefonnotiz-dialog-open").click();
    await page.getByTestId("telefonnotiz-text").fill(text);
    await page.getByTestId("telefonnotiz-followup").fill(followLocal);
    await page.getByTestId("telefonnotiz-save").click();
    await expect(page.getByTestId(/telefonnotiz-row-/).filter({ hasText: text })).toBeVisible({ timeout: 15_000 });

    await page.goto("/arbeitskorb");
    await expect(page.getByTestId("arbeitskorb-wiedervorlagen").getByText(text, { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    const noteRow = page.locator('[data-testid^="arbeitskorb-wv-telefon-"]').filter({ hasText: text }).first();
    const testId = await noteRow.getAttribute("data-testid");
    expect(testId).toBeTruthy();
    const noteId = testId!.replace("arbeitskorb-wv-telefon-", "");

    await page.getByTestId(`arbeitskorb-telefon-erledigt-${noteId}`).click();
    await expect(page.locator(`[data-testid^="arbeitskorb-wv-telefon-${noteId}"]`)).toHaveCount(0, { timeout: 15_000 });
  });

  test("Vor-Ort-Rückmeldung erscheint und kann erledigt werden", async ({ page }) => {
    const planRes = await page.request.get("/api/planung?weeks=12");
    expect(planRes.ok()).toBeTruthy();
    const data = (await planRes.json()) as { entries: { id: string; projectId: string }[] };
    const entryId = data.entries[0]?.id;
    expect(entryId).toBeTruthy();

    const body = `E2E-VorOrt-${Date.now()}`;
    const post = await page.request.post(`/api/planung/entries/${entryId}/vorort`, {
      data: { rueckmeldung: body, aushangOk: true, werbungOk: false, unterbrechung: "kurz" },
    });
    expect(post.ok()).toBeTruthy();
    const created = (await post.json()) as { id: string };
    const rid = created.id;

    await page.goto("/arbeitskorb");
    const row = page.getByTestId(`arbeitskorb-vorort-${rid}`);
    await expect(row).toContainText(body, { timeout: 20_000 });

    await page.getByTestId(`arbeitskorb-vorort-erledigt-${rid}`).click();
    await expect(page.getByTestId(`arbeitskorb-vorort-${rid}`)).toHaveCount(0, { timeout: 20_000 });
  });
});
