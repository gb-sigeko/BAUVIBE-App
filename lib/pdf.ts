import { PDFDocument, StandardFonts } from "pdf-lib";

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildPdfDocument(opts: {
  title: string;
  sections: { heading: string; body: string }[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const left = 50;
  const lineH = 14;
  const pageBottom = 50;

  const newPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 800;
  };

  page.drawText(opts.title, { x: left, y, size: 16, font: fontBold });
  y -= 28;

  for (const section of opts.sections) {
    if (y < pageBottom + 80) newPage();
    page.drawText(section.heading, { x: left, y, size: 12, font: fontBold });
    y -= lineH;
    const bodyLines = wrapText(section.body || "—", 85);
    for (const line of bodyLines) {
      if (y < pageBottom) newPage();
      page.drawText(line, { x: left, y, size: 10, font });
      y -= lineH;
    }
    y -= 8;
  }

  return pdf.save();
}
