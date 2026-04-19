/** Reserviert für zukünftige reine fetch-Suites; E2E läuft über Playwright. */
export type ApiSuiteError = { test: string; message: string };

export async function runApiAutomatedSuite(): Promise<ApiSuiteError[]> {
  return [];
}
