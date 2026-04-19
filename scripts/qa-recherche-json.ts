/**
 * QA: Recherche-JSON gegen Blockliste (INTEGRATIONSPLAN_RECHERCHE.md, Abschnitt 6).
 * Liest nur; schreibt qa_recherche_report.md und gibt Verstöße auf stdout aus.
 *
 * Ausführung: npm run qa:recherche
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FILES = [
  join(ROOT, "lib", "recherche_erweitert_baua.json"),
  join(ROOT, "lib", "recherche_erweitert_bg_bau.json"),
] as const;

const REPORT_PATH = join(ROOT, "qa_recherche_report.md");

type RuleId =
  | "FALSCHE_NORM_DIN_EN_1961"
  | "VERALTET_ANZEIGE_PARAGRAF_8"
  | "HTML_OHNE_PRAIMAERQUELLE"
  | "PAUSCHALE_OWI_PROGNOSE";

type Finding = {
  file: string;
  path: string;
  rule: RuleId;
  excerpt: string;
};

const PRIMARY_HOSTS = [
  "gesetze-im-internet.de",
  "baua.de",
  "dguv.de",
  "bg-bau.de",
] as const;

function normalizeText(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/┬º/g, "§")
    .replace(/\u00A7/g, "§");
}

function jsonPathAppend(base: string, key: string | number): string {
  if (base === "$") {
    return typeof key === "number" ? `${base}[${key}]` : `${base}.${key}`;
  }
  return typeof key === "number" ? `${base}[${key}]` : `${base}.${key}`;
}

function excerptOf(s: string, max = 180): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function hasPrimaryHost(s: string): boolean {
  const lower = s.toLowerCase();
  return PRIMARY_HOSTS.some((h) => lower.includes(h));
}

function matchesDinEn1961(s: string): boolean {
  if (/DIN\s*EN\s*1961/i.test(s)) return true;
  // EN 1961 als eigenständige Normnummer (nicht Teil von 19610 o. Ä.)
  if (/(?<![0-9/–-])EN\s*1961(?![0-9])/i.test(s)) return true;
  return false;
}

function matchesFalseAnzeigeUnder8(s: string): boolean {
  const n = normalizeText(s);
  if (!/(?:^|[^0-9])(?:§|Par\.?\s*|Paragrafen?\s*|Paragraf\s*)\s*8\b/i.test(n)) return false;

  // Korrekturhinweise / explizite Entwarnung
  if (/nicht\s+in\s+§?\s*8\b/i.test(n)) return false;
  if (/nicht\s+unter\s+§?\s*8\b/i.test(n)) return false;
  if (/§\s*2\s+Abs\.\s*2/i.test(n) && /nicht\s+in\s+§?\s*8/i.test(n)) return false;

  const anzeigeOrVorank =
    /\bAnzeige\b/i.test(n) ||
    /\bAnzeigepflicht\b/i.test(n) ||
    /\bBaustellenanzeige\b/i.test(n) ||
    /\bMeldepflicht\b/i.test(n) ||
    /\bVorankündigung\b/i.test(n) ||
    /Vorank├╝ndigung/i.test(s);

  if (!anzeigeOrVorank) return false;

  const idx8 = (() => {
    const m = /(?:§|Par\.?\s*|Paragrafen?\s*|Paragraf\s*)\s*8\b/i.exec(n);
    return m ? m.index : -1;
  })();
  if (idx8 < 0) return false;

  const termIdx = (patterns: RegExp[]) => {
    let best = -1;
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      while ((m = r.exec(n)) !== null) {
        if (best < 0 || m.index < best) best = m.index;
      }
    }
    return best;
  };

  const idxTerm = termIdx([
    /\bAnzeige\b/i,
    /\bAnzeigepflicht\b/i,
    /\bBaustellenanzeige\b/i,
    /\bMeldepflicht\b/i,
    /\bVorankündigung\b/i,
    /Vorank├╝ndigung/i,
  ]);

  if (idxTerm < 0) return false;
  return Math.abs(idx8 - idxTerm) <= 220;
}

const HTML_TAG_RE = /<\s*\/?\s*(p|div|a|span|ul|ol|li|br|table|tr|td|th|h[1-6])\b/i;

function matchesHtmlWithoutPrimary(s: string): boolean {
  if (!HTML_TAG_RE.test(s)) return false;
  return !hasPrimaryHost(s);
}

/** Pauschale, personalisierte Rechtsfolgen-Prognosen (heuristisch). */
function matchesPauschaleOwiPrognose(s: string): boolean {
  const n = s.trim();
  if (!n) return false;

  // Typisch neutrale Formulierungen nicht anfassen
  if (/kann\s+mit\s+Geldbuße\s+geahndet\s+werden/i.test(n) && !/\bSie\b/i.test(n)) return false;
  if (/kann\s+.*?geahndet\s+werden/i.test(n) && !/(Sie|Ihnen|Du|dir|deiner|deinen)\b/i.test(n)) return false;

  const patterns: RegExp[] = [
    /\bSie\s+[^.]{0,120}?\b(müssen|sollten)\b[^.]{0,120}?\b(mit\s+)?(einem\s+)?(Bußgeld|Bussgeld|Geldbuße)\b[^.]{0,40}?\brechnen\b/i,
    /\bDu\s+[^.]{0,80}?\b(musst|solltest)\b[^.]{0,80}?\b(Bußgeld|Bussgeld|Geldbuße)\b/i,
    /\bIhnen\s+droht\b/i,
    /\bDir\s+droht\b/i,
    /\bSie\s+riskieren\b/i,
    /\bSie\s+[^.]{0,100}?\bwerden\s+[^.]{0,80}?\b(bestraft|verurteilt|belangt)\b/i,
    /\bBei\s+Versto(ss|ß)\b[^.]{0,140}?\bSie\s+[^.]{0,80}?\b(müssen|sollten)\b[^.]{0,80}?\b(Bußgeld|Bussgeld|Geldbuße|Strafe)\b/i,
    /\bBei\s+Versto(ss|ß)\b[^.]{0,120}?\bdroht\s+Ihnen\b/i,
    /\bSie\s+handeln\s+[^.]{0,100}?\b(strafbar|ordnungswidrig)\b/i,
    /\bSie\s+[^.]{0,100}?\b(personenbezogene|persönliche)\s+Haftung\b/i,
  ];

  return patterns.some((re) => re.test(n));
}

