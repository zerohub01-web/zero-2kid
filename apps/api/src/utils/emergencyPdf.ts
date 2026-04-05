import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toAscii(value: unknown): string {
  return String(value ?? "")
    .replace(/\u20B9/g, "INR ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();
}

export async function generateEmergencyPdf(title: string, lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595.28, 841.89]);
  let y = 800;

  const drawLine = (text: string, size = 11, isBold = false) => {
    if (y < 60) {
      page = doc.addPage([595.28, 841.89]);
      y = 800;
    }

    page.drawText(toAscii(text) || "-", {
      x: 44,
      y,
      size,
      font: isBold ? bold : regular,
      color: rgb(0.12, 0.12, 0.12)
    });
    y -= size + 8;
  };

  drawLine(title, 16, true);
  y -= 4;

  for (const line of lines) {
    drawLine(line, 11, false);
  }

  y -= 6;
  drawLine("Generated using emergency PDF fallback.", 9, false);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
