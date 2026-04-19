export const AUTO_TEST_TENANT = "bauvibe-auto-42";
export const TEST_YEAR = 2026;
export const TEST_WEEK_FROM = 1;
export const TEST_WEEK_TO = 40;

export function isoKey(isoYear: number, isoWeek: number) {
  return `${isoYear}-${isoWeek}`;
}

export function horizonRange(): { isoYear: number; isoWeek: number }[] {
  const out: { isoYear: number; isoWeek: number }[] = [];
  for (let w = TEST_WEEK_FROM; w <= TEST_WEEK_TO; w++) {
    out.push({ isoYear: TEST_YEAR, isoWeek: w });
  }
  return out;
}
