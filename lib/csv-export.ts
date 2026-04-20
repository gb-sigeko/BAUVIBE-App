export function csvEscapeCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvFromRows(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(csvEscapeCell).join(",");
  const dataLines = rows.map((r) => r.map(csvEscapeCell).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}
