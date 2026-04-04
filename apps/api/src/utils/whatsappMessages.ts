import type { Contract, Invoice } from "../db/schema.js";

const LINE = "\u2501".repeat(15);

function getWebBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || process.env.CLIENT_ORIGIN;
  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

function firstName(value: string): string {
  const clean = String(value || "").trim();
  if (!clean) return "there";
  const [head] = clean.split(/\s+/);
  return head || "there";
}

export function buildContractWhatsApp(
  contract: Pick<Contract, "clientName" | "contractNumber" | "serviceType" | "effectiveDate" | "advanceAmount" | "currencySymbol"> & {
    id: string;
    portalLink?: string;
  }
): string {
  const portalLink = contract.portalLink || `${getWebBase()}/portal/contract/${contract.id}`;
  const dateText = new Date(contract.effectiveDate).toLocaleDateString("en-GB");
  const advanceLine = contract.advanceAmount
    ? `\u{1F4B0} Advance: ${contract.currencySymbol}${Number(contract.advanceAmount).toLocaleString("en-IN")}\n`
    : "";

  return (
    `\u{1F4CB} *Service Agreement from ZERO OPS*\n` +
    `${LINE}\n` +
    `Hi ${firstName(contract.clientName)}! \u{1F44B}\n\n` +
    "Your service agreement is ready for review.\n\n" +
    `\u{1F4CB} Contract: ${contract.contractNumber}\n` +
    `\u{1F6E0} Service: ${contract.serviceType}\n` +
    `\u{1F4C5} Date: ${dateText}\n` +
    advanceLine +
    "\nPlease review and sign here:\n" +
    `\u{1F517} ${portalLink}\n\n` +
    "The PDF is also in your email.\n\n" +
    "Questions? Reply here anytime.\n" +
    "\u2014 ZERO OPS Team"
  );
}

export function buildInvoiceWhatsApp(
  invoice: Pick<Invoice, "clientName" | "invoiceNumber" | "currencySymbol" | "totalAmount" | "dueDate" | "upiId"> & {
    id: string;
    portalLink?: string;
  }
): string {
  const portalLink = invoice.portalLink || `${getWebBase()}/portal/invoice/${invoice.id}`;
  const dueDateText = new Date(invoice.dueDate).toLocaleDateString("en-GB");
  const upiValue = invoice.upiId || "zerohub01@upi";

  return (
    `\u{1F9FE} *Invoice from ZERO OPS*\n` +
    `${LINE}\n` +
    `Hi ${firstName(invoice.clientName)}! \u{1F44B}\n\n` +
    "Your invoice is ready.\n\n" +
    `\u{1F9FE} Invoice: ${invoice.invoiceNumber}\n` +
    `\u{1F4B3} Amount Due: ${invoice.currencySymbol}${Number(invoice.totalAmount).toLocaleString("en-IN")}\n` +
    `\u{1F4C5} Due Date: ${dueDateText}\n\n` +
    "View your invoice here:\n" +
    `\u{1F517} ${portalLink}\n\n` +
    `Pay via UPI: ${upiValue}\n\n` +
    "Questions? Reply here anytime.\n" +
    "\u2014 ZERO OPS Team"
  );
}
