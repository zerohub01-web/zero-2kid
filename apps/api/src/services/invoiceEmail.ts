import { Resend } from "resend";
import { env } from "../config/env.js";
import type { InvoiceWithItems } from "../utils/generateInvoicePDF.js";
import { formatCurrency } from "../utils/currency.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

function getInvoiceFromAddress(): string {
  return (
    process.env.INVOICE_EMAIL_FROM ||
    process.env.CONTRACT_EMAIL_FROM ||
    env.emailFrom ||
    "ZeroOps <contracts@zeroops.in>"
  );
}

function getWebBase(): string {
  const direct = process.env.NEXT_PUBLIC_WEB_URL ?? process.env.WEB_URL ?? env.clientOrigin;
  return (direct || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendInvoiceEmail(
  invoice: InvoiceWithItems,
  pdfBuffer?: Buffer,
  portalLink = `${getWebBase()}/portal/invoice/${invoice.id}`
): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY missing: skipping invoice email send.");
    return false;
  }

  const total = formatCurrency(invoice.totalAmount, invoice.currencySymbol, invoice.currency);

  await resend.emails.send({
    from: getInvoiceFromAddress(),
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ZeroOps - ${total} due`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#0a0a0f;padding:26px 30px;color:#fff">
          <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.2px">ZERO<span style="color:#00c896">OPS</span></h1>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)">Business Automation Systems</p>
        </div>
        <div style="padding:28px 30px">
          <p style="margin:0 0 12px;font-size:16px;color:#111">Hi ${invoice.clientName.split(" ")[0]},</p>
          <p style="margin:0 0 20px;color:#4b5563;line-height:1.7">
            Please find your invoice <strong>${invoice.invoiceNumber}</strong> attached.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px 20px;text-align:center;margin-bottom:20px">
            <p style="margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b7280">Amount Due</p>
            <p style="margin:7px 0 0;font-size:34px;font-weight:800;color:#111">${total}</p>
            <p style="margin:7px 0 0;font-size:12px;color:#b91c1c">Due by ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>
          </div>
          <p style="margin:0 0 18px;color:#4b5563;line-height:1.7">
            You can view and sign this invoice online using the link below.
          </p>
          <a href="${portalLink}" style="display:inline-block;background:#00c896;color:#051b12;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">View and Sign Invoice</a>
          <p style="margin:18px 0 0;font-size:12px;color:#9ca3af">UPI: ${invoice.upiId || "zerohub01@upi"} | Email: zerohub01@gmail.com</p>
        </div>
      </div>
    `,
    ...(pdfBuffer
      ? {
          attachments: [
            {
              filename: `${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer.toString("base64")
            }
          ]
        }
      : {})
  });

  return true;
}

export async function sendInvoiceSignedNotifications(invoice: InvoiceWithItems): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY missing: skipping signed invoice notifications.");
    return false;
  }

  const total = formatCurrency(invoice.totalAmount, invoice.currencySymbol, invoice.currency);

  const sharedHtml = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 28px">
      <h2 style="margin:0 0 10px;color:#111">Invoice signed successfully</h2>
      <p style="margin:0 0 14px;color:#4b5563">Invoice <strong>${invoice.invoiceNumber}</strong> has been digitally signed.</p>
      <p style="margin:0;color:#4b5563">Total: <strong>${total}</strong></p>
      <p style="margin:8px 0 0;color:#4b5563">Signed at: ${invoice.signedAt ? new Date(invoice.signedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}</p>
    </div>
  `;

  await Promise.all([
    resend.emails.send({
      from: getInvoiceFromAddress(),
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} signed - confirmation`,
      html: sharedHtml
    }),
    resend.emails.send({
      from: getInvoiceFromAddress(),
      to: env.adminNotifyEmail,
      subject: `Client signed invoice ${invoice.invoiceNumber}`,
      html: sharedHtml
    })
  ]);

  return true;
}
