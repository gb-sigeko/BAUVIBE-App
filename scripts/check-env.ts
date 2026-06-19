import "dotenv/config";

/**
 * Prüft Pflicht-Umgebungsvariablen vor `dev` / `build`.
 * In Produktion (NODE_ENV=production) kein Überspringen ohne explizites Opt-in.
 */

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "EMAIL_SERVER",
  "EMAIL_FROM",
  "EMAIL_MOCK",
] as const;

const AUTH_SECRET_KEYS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;

const OPTIONAL_HINTS = [
  "RESEND_API_KEY (optional)",
  "OPENAI_API_KEY (optional, Phase 9)",
  "GEMINI_API_KEY (optional, Phase 9)",
] as const;

function missing(name: string): boolean {
  const v = process.env[name];
  return v === undefined || v.trim() === "";
}

function main() {
  if (process.env.SKIP_REQUIRED_ENV_CHECK === "1") {
    console.warn("[check-env] SKIP_REQUIRED_ENV_CHECK=1 – Pflichtvariablen werden nicht geprüft.");
    return;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && process.env.ALLOW_INCOMPLETE_ENV === "1") {
    console.warn("[check-env] ALLOW_INCOMPLETE_ENV=1 in production – nur für Notfälle.");
    return;
  }

  const problems: string[] = [];

  for (const key of REQUIRED) {
    if (missing(key)) problems.push(`${key} fehlt oder ist leer`);
  }

  if (AUTH_SECRET_KEYS.every((k) => missing(k))) {
    problems.push("Mindestens eines von AUTH_SECRET oder NEXTAUTH_SECRET muss gesetzt sein");
  }

  if (problems.length) {
    console.error("\n[check-env] Umgebungsvariablen unvollständig:\n");
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\nVorlage: .env.example");
    console.error("Lokal ohne vollständige .env: SKIP_REQUIRED_ENV_CHECK=1 npm run dev");
    console.error(`Hinweise (optional): ${OPTIONAL_HINTS.join("; ")}\n`);
    process.exit(1);
  }
}

main();