function scanString(fileLabel: string, jsonPath: string, value: string, out: Finding[]): void {
  if (matchesDinEn1961(value)) {
    out.push({
      file: fileLabel,
      path: jsonPath,
      rule: "FALSCHE_NORM_DIN_EN_1961",
      excerpt: excerptOf(value),
    });
  }
  if (matchesFalseAnzeigeUnder8(value)) {
    out.push({
      file: fileLabel,
      path: jsonPath,
      rule: "VERALTET_ANZEIGE_PARAGRAF_8",
      excerpt: excerptOf(value),
    });
  }
  if (matchesHtmlWithoutPrimary(value)) {
    out.push({
      file: fileLabel,
      path: jsonPath,
      rule: "HTML_OHNE_PRAIMAERQUELLE",
      excerpt: excerptOf(value),
    });
  }
  if (matchesPauschaleOwiPrognose(value)) {
    out.push({
      file: fileLabel,
      path: jsonPath,
      rule: "PAUSCHALE_OWI_PROGNOSE",
      excerpt: excerptOf(value),
    });
  }
}

function walk(value: unknown, fileLabel: string, path: string, out: Finding[]): void {
  if (typeof value === "string") {
    scanString(fileLabel, path, value, out);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, fileLabel, jsonPathAppend(path, i), out));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    walk(v, fileLabel, jsonPathAppend(path, k), out);
  }
}

function countByRule(findings: Finding[]): Record<RuleId, number> {
  const init: Record<RuleId, number> = {
    FALSCHE_NORM_DIN_EN_1961: 0,
    VERALTET_ANZEIGE_PARAGRAF_8: 0,
    HTML_OHNE_PRAIMAERQUELLE: 0,
    PAUSCHALE_OWI_PROGNOSE: 0,
  };
  for (const f of findings) init[f.rule]++;
  return init;
}

function main(): void {
  const all: Finding[] = [];

  for (const abs of FILES) {
    const fileLabel = abs.replace(/\\/g, "/").split("/").slice(-2).join("/");
    let raw = readFileSync(abs, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const data: unknown = JSON.parse(raw);
    walk(data, fileLabel, "$", all);
  }

  const counts = countByRule(all);
  const failed = all.length > 0;
  const verdict = failed ? "FAILED" : "PASSED";

  for (const f of all) {
    console.log(`${f.file}: ${f.path} – ${f.rule} – ${f.excerpt}`);
  }

  const lines: string[] = [
    "# QA-Recherche-JSON",
    "",
    `**Gesamturteil:** ${verdict}`,
    "",
    "## Zusammenfassung (Anzahl je Kategorie)",
    "",
    `| Kategorie | Anzahl |`,
    `| --- | ---: |`,
    `| Falsche Normzuordnung DIN EN 1961 / EN 1961 | ${counts.FALSCHE_NORM_DIN_EN_1961} |`,
    `| Veraltet: Anzeige mit BaustellV § 8 verknüpft | ${counts.VERALTET_ANZEIGE_PARAGRAF_8} |`,
    `| HTML-artig ohne Primärquellen-Link | ${counts.HTML_OHNE_PRAIMAERQUELLE} |`,
    `| Pauschale OWi-/Straf-Prognose (personalisiert) | ${counts.PAUSCHALE_OWI_PROGNOSE} |`,
    `| **Summe** | **${all.length}** |`,
    "",
    "## Detaillierte Fundstellen",
    "",
  ];

  if (all.length === 0) {
    lines.push("*Keine Verstöße gegen die geprüften Regeln.*", "");
  } else {
    for (const f of all) {
      lines.push(`- **Datei:** \`${f.file}\`  `);
      lines.push(`  - **Pfad:** \`${f.path}\`  `);
      lines.push(`  - **Regel:** \`${f.rule}\`  `);
      lines.push(`  - **Auszug:** ${f.excerpt.replace(/\|/g, "\\|")}  `);
      lines.push("");
    }
  }

  lines.push("---", "", "_Automatisch erzeugt durch `scripts/qa-recherche-json.ts`._", "");

  writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
  console.log("");
  console.log(`Bericht: ${REPORT_PATH.replace(/\\/g, "/")}`);
  console.log(`Urteil: ${verdict} (${all.length} Verstoß${all.length === 1 ? "" : "e"})`);

  process.exit(failed ? 1 : 0);
}

main();
