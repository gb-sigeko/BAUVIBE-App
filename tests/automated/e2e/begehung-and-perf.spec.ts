import { test, expect } from "@playwright/test";
import { loginFee } from "./helpers";

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await loginFee(page);
});

test("Test 6: Begehung PDF und Versand (Mock)", async ({ page }) => {
  process.env.EMAIL_MOCK = "1";

  const projectsRes = await page.request.get("/api/projects");
  expect(projectsRes.ok()).toBeTruthy();
  const projects = (await projectsRes.json()) as { id: string; code: string }[];
  const testProject = projects.find((p) => p.code.startsWith("T42-"));
  expect(testProject).toBeTruthy();

  const bRes = await page.request.post("/api/begehungen", {
    data: {
      projectId: testProject!.id,
      date: new Date().toISOString(),
      title: "E2E Begehung",
    },
  });
  if (!bRes.ok()) throw new Error(await bRes.text());
  const begehung = (await bRes.json()) as { id: string };

  for (let i = 0; i < 3; i++) {
    const mRes = await page.request.post(`/api/projects/${testProject!.id}/begehungen/${begehung.id}/mangels`, {
      data: {
        fotoUrl: "https://example.com/dummy.jpg",
        beschreibung: `Mangel ${i + 1}`,
        regel: "VBG",
      },
    });
    if (!mRes.ok()) throw new Error(await mRes.text());
  }

  const vRes = await page.request.put(`/api/projects/${testProject!.id}/begehungen/${begehung.id}/verteiler`, {
    data: {
      verteiler: [
        { name: "A", email: "a@example.com" },
        { name: "B", email: "b@example.com" },
      ],
    },
  });
  expect(vRes.ok()).toBeTruthy();

  const pdfRes = await page.request.get(`/api/projects/${testProject!.id}/begehungen/${begehung.id}/pdf`);
  if (!pdfRes.ok()) throw new Error(await pdfRes.text());
  expect(pdfRes.headers()["content-type"]).toContain("pdf");
  const body = await pdfRes.body();
  expect(body.length).toBeGreaterThan(500);
  const head = body.subarray(0, 8).toString("latin1");
  expect(head.startsWith("%PDF")).toBeTruthy();

  const sendRes = await page.request.post(`/api/projects/${testProject!.id}/begehungen/${begehung.id}/send`, {
    data: { to: "e2e@example.com", includePdf: false },
  });
  if (!sendRes.ok()) throw new Error(await sendRes.text());
});

test("Test 7: Planung Performance (Raster sichtbar)", async ({ page }) => {
  test.setTimeout(120_000);
  const weeks = Number(process.env.PLANUNG_PERF_WEEKS ?? "16");
  const t0 = Date.now();
  await page.goto(`/planung?weeks=${weeks}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId("planung-board").waitFor({ state: "visible", timeout: 60_000 });
  const loadMs = Date.now() - t0;
  const budget = Number(process.env.PLANUNG_PERF_LOAD_MS ?? "90000");
  expect(loadMs, `Ladezeit ${loadMs}ms`).toBeLessThan(budget);

  const jank = await page.evaluate(async () => {
    const samples: number[] = [];
    let t = performance.now();
    for (let i = 0; i < 40; i++) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const n = performance.now();
      samples.push(n - t);
      t = n;
    }
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length * 0.9)] ?? Math.max(...samples);
  });
  const jankBudget = Number(process.env.PLANUNG_PERF_JANK_MS ?? "200");
  expect(jank, `p90 rAF delta ${jank}ms`).toBeLessThan(jankBudget);
});

test("Test 8: Arbeitskorb Kontextkarten und Rechtslinks", async ({ page }) => {
  await page.goto("/arbeitskorb", { waitUntil: "domcontentloaded", timeout: 90_000 });

  const cards = page.getByTestId("arbeitskorb-context-cards");
  await expect(cards).toBeVisible();

  await expect(page.getByRole("heading", { name: "Hinweise & Quellen" })).toBeVisible();
  await expect(page.getByTestId("arbeitskorb-hinweis-vorankuendigung")).toBeVisible();
  await expect(page.getByTestId("arbeitskorb-hinweis-sigeplan")).toBeVisible();
  await expect(page.getByTestId("arbeitskorb-hinweis-koordination")).toBeVisible();
  await expect(page.getByTestId("arbeitskorb-hinweis-ordnungswidrigkeiten")).toBeVisible();

  const primaryVoran = page.getByTestId("arbeitskorb-link-primary-vorankuendigung");
  await expect(primaryVoran).toHaveAttribute("href", /gesetze-im-internet\.de\/baustellv/);
  const href = await primaryVoran.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href!.startsWith("http")).toBeTruthy();

  const primarySige = page.getByTestId("arbeitskorb-link-primary-sigeplan");
  await expect(primarySige).toHaveAttribute("href", /baua\.de.*RAB-31/i);

  await expect(page.getByText(/keine rechtsverbindliche Auskunft/i)).toBeVisible();
});
