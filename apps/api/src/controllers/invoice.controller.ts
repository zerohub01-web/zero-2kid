import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { InvoiceModel, type InvoiceDocument, type InvoiceItem, type InvoiceStatus } from "../db/schema.js";
import { generateInvoiceNumber } from "../utils/invoiceNumber.js";
import { detectCurrency } from "../utils/currency.js";
import { generateInvoicePDF, type InvoiceWithItems } from "../utils/generateInvoicePDF.js";
import { buildPortalAccess } from "../utils/portalToken.js";
import { sendInvoiceEmail, sendInvoiceSignedNotifications } from "../services/invoiceEmail.js";
import { sendHeadlessInvoice, sendWhatsAppMessage } from "../services/whatsapp.service.js";

const INVOICE_STORAGE_DIR = path.join(process.cwd(), "storage", "invoices");

interface InvoiceItemInput {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  category?: string;
}

interface InvoicePayload {
  invoiceNumber?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientBusiness?: string;
  clientAddress?: string;
  clientGST?: string;
  clientLocation?: string;
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
  items?: InvoiceItemInput[];
  gstRate?: number;
  paymentTerms?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  clientSignature?: string;
  adminSignature?: string;
  proposalNote?: string;
  validUntil?: string;
  bookingId?: string;
  clientPortalVisible?: boolean;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function getWebBase(): string {
  const direct = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || process.env.CLIENT_ORIGIN;
  return (direct || "http://localhost:3000").replace(/\/$/, "");
}

function normalizeItems(items: InvoiceItemInput[] = []): InvoiceItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const description = String(item.description ?? "").trim();
      const quantity = Math.max(1, Math.floor(toNumber(item.quantity, 1)));
      const unitPrice = Math.max(0, toNumber(item.unitPrice, 0));
      const total = Math.max(0, toNumber(item.total, quantity * unitPrice));
      const category = String(item.category ?? "").trim();
      return { description, quantity, unitPrice, total, category };
    })
    .filter((item) => item.description.length > 0);
}

function computeTotals(items: InvoiceItem[], gstRate = 18) {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.total), 0);
  const cleanRate = Math.max(0, gstRate);
  const gstAmount = Number(((subtotal * cleanRate) / 100).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));
  return { subtotal, gstRate: cleanRate, gstAmount, totalAmount };
}

