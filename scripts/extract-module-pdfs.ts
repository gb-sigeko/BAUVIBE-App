import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/** Root-`pdf-parse` startet ohne Parent einen Debug-Block — Lib direkt laden. */
const pdf = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

async function main() {
  const root = process.cwd();
  const files = fs.readdirSync(root).filter((f) => f.toLowerCase().endsWith(".pdf"));
  const docsDir = path.join(root, "docs");
  fs.mkdirSync(docsDir, { recursive: true });

  for (const f of files) {
    const buf = fs.readFileSync(path.join(root, f));
    const data = await pdf(buf);
    const lower = f.toLowerCase();
    const isWochenplanungPdf =
      /^modul\s+wochenplanung\.pdf$/i.test(f) ||
      (lower.endsWith("wochenplanung.pdf") && !lower.includes("ohne wochenplanung"));
    const out = isWochenplanungPdf
      ? path.join(docsDir, "Modul_Wochenplanung.txt")
      : path.join(docsDir, "Modul_Uebersicht.txt");
    fs.writeFileSync(out, data.text, "utf8");
    console.log(`${f} -> ${out} (${data.numpages} pages)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
