import { test, expect } from "@playwright/test";

test.describe("Epic 7 – KI-Stubs", () => {
  test("from-email, email/analyze, arbeitsschutz mock (API)", async ({ page }) => {
    await page.goto("/fee");

    const res = await page.evaluate(async () => {
      const headers = { "content-type": "application/json" };
      const offer = await fetch("/api/offers/from-email", {
        method: "POST",
        headers,
        body: JSON.stringify({ rawEmail: "Angebot über 12.500 EUR für Fensterbau" }),
      });
      const mail = await fetch("/api/email/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({ text: "Mangel an der Fassade, bitte Termin nennen." }),
      });
      const arb = await fetch("/api/arbeitsschutz/mock-extract", {
        method: "POST",
        headers,
        body: JSON.stringify({ fragment: "Gerüst und Steigweg prüfen." }),
      });
      return {
        ok: offer.ok && mail.ok && arb.ok,
        offer: (await offer.json()) as Record<string, unknown>,
        mail: (await mail.json()) as Record<string, unknown>,
        arb: (await arb.json()) as Record<string, unknown>,
      };
    });

    expect(res.ok).toBe(true);
    expect(res.offer.source).toBe("stub");
    expect(String(res.offer.suggestedTitle ?? "")).toBeTruthy();
    expect(res.mail.source).toBe("stub");
    expect(Array.isArray(res.mail.topics)).toBeTruthy();
    expect(res.arb.source).toBe("stub");
    expect(Array.isArray(res.arb.gefahrenbereiche)).toBeTruthy();
  });
});
