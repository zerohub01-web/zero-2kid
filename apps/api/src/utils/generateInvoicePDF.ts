import puppeteer from "puppeteer";
import type { Invoice, InvoiceItem } from "../db/schema.js";
import { formatCurrency } from "./currency.js";

import { generateSimplePdf } from "./simplePdf.js";
import { generateEmergencyPdf } from "./emergencyPdf.js";

export interface InvoiceWithItems extends Omit<Invoice, "items"> {
  id: string;
  items: InvoiceItem[];
}

function buildInvoiceHTML(invoice: InvoiceWithItems): string {
  const currency = (amount: number) => formatCurrency(amount, invoice.currencySymbol || "₹", invoice.currency || "INR");

  const rows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>
          <div class="desc">${item.description}</div>
          ${item.category ? `<div class="cat">${item.category}</div>` : ""}
        </td>
        <td>${item.quantity}</td>
        <td>${currency(item.unitPrice)}</td>
        <td>${currency(item.total)}</td>
      </tr>`
    )
    .join("");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${invoice.invoiceNumber}</title>
    <style>
      *{box-sizing:border-box}
      body{margin:0;font-family:Arial,sans-serif;color:#111;background:#fff}
      .header{background:#0a0a0f;color:#fff;padding:28px 34px;display:flex;justify-content:space-between;align-items:flex-start}
      .brand{font-size:24px;font-weight:800;letter-spacing:.4px}
      .brand span{color:#00c896}
      .meta{font-size:12px;text-align:right;color:#d1d5db}
      .meta .num{font-size:20px;color:#00c896;font-weight:700}
      .body{padding:32px 34px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-bottom:28px}
      .label{font-size:10px;color:#6b7280;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
      .name{font-size:16px;font-weight:700;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#111827;color:#fff;font-size:11px;padding:10px;text-align:left;text-transform:uppercase;letter-spacing:.07em}
      td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;vertical-align:top}
      .desc{font-weight:600}
      .cat{display:inline-block;margin-top:5px;padding:2px 8px;background:#ecfeff;color:#065f46;border-radius:4px;font-size:10px}
      .totals{margin-top:22px;display:flex;justify-content:flex-end}
      .box{width:320px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
      .line{display:flex;justify-content:space-between;padding:10px 14px;font-size:13px;border-bottom:1px solid #f3f4f6}
      .line.total{background:#0a0a0f;color:#fff;font-size:16px;font-weight:700;border-bottom:none}
      .line.total span:last-child{color:#00c896}
      .note{margin-top:20px;padding:12px 14px;background:#f9fafb;border-left:3px solid #00c896;font-size:12px;line-height:1.6}
      .foot{margin-top:32px;padding:14px 0;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280}
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="brand">ZERO<span>OPS</span></div>
        <div style="font-size:10px;color:#9ca3af;letter-spacing:.14em;text-transform:uppercase;margin-top:5px">Business Automation Systems</div>
      </div>
      <div class="meta">
        <div>Invoice / Proposal</div>
        <div class="num">${invoice.invoiceNumber}</div>
        <div>Issued: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}</div>
        <div>Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</div>
      </div>
    </div>

    <div class="body">
      <div class="grid">
        <div>
          <div class="label">From</div>
          <div class="name">ZERO Business Automation Systems</div>
          <div>Bengaluru, Karnataka</div>
          <div>zerohub01@gmail.com</div>
          <div>+91 97469 27368</div>
        </div>

        <div>
          <div class="label">Bill To</div>
          <div class="name">${invoice.clientName}</div>
          <div>${invoice.clientBusiness}</div>
          <div>${invoice.clientEmail}</div>
          <div>${invoice.clientPhone}</div>
          ${invoice.clientAddress ? `<div>${invoice.clientAddress}</div>` : ""}
          ${invoice.clientGST ? `<div style="margin-top:6px;font-size:12px">GST: ${invoice.clientGST}</div>` : ""}
        </div>
      </div>

      ${invoice.proposalNote ? `<div class="note">${invoice.proposalNote}</div>` : ""}

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="width:80px">Qty</th>
            <th style="width:150px">Unit Price</th>
            <th style="width:150px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="totals">
        <div class="box">
          <div class="line"><span>Subtotal</span><span>${currency(invoice.subtotal)}</span></div>
          <div class="line"><span>${invoice.currency === "INR" ? "GST" : "Tax"} (${invoice.gstRate}%)</span><span>${currency(invoice.gstAmount)}</span></div>
          <div class="line total"><span>Total Due</span><span>${currency(invoice.totalAmount)}</span></div>
        </div>
      </div>

      <div class="foot">
        <div>Payment Terms: ${invoice.paymentTerms}</div>
        <div>UPI: ${invoice.upiId || "zerohub01@upi"} | IFSC: ${invoice.ifscCode || "-"}</div>
      </div>
    </div>
  </body>
</html>`;
}

const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] as const;

async function launchPdfBrowser() {
  const executablePath = (process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || "").trim();

  if (executablePath) {
    try {
      return await puppeteer.launch({
        headless: true,
        args: [...launchArgs],
        executablePath
      });
    } catch (error) {
      console.warn(`[PDF] Failed launching Chrome at "${executablePath}". Retrying with Puppeteer managed browser.`, error);
    }
  }

  return puppeteer.launch({
    headless: true,
    args: [...launchArgs]
  });
}

export async function generateInvoicePDF(invoice: InvoiceWithItems): Promise<Buffer> {
  try {
    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(buildInvoiceHTML(invoice), { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("[PDF] Invoice styled PDF generation failed. Falling back to simplified PDF.", error);
    try {
      return await generateSimplePdf({
        title: "ZERO OPS - Invoice",
        subtitle: invoice.invoiceNumber || "",
        rows: [
          { label: "Invoice Number", value: invoice.invoiceNumber || "-" },
          { label: "Client Name", value: invoice.clientName || "-" },
          { label: "Client Email", value: invoice.clientEmail || "-" },
          { label: "Client Phone", value: invoice.clientPhone || "-" },
          { label: "Client Business", value: invoice.clientBusiness || "-" },
          { label: "Due Date", value: new Date(invoice.dueDate).toLocaleDateString("en-IN") },
          { label: "Subtotal", value: formatCurrency(Number(invoice.subtotal || 0), invoice.currencySymbol || "\u20B9", invoice.currency || "INR") },
          { label: "Tax", value: `${Number(invoice.gstRate || 0)}%` },
          { label: "Total Amount", value: formatCurrency(Number(invoice.totalAmount || 0), invoice.currencySymbol || "\u20B9", invoice.currency || "INR") },
          { label: "Payment Terms", value: invoice.paymentTerms || "-" }
        ],
        footerNote:
          "This is a simplified fallback PDF because the high-fidelity renderer is temporarily unavailable."
      });
    } catch (fallbackError) {
      console.error("[PDF] Invoice simplified fallback failed. Using emergency PDF.", fallbackError);
      return generateEmergencyPdf("ZERO OPS - Invoice", [
        `Invoice Number: ${invoice.invoiceNumber || "-"}`,
        `Client Name: ${invoice.clientName || "-"}`,
        `Client Email: ${invoice.clientEmail || "-"}`,
        `Client Phone: ${invoice.clientPhone || "-"}`,
        `Client Business: ${invoice.clientBusiness || "-"}`,
        `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
        `Total Amount: ${formatCurrency(Number(invoice.totalAmount || 0), invoice.currencySymbol || "\u20B9", invoice.currency || "INR")}`,
        `Payment Terms: ${invoice.paymentTerms || "-"}`
      ]);
    }
  }
}
