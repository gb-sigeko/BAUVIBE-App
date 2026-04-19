/**
 * Vollständige Testpipeline: Testdaten → DB-Suite → Playwright E2E.
 *
 * `npx tsx scripts/run-full-test-suite.ts` [--iterations=1]
 */
import "dotenv/config";
import { execSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const iterations = Math.min(
  10,
  Math.max(1, Number(process.argv.find((a) => a.startsWith("--iterations="))?.split("=")[1] ?? "1")),
);

async function main() {
  const allErrors: { iteration: number; errors: { test: string; message: string }[] }[] = [];

  for (let iter = 1; iter <= iterations; iter++) {
    console.info(`\n=== Iteration ${iter}/${iterations} ===\n`);
    execSync("npx tsx scripts/generate-test-data.ts", { cwd: root, stdio: "inherit" });

    const { runDbAutomatedSuite } = await import("../tests/automated/db-suite");
    const dbErrors = await runDbAutomatedSuite();
    const { runApiAutomatedSuite } = await import("../tests/automated/api-suite");
    const apiErrors = await runApiAutomatedSuite();

    const pw = spawnSync("npx", ["playwright", "test"], {
      cwd: root,
      encoding: "utf-8",
      shell: true,
      env: {
        ...process.env,
        EMAIL_MOCK: "1",
        PLANUNG_PERF_LOAD_MS: process.env.PLANUNG_PERF_LOAD_MS ?? "90000",
      },
    });
    if (pw.stdout) console.info(pw.stdout);
    if (pw.stderr) console.info(pw.stderr);

    const pwErrors: { test: string; message: string }[] = [];
    if (pw.status !== 0) {
      pwErrors.push({
        test: "Playwright",
        message: `Exit ${pw.status}\n${(pw.stdout ?? "").slice(-4000)}`,
      });
    }

    const merged = [...dbErrors, ...apiErrors, ...pwErrors];
    allErrors.push({ iteration: iter, errors: merged });

    if (merged.length === 0) {
      writeTestBericht(iter, true, []);
      console.info("\nAlle Tests grün.\n");
      process.exit(0);
    }

    console.error("\nFehler in Iteration", iter);
    for (const e of merged) {
      console.error(`- [${e.test}] ${e.message}`);
    }
  }

  writeTestBericht(iterations, false, allErrors);
  const failPath = join(root, "FEHLER_NACH_10_ITERATIONEN.md");
  writeFileSync(failPath, `# Fehler nach ${iterations} Iteration(en)\n\n\`\`\`json\n${JSON.stringify(allErrors, null, 2)}\n\`\`\`\n`, "utf-8");
  console.error(`\nSiehe ${failPath}\n`);
  process.exit(1);
}

function writeTestBericht(
  lastIter: number,
  success: boolean,
  allErrors: { iteration: number; errors: { test: string; message: string }[] }[],
) {
  const reportPath = join(root, "TESTBERICHT.md");
  const errSummary = success
    ? "Keine"
    : allErrors
        .flatMap((x) => x.errors.map((e) => `- **${e.test}:** ${e.message}`))
        .join("\n");
  const body = `# BAUVIBE Testbericht (Automatisiert)

- **Iterationen:** ${lastIter}
- **Status:** ${success ? "Alle Tests grün" : "Fehler vorhanden"}
- **Gefundene Fehler (letzter Lauf):**
${errSummary || "—"}

## Performance

- Planung: Budget über \`PLANUNG_PERF_LOAD_MS\` (Standard 8000ms), siehe Playwright-Test „Test 7“.

## Kernfunktionen geprüft

- Turnus 40 Wochen, Priorität FEST, Rückmeldungen/Zähler, Krank→Vertretung+Chronik, Arbeitskorb >5 Tage, Begehungs-PDF/Versand (Mock), Raster-Performance.

---
Erzeugt von \`scripts/run-full-test-suite.ts\`.
`;
  writeFileSync(reportPath, body, "utf-8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