function toInvoiceView(invoice: InvoiceDocument) {
  const portalAccess = buildPortalAccess("invoice", String(invoice._id), getWebBase());

  return {
    id: String(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    clientPhone: invoice.clientPhone,
    clientBusiness: invoice.clientBusiness,
    clientAddress: invoice.clientAddress,
    clientGST: invoice.clientGST,
    clientLocation: invoice.clientLocation,
    currency: invoice.currency,
    currencySymbol: invoice.currencySymbol,
    exchangeRate: invoice.exchangeRate,
    items: invoice.items,
    subtotal: invoice.subtotal,
    gstRate: invoice.gstRate,
    gstAmount: invoice.gstAmount,
    totalAmount: invoice.totalAmount,
    paymentTerms: invoice.paymentTerms,
    bankName: invoice.bankName,
    accountNumber: invoice.accountNumber,
    ifscCode: invoice.ifscCode,
    upiId: invoice.upiId,
    pdfUrl: invoice.pdfUrl,
    emailSentAt: invoice.emailSentAt,
    emailSentTo: invoice.emailSentTo,
    viewedAt: invoice.viewedAt,
    viewCount: invoice.viewCount,
    clientSignature: invoice.clientSignature,
    signedAt: invoice.signedAt,
    adminSignature: invoice.adminSignature,
    proposalNote: invoice.proposalNote,
    validUntil: invoice.validUntil,
    bookingId: invoice.bookingId,
    clientPortalVisible: Boolean(invoice.clientPortalVisible),
    portalLink: portalAccess.portalLink,
    portalTokens: portalAccess.portalTokens,
    updatedAt: invoice.updatedAt
  };
}

function toInvoiceWithItems(invoice: InvoiceDocument): InvoiceWithItems {
  const view = toInvoiceView(invoice);
  return {
    ...view,
    createdAt: view.createdAt ?? new Date(),
    dueDate: view.dueDate ?? new Date(),
    clientAddress: view.clientAddress || "",
    clientGST: view.clientGST || "",
    paymentTerms: view.paymentTerms || "Due within 7 days",
    bankName: view.bankName || "",
    accountNumber: view.accountNumber || "",
    ifscCode: view.ifscCode || "",
    upiId: view.upiId || "",
    pdfUrl: view.pdfUrl || "",
    emailSentTo: view.emailSentTo || "",
    proposalNote: view.proposalNote || "",
    bookingId: view.bookingId || "",
    items: view.items ?? []
  };
}

async function ensureStorageDir() {
  await fs.mkdir(INVOICE_STORAGE_DIR, { recursive: true });
}

async function savePdf(invoiceId: string, pdfBuffer: Buffer): Promise<string> {
  await ensureStorageDir();
  const fileName = `${invoiceId}.pdf`;
  const filePath = path.join(INVOICE_STORAGE_DIR, fileName);
  await fs.writeFile(filePath, pdfBuffer);
  return `/api/invoices/${invoiceId}/pdf`;
}

function buildDefaultPaymentFields(payload: InvoicePayload) {
  return {
    bankName: String(payload.bankName ?? process.env.ZERO_BANK_NAME ?? "HDFC Bank").trim(),
    accountNumber: String(payload.accountNumber ?? process.env.ZERO_ACCOUNT_NUMBER ?? "").trim(),
    ifscCode: String(payload.ifscCode ?? process.env.ZERO_IFSC_CODE ?? "").trim(),
    upiId: String(payload.upiId ?? process.env.ZERO_UPI_ID ?? "zerohub01@upi").trim()
  };
}

export async function listInvoices(_req: Request, res: Response) {
  try {
    const invoices = await InvoiceModel.find().sort({ createdAt: -1 }).limit(500);
    return res.json(invoices.map((invoice) => toInvoiceView(invoice)));
  } catch (error) {
    console.error("List invoices failed:", error);
    return res.status(500).json({ message: "Failed to load invoices" });
  }
}

export async function createInvoice(req: Request, res: Response) {
  try {
    const payload = (req.body ?? {}) as InvoicePayload;

    const clientName = String(payload.clientName ?? "").trim();
    const clientEmail = String(payload.clientEmail ?? "").trim().toLowerCase();
    const clientPhone = String(payload.clientPhone ?? "").trim();
    const clientBusiness = String(payload.clientBusiness ?? "").trim();
    const clientLocation = String(payload.clientLocation ?? "IN").trim() || "IN";

    if (!clientName || !clientEmail || !clientPhone || !clientBusiness) {
      return res.status(422).json({ message: "clientName, clientEmail, clientPhone, and clientBusiness are required." });
    }

    const detected = await detectCurrency(clientEmail, clientLocation);
    const items = normalizeItems(payload.items);
    const gstRate = toNumber(payload.gstRate, detected.gstRate);
    const totals = computeTotals(items, gstRate);

    const invoiceNumber = String(payload.invoiceNumber ?? "").trim() || (await generateInvoiceNumber(InvoiceModel));

    const dueDate = payload.dueDate ? new Date(payload.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;

    const paymentDefaults = buildDefaultPaymentFields(payload);

    const invoice = await InvoiceModel.create({
      invoiceNumber,
      dueDate,
      status: payload.status ?? "DRAFT",
      clientName,
      clientEmail,
      clientPhone,
      clientBusiness,
      clientAddress: String(payload.clientAddress ?? "").trim(),
      clientGST: String(payload.clientGST ?? "").trim(),
      clientLocation,
      currency: String(payload.currency ?? detected.currency).trim(),
      currencySymbol: String(payload.currencySymbol ?? detected.symbol).trim(),
      exchangeRate: toNumber(payload.exchangeRate, 1),
      items,
      subtotal: totals.subtotal,
      gstRate: totals.gstRate,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      paymentTerms: String(payload.paymentTerms ?? "Due within 7 days").trim(),
      bankName: paymentDefaults.bankName,
      accountNumber: paymentDefaults.accountNumber,
      ifscCode: paymentDefaults.ifscCode,
      upiId: paymentDefaults.upiId,
      clientSignature: String(payload.clientSignature ?? "").trim(),
      adminSignature: String(payload.adminSignature ?? "").trim(),
      proposalNote: String(payload.proposalNote ?? "").trim(),
      validUntil,
      bookingId: String(payload.bookingId ?? "").trim(),
      clientPortalVisible: Boolean(payload.clientPortalVisible)
    });

    return res.status(201).json(toInvoiceView(invoice));
  } catch (error) {
    console.error("Create invoice failed:", error);
    return res.status(500).json({ message: "Failed to create invoice" });
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.json(toInvoiceView(invoice));
  } catch (error) {
    console.error("Get invoice failed:", error);
    return res.status(500).json({ message: "Failed to load invoice" });
  }
}

export async function updateInvoice(req: Request, res: Response) {
  try {
    const payload = (req.body ?? {}) as InvoicePayload;
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (payload.clientName !== undefined) invoice.clientName = String(payload.clientName).trim();
    if (payload.clientEmail !== undefined) invoice.clientEmail = String(payload.clientEmail).trim().toLowerCase();
    if (payload.clientPhone !== undefined) invoice.clientPhone = String(payload.clientPhone).trim();
    if (payload.clientBusiness !== undefined) invoice.clientBusiness = String(payload.clientBusiness).trim();
    if (payload.clientAddress !== undefined) invoice.clientAddress = String(payload.clientAddress).trim();
    if (payload.clientGST !== undefined) invoice.clientGST = String(payload.clientGST).trim();
    if (payload.clientLocation !== undefined) invoice.clientLocation = String(payload.clientLocation).trim();
    if (payload.status !== undefined) invoice.status = payload.status;
    if (payload.dueDate !== undefined) invoice.dueDate = new Date(payload.dueDate);
    if (payload.validUntil !== undefined) invoice.validUntil = payload.validUntil ? new Date(payload.validUntil) : undefined;
    if (payload.paymentTerms !== undefined) invoice.paymentTerms = String(payload.paymentTerms).trim();
    if (payload.proposalNote !== undefined) invoice.proposalNote = String(payload.proposalNote).trim();
    if (payload.bookingId !== undefined) invoice.bookingId = String(payload.bookingId).trim();
    if (payload.clientPortalVisible !== undefined) invoice.clientPortalVisible = Boolean(payload.clientPortalVisible);
    if (payload.clientSignature !== undefined) invoice.clientSignature = String(payload.clientSignature).trim();
    if (payload.adminSignature !== undefined) invoice.adminSignature = String(payload.adminSignature).trim();

    if (payload.currency !== undefined) invoice.currency = String(payload.currency).trim();
    if (payload.currencySymbol !== undefined) invoice.currencySymbol = String(payload.currencySymbol).trim();
    if (payload.exchangeRate !== undefined) invoice.exchangeRate = toNumber(payload.exchangeRate, invoice.exchangeRate);

    const paymentDefaults = buildDefaultPaymentFields(payload);
    if (payload.bankName !== undefined) invoice.bankName = paymentDefaults.bankName;
    if (payload.accountNumber !== undefined) invoice.accountNumber = paymentDefaults.accountNumber;
    if (payload.ifscCode !== undefined) invoice.ifscCode = paymentDefaults.ifscCode;
    if (payload.upiId !== undefined) invoice.upiId = paymentDefaults.upiId;

    if (payload.items !== undefined || payload.gstRate !== undefined) {
      if (payload.items !== undefined) {
        invoice.items = normalizeItems(payload.items);
      }
      const totals = computeTotals(invoice.items, toNumber(payload.gstRate, invoice.gstRate));
      invoice.subtotal = totals.subtotal;
      invoice.gstRate = totals.gstRate;
      invoice.gstAmount = totals.gstAmount;
      invoice.totalAmount = totals.totalAmount;
    }

    await invoice.save();
    return res.json(toInvoiceView(invoice));
  } catch (error) {
    console.error("Update invoice failed:", error);
    return res.status(500).json({ message: "Failed to update invoice" });
  }
}

export async function deleteInvoice(req: Request, res: Response) {
  try {
    const invoice = await InvoiceModel.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    try {
      await fs.unlink(path.join(INVOICE_STORAGE_DIR, `${String(invoice._id)}.pdf`));
    } catch {
      // ignore missing file
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Delete invoice failed:", error);
    return res.status(500).json({ message: "Failed to delete invoice" });
  }
}

export async function sendInvoice(req: Request, res: Response) {
  try {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.clientPortalVisible = true;
    invoice.status = "SENT";
    invoice.emailSentAt = new Date();
    invoice.emailSentTo = invoice.clientEmail;
    await invoice.save();

    const warnings: string[] = [];
    let pdfGenerated = false;
    let emailSent = false;
    let whatsappSent = false;
    let pdfBuffer: Buffer | undefined;

    try {
      pdfBuffer = await generateInvoicePDF(toInvoiceWithItems(invoice));
      const pdfUrl = await savePdf(String(invoice._id), pdfBuffer);

      invoice.pdfUrl = pdfUrl;
      await invoice.save();
      pdfGenerated = true;
    } catch (pdfError) {
      warnings.push("pdf_generation_failed");
      console.error("Send invoice PDF generation failed:", pdfError);
    }

    const portalAccess = buildPortalAccess("invoice", String(invoice._id), getWebBase());

    try {
      emailSent = await sendInvoiceEmail(toInvoiceWithItems(invoice), pdfBuffer, portalAccess.portalLink);
      if (!emailSent) {
        warnings.push("email_not_configured");
      }
    } catch (emailError) {
      warnings.push("email_send_failed");
      console.error("Send invoice email failed:", emailError);
    }

    if (text(invoice.clientPhone)) {
      try {
        await sendHeadlessInvoice(invoice.clientPhone, {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          totalAmount: Number(invoice.totalAmount || 0),
          currencySymbol: invoice.currencySymbol,
          dueDate: invoice.dueDate,
          portalLink: portalAccess.portalLink
        });
        whatsappSent = true;
      } catch (whatsappError) {
        warnings.push("whatsapp_send_failed");
        console.error("Send invoice WhatsApp failed:", whatsappError);
      }
    } else {
      warnings.push("whatsapp_phone_missing");
    }

    return res.json({
      success: true,
      code: warnings.length > 0 ? "invoice_sent_with_warnings" : "invoice_sent",
      warnings,
      pdfGenerated,
      emailSent,
      whatsappSent,
      pdfUrl: invoice.pdfUrl || null,
      portalLink: portalAccess.portalLink,
      status: invoice.status,
      message: emailSent || whatsappSent
        ? `Invoice sent to ${invoice.clientEmail}`
        : "Invoice marked as sent. Email and WhatsApp delivery failed."
    });
  } catch (error) {
    console.error("Send invoice failed:", error);
    return res.status(500).json({
      code: "invoice_send_failed",
      message: "Failed to send invoice"
    });
  }
}

export async function signInvoice(req: Request, res: Response) {
  try {
    const signature = String(req.body?.signature ?? "").trim();
    if (!signature) {
      return res.status(422).json({ message: "Signature is required" });
    }

    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.clientSignature = signature;
    invoice.signedAt = new Date();
    invoice.status = "SIGNED";
    await invoice.save();

    const warnings: string[] = [];
    let notificationsSent = false;

    try {
      notificationsSent = await sendInvoiceSignedNotifications(toInvoiceWithItems(invoice));
      if (!notificationsSent) {
        warnings.push("notification_email_not_configured");
      }
    } catch (notificationError) {
      warnings.push("notification_email_failed");
      console.error("Sign invoice notification email failed:", notificationError);
    }

    let adminWhatsappSent = false;
    const adminPhone = text(process.env.ADMIN_NOTIFY_WHATSAPP || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "");
    if (adminPhone) {
      try {
        const webBase = (process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
        const adminMessage =
          `Invoice signed: ${invoice.invoiceNumber}\n` +
          `Client: ${invoice.clientName}\n` +
          `Amount: ${invoice.currencySymbol}${Number(invoice.totalAmount || 0).toLocaleString("en-IN")}\n` +
          `Signed at: ${new Date(invoice.signedAt || new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n` +
          `View: ${webBase}/zero-control/invoices/${String(invoice._id)}/view`;

        await sendWhatsAppMessage({
          phone: adminPhone,
          message: adminMessage,
          allowTemplateFallback: true
        });
        adminWhatsappSent = true;
      } catch (whatsappError) {
        warnings.push("notification_whatsapp_failed");
        console.error("Sign invoice admin WhatsApp failed:", whatsappError);
      }
    } else {
      warnings.push("notification_whatsapp_phone_missing");
    }

    return res.json({
      success: true,
      code: warnings.length > 0 ? "invoice_signed_with_warnings" : "invoice_signed",
      warnings,
      notificationsSent,
      adminWhatsappSent,
      signedAt: invoice.signedAt,
      status: invoice.status,
      message: "Invoice signed successfully"
    });
  } catch (error) {
    console.error("Sign invoice failed:", error);
    return res.status(500).json({
      code: "invoice_sign_failed",
      message: "Failed to sign invoice"
    });
  }
}

export async function downloadInvoicePdf(req: Request, res: Response) {
  try {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const filePath = path.join(INVOICE_STORAGE_DIR, `${req.params.id}.pdf`);
    try {
      const file = await fs.readFile(filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=\"${invoice.invoiceNumber}.pdf\"`);
      return res.send(file);
    } catch {
      try {
        const pdfBuffer = await generateInvoicePDF(toInvoiceWithItems(invoice));
        try {
          await savePdf(String(invoice._id), pdfBuffer);
        } catch (saveError) {
          console.warn("Download invoice PDF cache save failed, returning generated PDF directly:", saveError);
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=\"${invoice.invoiceNumber}.pdf\"`);
        return res.send(pdfBuffer);
      } catch (generateError) {
        console.error("Download invoice PDF regeneration failed:", generateError);
        return res.status(503).json({
          code: "pdf_unavailable",
          message: "Invoice PDF is temporarily unavailable. Please try again shortly."
        });
      }
    }
  } catch (error) {
    console.error("Download invoice PDF failed:", error);
    return res.status(500).json({ message: "Failed to download invoice PDF" });
  }
}

export async function getPublicInvoiceView(req: Request, res: Response) {
  try {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (!invoice.clientPortalVisible) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    invoice.viewCount = (invoice.viewCount || 0) + 1;
    invoice.viewedAt = new Date();

    if (invoice.status === "SENT") {
      invoice.status = "VIEWED";
    }

    await invoice.save();

    return res.json(toInvoiceView(invoice));
  } catch (error) {
    console.error("Public invoice view failed:", error);
    return res.status(500).json({ message: "Failed to load invoice" });
  }
}

export async function invoiceDashboardStats(_req: Request, res: Response) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalInvoices, totalRevenueRows, pendingRows, paidThisMonthRows, awaitingSignatureRows] = await Promise.all([
      InvoiceModel.countDocuments(),
      InvoiceModel.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      InvoiceModel.aggregate([
        { $match: { status: { $in: ["DRAFT", "SENT", "VIEWED", "SIGNED", "OVERDUE"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ]),
      InvoiceModel.aggregate([
        { $match: { status: "PAID", updatedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ]),
      InvoiceModel.countDocuments({ status: { $in: ["SENT", "VIEWED"] } })
    ]);

    const totalRevenue = totalRevenueRows[0]?.total ?? 0;
    const pendingAmount = pendingRows[0]?.total ?? 0;
    const pendingCount = pendingRows[0]?.count ?? 0;
    const paidThisMonth = paidThisMonthRows[0]?.total ?? 0;

    return res.json({
      totalInvoices,
      totalRevenue,
      pendingAmount,
      pendingCount,
      paidThisMonth,
      awaitingSignature: awaitingSignatureRows
    });
  } catch (error) {
    console.error("Invoice stats failed:", error);
    return res.status(500).json({ message: "Failed to load invoice stats" });
  }
}

export function getInvoiceStorageDir() {
  return INVOICE_STORAGE_DIR;
}
