import fs from "node:fs/promises";
import path from "node:path";
import { BookingDocument } from "../models/Booking.js";
import { ProposalPlan, resolveProposalPlan } from "./leadAutomation.service.js";
import { sanitizeSingleLine } from "../utils/sanitize.js";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");
const PROPOSALS_DIR = path.join(STORAGE_ROOT, "proposals");

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfBuffer(lines: string[]) {
  const lineGap = 17;
  const textBody = lines
    .map((line, index) => {
      const escaped = escapePdfText(line);
      if (index === 0) {
        return `(${escaped}) Tj`;
      }
      return `0 -${lineGap} Td\n(${escaped}) Tj`;
    })
    .join("\n");

  const stream = `BT\n/F1 12 Tf\n48 790 Td\n${textBody}\nET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((objectContent, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function buildProposalLines(lead: BookingDocument, plan: ProposalPlan) {
  const today = new Date();
  const budgetLabel = typeof lead.budget === "number" ? `INR ${lead.budget.toLocaleString()}` : "Not provided";

  return [
    "ZERO Proposal Document",
    `Date: ${today.toISOString().slice(0, 10)}`,
    "",
    `Lead ID: ${lead.bookingId}`,
    `Client Name: ${sanitizeSingleLine(lead.name, 80)}`,
    `Email: ${sanitizeSingleLine(lead.email, 120)}`,
    `Phone: ${sanitizeSingleLine(lead.phone, 40)}`,
    `Business Type: ${sanitizeSingleLine(lead.businessType, 120)}`,
    "",
    `Requested Service: ${sanitizeSingleLine(lead.service, 140)}`,
    `Package: ${plan.packageName}`,
    `Proposed Price: ${plan.priceLabel}`,
    `Estimated Timeline: ${plan.timeline}`,
    `Budget Shared: ${budgetLabel}`,
    "",
    "Project Scope Notes",
    sanitizeSingleLine(lead.message, 400),
    "",
    "Terms",
    "1. Proposal is valid for 14 calendar days from issue date.",
    "2. Final scope and timeline depend on discovery call and requirements sign-off.",
    "3. Delivery milestones and payment schedule will be shared in the contract.",
    "",
    "Prepared by ZERO"
  ];
}

export function getProposalsDirectoryPath() {
  return PROPOSALS_DIR;
}

function extractProposalFileName(storedUrl?: string) {
  const raw = String(storedUrl ?? "").trim();
  if (!raw) return "";

  const candidate = raw.split("?")[0]?.split("/").pop() ?? "";
  if (!candidate.toLowerCase().endsWith(".pdf")) {
    return "";
  }

  return decodeURIComponent(candidate);
}

export async function resolveProposalPdfForBooking(publicBookingId: string, storedUrl?: string) {
  await fs.mkdir(PROPOSALS_DIR, { recursive: true });

  const storedFileName = extractProposalFileName(storedUrl);
  if (storedFileName) {
    const directPath = path.join(PROPOSALS_DIR, storedFileName);
    try {
      await fs.access(directPath);
      return {
        fileName: storedFileName,
        filePath: directPath
      };
    } catch {
      // Fall through to prefix search.
    }
  }

  const files = await fs.readdir(PROPOSALS_DIR);
  const prefix = `${publicBookingId}-`;
  const match = files
    .filter((file) => file.startsWith(prefix) && file.toLowerCase().endsWith(".pdf"))
    .sort()
    .at(-1);

  if (!match) {
    return null;
  }

  return {
    fileName: match,
    filePath: path.join(PROPOSALS_DIR, match)
  };
}

export async function generateProposalForLead(
  lead: BookingDocument,
  proposalBaseUrl: string
): Promise<{ proposalUrl: string; plan: ProposalPlan; filePath: string }> {
  await fs.mkdir(PROPOSALS_DIR, { recursive: true });

  const plan = resolveProposalPlan(lead.service);
  const fileName = `${lead.bookingId}-${Date.now()}.pdf`;
  const filePath = path.join(PROPOSALS_DIR, fileName);
  const proposalLines = buildProposalLines(lead, plan);
  const pdfBuffer = buildPdfBuffer(proposalLines);

  await fs.writeFile(filePath, pdfBuffer);

  const baseUrl = proposalBaseUrl.replace(/\/$/, "");
  return {
    proposalUrl: `${baseUrl}/${encodeURIComponent(fileName)}`,
    plan,
    filePath
  };
}
