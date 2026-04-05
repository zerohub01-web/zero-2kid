import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

interface SimplePdfOptions {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  footerNote?: string;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 46;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 11;
const LABEL_SIZE = 10;
const VALUE_SIZE = 11;
const FOOTER_SIZE = 9;
const LINE_GAP = 6;

function safe(value: unknown): string {
  return String(value ?? "").trim();
}

function toWinAnsiSafe(value: unknown): string {
  return safe(value)
    .replace(/\u20B9/g, "INR ")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n\r\t]/g, "");
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont) {
  const words = toWinAnsiSafe(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export async function generateSimplePdf({ title, subtitle, rows, footerNote }: SimplePdfOptions): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN_TOP;
  const contentWidth = A4_WIDTH - MARGIN_X * 2;

  const ensureSpace = (required: number) => {
    if (y - required <= MARGIN_BOTTOM) {
      page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
      y = A4_HEIGHT - MARGIN_TOP;
    }
  };

  page.drawText(toWinAnsiSafe(title), {
    x: MARGIN_X,
    y,
    size: TITLE_SIZE,
    font: bold,
    color: rgb(0.08, 0.08, 0.08)
  });
  y -= TITLE_SIZE + 8;

  if (subtitle) {
    page.drawText(toWinAnsiSafe(subtitle), {
      x: MARGIN_X,
      y,
      size: SUBTITLE_SIZE,
      font: regular,
      color: rgb(0.32, 0.32, 0.32)
    });
    y -= SUBTITLE_SIZE + 12;
  }

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: A4_WIDTH - MARGIN_X, y },
    color: rgb(0.82, 0.82, 0.82),
    thickness: 1
  });
  y -= 16;

  for (const row of rows) {
    const label = `${toWinAnsiSafe(row.label)}:`;
    const value = toWinAnsiSafe(row.value) || "-";
    const labelWidth = Math.min(160, contentWidth * 0.34);
    const valueX = MARGIN_X + labelWidth + 10;
    const valueWidth = contentWidth - labelWidth - 10;

    const valueLines = wrapText(value, valueWidth, VALUE_SIZE, regular);
    const blockHeight = Math.max(
      LABEL_SIZE + 2,
      valueLines.length * VALUE_SIZE + (valueLines.length - 1) * LINE_GAP
    );

    ensureSpace(blockHeight + 10);

    page.drawText(label, {
      x: MARGIN_X,
      y: y - 1,
      size: LABEL_SIZE,
      font: bold,
      color: rgb(0.23, 0.23, 0.23)
    });

    let valueY = y;
    for (const line of valueLines) {
      page.drawText(line, {
        x: valueX,
        y: valueY,
        size: VALUE_SIZE,
        font: regular,
        color: rgb(0.12, 0.12, 0.12)
      });
      valueY -= VALUE_SIZE + LINE_GAP;
    }

    y -= blockHeight + 10;
  }

  const finalFooter =
    toWinAnsiSafe(footerNote) ||
    "Auto-generated fallback PDF copy. Please contact ZERO OPS support if you need the styled PDF version.";

  ensureSpace(FOOTER_SIZE + 8);
  page.drawLine({
    start: { x: MARGIN_X, y: y - 2 },
    end: { x: A4_WIDTH - MARGIN_X, y: y - 2 },
    color: rgb(0.88, 0.88, 0.88),
    thickness: 1
  });
  y -= FOOTER_SIZE + 8;

  const footerLines = wrapText(finalFooter, contentWidth, FOOTER_SIZE, regular);
  for (const line of footerLines) {
    ensureSpace(FOOTER_SIZE + 2);
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: FOOTER_SIZE,
      font: regular,
      color: rgb(0.43, 0.43, 0.43)
    });
    y -= FOOTER_SIZE + 3;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
