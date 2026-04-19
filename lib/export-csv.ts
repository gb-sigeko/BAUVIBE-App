function escCell(s: string) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: string[][]) {
  const lines = [headers.map(escCell).join(";"), ...rows.map((r) => r.map(escCell).join(";"))];
  return `\uFEFF${lines.join("\n")}`;
}
