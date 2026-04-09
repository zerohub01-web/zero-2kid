import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import { AdminSettingsModel, ContractModel, type ContractDocument, type ContractStatus } from "../db/schema.js";
import { BookingModel } from "../models/Booking.js";
import { generateContractNumber } from "../utils/contractNumber.js";
import { generateContractPDF, type ContractForPdf } from "../utils/generateContractPDF.js";
import { buildPortalAccess } from "../utils/portalToken.js";
import { sendContractEmail, sendContractSignedNotifications } from "../services/contractEmail.js";
import { sendWhatsAppMessage } from "../services/whatsapp.service.js";
import { buildContractWhatsApp } from "../utils/whatsappMessages.js";

const CONTRACT_STORAGE_DIR = path.join(process.cwd(), "storage", "contracts");

interface ContractPayload {
  contractNumber?: string;
  effectiveDate?: string;
  status?: ContractStatus;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientBusiness?: string;
  clientAddress?: string;
  clientCity?: string;
  clientCountry?: string;
  bookingId?: string;
  invoiceId?: string;
  serviceType?: string;
  projectScope?: string;
  advanceAmount?: number;
  totalAmount?: number;
  currency?: string;
  currencySymbol?: string;
  adminSignature?: string;
  customClause?: string;
  paymentTerms?: string;
  projectTimeline?: string;
  clientPortalVisible?: boolean;
}

interface SettingsPayload {
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  gstNumber?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  adminSignature?: string;
}

function getRequestIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return req.ip || req.socket.remoteAddress || "";
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function parseBudgetLikeValue(value: unknown): number {
  if (typeof value === "number") return numberOrZero(value);
  const raw = text(value);
  if (!raw) return 0;
  const matches = raw.match(/[\d,]+/g);
  if (!matches || matches.length === 0) return 0;
  const numbers = matches
    .map((entry) => Number(entry.replace(/,/g, "")))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}

async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(CONTRACT_STORAGE_DIR, { recursive: true });
}

async function savePdf(contractId: string, pdfBuffer: Buffer): Promise<string> {
  await ensureStorageDir();
  const filePath = path.join(CONTRACT_STORAGE_DIR, `${contractId}.pdf`);
  await fs.writeFile(filePath, pdfBuffer);
  return `/api/contracts/${contractId}/pdf`;
}

function toContractView(contract: ContractDocument) {
  const portalAccess = buildPortalAccess("contract", String(contract._id), getWebBase());

  return {
    id: String(contract._id),
    contractNumber: contract.contractNumber,
    createdAt: contract.createdAt,
    effectiveDate: contract.effectiveDate,
    status: contract.status,
    clientName: contract.clientName,
    clientEmail: contract.clientEmail,
    clientPhone: contract.clientPhone,
    clientBusiness: contract.clientBusiness,
    clientAddress: contract.clientAddress,
    clientCity: contract.clientCity,
    clientCountry: contract.clientCountry,
    bookingId: contract.bookingId,
    invoiceId: contract.invoiceId,
    serviceType: contract.serviceType,
    projectScope: contract.projectScope,
    advanceAmount: contract.advanceAmount,
    totalAmount: contract.totalAmount,
    currency: contract.currency,
    currencySymbol: contract.currencySymbol,
    pdfUrl: contract.pdfUrl,
    emailSentAt: contract.emailSentAt,
    viewedAt: contract.viewedAt,
    viewCount: contract.viewCount,
    clientSignature: contract.clientSignature,
    clientSignedAt: contract.clientSignedAt,
    clientSignedIP: contract.clientSignedIP,
    adminSignature: contract.adminSignature,
    adminSignedAt: contract.adminSignedAt,
    customClause: contract.customClause,
    paymentTerms: contract.paymentTerms,
    projectTimeline: contract.projectTimeline,
    clientPortalVisible: Boolean(contract.clientPortalVisible),
    portalLink: portalAccess.portalLink,
    portalTokens: portalAccess.portalTokens,
    updatedAt: contract.updatedAt
  };
}

function toContractForPdf(contract: ContractDocument): ContractForPdf {
  const view = toContractView(contract);
  return {
    ...view,
    id: view.id,
    createdAt: view.createdAt ?? new Date(),
    effectiveDate: view.effectiveDate ?? new Date(),
    status: view.status,
    clientName: view.clientName || "",
    clientEmail: view.clientEmail || "",
    clientPhone: view.clientPhone || "",
    clientBusiness: view.clientBusiness || "",
    clientAddress: view.clientAddress || "",
    clientCity: view.clientCity || "",
    clientCountry: view.clientCountry || "",
    bookingId: view.bookingId || "",
    invoiceId: view.invoiceId || "",
    serviceType: view.serviceType || "Custom Website + Automation",
    projectScope: view.projectScope || "",
    advanceAmount: Number(view.advanceAmount || 0),
    totalAmount: Number(view.totalAmount || 0),
    currency: view.currency || "INR",
    currencySymbol: view.currencySymbol || "\u20B9",
    pdfUrl: view.pdfUrl || "",
    emailSentAt: view.emailSentAt,
    viewedAt: view.viewedAt,
    viewCount: Number(view.viewCount || 0),
    clientSignature: view.clientSignature || "",
    clientSignedAt: view.clientSignedAt,
    clientSignedIP: view.clientSignedIP || "",
    adminSignature: view.adminSignature || "",
    adminSignedAt: view.adminSignedAt ?? new Date(),
    customClause: view.customClause || "",
    paymentTerms: view.paymentTerms || "50% advance, 50% on delivery",
    projectTimeline: view.projectTimeline || "4-6 weeks"
  };
}

async function getAdminSettings() {
  let settings = await AdminSettingsModel.findOne({ key: "default" });
  if (!settings) {
    settings = await AdminSettingsModel.create({
      key: "default",
      companyName: "ZERO OPS",
      companyPhone: "97469 27368",
      companyEmail: "Zerohub01@gmail.com",
      companyAddress: "Bangalore, Karnataka",
      gstNumber: process.env.ZERO_GST_NUMBER ?? "",
      upiId: process.env.ZERO_UPI_ID ?? "zerohub01@upi",
      bankName: process.env.ZERO_BANK_NAME ?? "HDFC Bank",
      accountNumber: process.env.ZERO_ACCOUNT_NUMBER ?? "",
      ifscCode: process.env.ZERO_IFSC_CODE ?? "",
      adminSignature: ""
    });
  }
  return settings;
}

function applyPayload(contract: ContractDocument, payload: ContractPayload): void {
  if (payload.contractNumber !== undefined) contract.contractNumber = text(payload.contractNumber);
  if (payload.effectiveDate !== undefined) contract.effectiveDate = new Date(payload.effectiveDate);
  if (payload.status !== undefined) contract.status = payload.status;
  if (payload.clientName !== undefined) contract.clientName = text(payload.clientName);
  if (payload.clientEmail !== undefined) contract.clientEmail = text(payload.clientEmail).toLowerCase();
  if (payload.clientPhone !== undefined) contract.clientPhone = text(payload.clientPhone);
  if (payload.clientBusiness !== undefined) contract.clientBusiness = text(payload.clientBusiness);
  if (payload.clientAddress !== undefined) contract.clientAddress = text(payload.clientAddress);
  if (payload.clientCity !== undefined) contract.clientCity = text(payload.clientCity);
  if (payload.clientCountry !== undefined) contract.clientCountry = text(payload.clientCountry);
  if (payload.bookingId !== undefined) contract.bookingId = text(payload.bookingId);
  if (payload.invoiceId !== undefined) contract.invoiceId = text(payload.invoiceId);
  if (payload.serviceType !== undefined) contract.serviceType = text(payload.serviceType);
  if (payload.projectScope !== undefined) contract.projectScope = text(payload.projectScope);
  if (payload.advanceAmount !== undefined) contract.advanceAmount = numberOrZero(payload.advanceAmount);
  if (payload.totalAmount !== undefined) contract.totalAmount = numberOrZero(payload.totalAmount);
  if (payload.currency !== undefined) contract.currency = text(payload.currency) || "INR";
  if (payload.currencySymbol !== undefined) contract.currencySymbol = text(payload.currencySymbol) || "\u20B9";
  if (payload.adminSignature !== undefined) contract.adminSignature = text(payload.adminSignature);
  if (payload.customClause !== undefined) contract.customClause = text(payload.customClause);
  if (payload.paymentTerms !== undefined) contract.paymentTerms = text(payload.paymentTerms);
  if (payload.projectTimeline !== undefined) contract.projectTimeline = text(payload.projectTimeline);
  if (payload.clientPortalVisible !== undefined) contract.clientPortalVisible = Boolean(payload.clientPortalVisible);
}

function hasRequiredContractFields(payload: ContractPayload): boolean {
  return Boolean(
    text(payload.clientName) &&
      text(payload.clientEmail) &&
      text(payload.clientPhone) &&
      text(payload.clientBusiness) &&
      text(payload.clientAddress) &&
      text(payload.serviceType)
  );
}

function buildAdminReminderText(contract: ContractDocument): string {
  const linkBase = (process.env.NEXT_PUBLIC_WEB_URL ?? process.env.WEB_URL ?? envClientFallback()).replace(/\/$/, "");
  return [
    "Contract signed confirmation",
    "--------------------------------",
    `Contract: ${contract.contractNumber}`,
    `Client: ${contract.clientName}`,
    `Signed At: ${new Date(contract.clientSignedAt || new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    `Portal Link: ${linkBase}/portal/contract/${String(contract._id)}`,
    "--------------------------------"
  ].join("\n");
}

function envClientFallback(): string {
  return process.env.CLIENT_ORIGIN || "http://localhost:3000";
}

function getWebBase(): string {
  return (process.env.NEXT_PUBLIC_WEB_URL ?? process.env.WEB_URL ?? envClientFallback()).replace(/\/$/, "");
}

async function sendAdminSignedWhatsApp(contract: ContractDocument): Promise<boolean> {
  const adminPhone = text(process.env.ADMIN_NOTIFY_WHATSAPP || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "");
  if (!adminPhone) {
    return false;
  }

  await sendWhatsAppMessage({
    phone: adminPhone,
    message: buildAdminReminderText(contract),
    allowTemplateFallback: true
  });
  return true;
}

export async function listContracts(req: Request, res: Response) {
  try {
    const search = text(req.query.search);
    const status = text(req.query.status);

    const query: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { contractNumber: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { clientEmail: { $regex: search, $options: "i" } }
      ];
    }

    const contracts = await ContractModel.find(query).sort({ createdAt: -1 }).limit(500);
    return res.json(contracts.map((contract) => toContractView(contract)));
  } catch (error) {
    console.error("List contracts failed:", error);
    return res.status(500).json({ message: "Failed to load contracts" });
  }
}

export async function contractDashboardStats(_req: Request, res: Response) {
  try {
    const [totalContracts, draftCount, signedCount, pendingSignatureCount] = await Promise.all([
      ContractModel.countDocuments(),
      ContractModel.countDocuments({ status: "DRAFT" }),
      ContractModel.countDocuments({ status: "SIGNED" }),
      ContractModel.countDocuments({ status: { $in: ["SENT", "VIEWED"] } })
    ]);

    return res.json({
      totalContracts,
      pendingSignatureCount,
      signedCount,
      draftCount
    });
  } catch (error) {
    console.error("Contract stats failed:", error);
    return res.status(500).json({ message: "Failed to load contract stats" });
  }
}

export async function createContract(req: Request, res: Response) {
  try {
    const payload = (req.body ?? {}) as ContractPayload;
    if (!hasRequiredContractFields(payload)) {
      return res.status(422).json({
        message: "clientName, clientEmail, clientPhone, clientBusiness, clientAddress, and serviceType are required."
      });
    }

    const settings = await getAdminSettings();
    const signature = text(payload.adminSignature) || text(settings.adminSignature);

    if (!signature) {
      return res.status(422).json({ message: "Admin signature is required before creating contracts." });
    }

    const contractNumber = text(payload.contractNumber) || (await generateContractNumber(ContractModel));

    const contract = await ContractModel.create({
      contractNumber,
      effectiveDate: payload.effectiveDate ? new Date(payload.effectiveDate) : new Date(),
      status: payload.status ?? "DRAFT",
      clientName: text(payload.clientName),
      clientEmail: text(payload.clientEmail).toLowerCase(),
      clientPhone: text(payload.clientPhone),
      clientBusiness: text(payload.clientBusiness),
      clientAddress: text(payload.clientAddress),
      clientCity: text(payload.clientCity),
      clientCountry: text(payload.clientCountry),
      bookingId: text(payload.bookingId),
      invoiceId: text(payload.invoiceId),
      serviceType: text(payload.serviceType),
      projectScope: text(payload.projectScope),
      advanceAmount: numberOrZero(payload.advanceAmount),
      totalAmount: numberOrZero(payload.totalAmount),
      currency: text(payload.currency) || "INR",
      currencySymbol: text(payload.currencySymbol) || "\u20B9",
      adminSignature: signature,
      adminSignedAt: new Date(),
      customClause: text(payload.customClause),
      paymentTerms: text(payload.paymentTerms) || "50% advance, 50% on delivery",
      projectTimeline: text(payload.projectTimeline) || "4-6 weeks",
      clientPortalVisible: Boolean(payload.clientPortalVisible)
    });

    return res.status(201).json(toContractView(contract));
  } catch (error) {
    console.error("Create contract failed:", error);
    return res.status(500).json({ message: "Failed to create contract" });
  }
}

export async function createContractFromBooking(req: Request, res: Response) {
  try {
    const bookingId = text(req.params.bookingId);
    if (!bookingId) {
      return res.status(422).json({ message: "bookingId is required" });
    }

    const booking = mongoose.isValidObjectId(bookingId)
      ? await BookingModel.findById(bookingId)
      : await BookingModel.findOne({ bookingId: bookingId.toUpperCase() });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const settings = await getAdminSettings();
    const signature = text(settings.adminSignature);
    if (!signature) {
      return res.status(422).json({ message: "Admin signature is required before creating contracts." });
    }

    const contractNumber = await generateContractNumber(ContractModel);

    const contract = await ContractModel.create({
      contractNumber,
      effectiveDate: new Date(),
      status: "DRAFT",
      clientName: booking.name,
      clientEmail: booking.email,
      clientPhone: booking.phone,
      clientBusiness: booking.businessType || "Client Business",
      clientAddress: "Address to be provided by client",
      clientCity: "",
      clientCountry: "",
      bookingId: String(booking._id),
      serviceType: booking.service || "Custom Website + Automation",
      projectScope: booking.message || "",
      advanceAmount: parseBudgetLikeValue(booking.budget),
      totalAmount: parseBudgetLikeValue(booking.servicePriceSnapshot || booking.budget),
      currency: "INR",
      currencySymbol: "\u20B9",
      adminSignature: signature,
      adminSignedAt: new Date(),
      customClause: "",
      paymentTerms: "50% advance, 50% on delivery",
      projectTimeline: "4-6 weeks",
      clientPortalVisible: false
    });

    return res.status(201).json(toContractView(contract));
  } catch (error) {
    console.error("Create contract from booking failed:", error);
    return res.status(500).json({ message: "Failed to create contract from booking" });
  }
}

export async function getContract(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    return res.json(toContractView(contract));
  } catch (error) {
    console.error("Get contract failed:", error);
    return res.status(500).json({ message: "Failed to load contract" });
  }
}

export async function updateContract(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const payload = (req.body ?? {}) as ContractPayload;
    applyPayload(contract, payload);

    if (!contract.clientName || !contract.clientEmail || !contract.clientPhone || !contract.clientBusiness || !contract.clientAddress || !contract.serviceType) {
      return res.status(422).json({
        message: "clientName, clientEmail, clientPhone, clientBusiness, clientAddress, and serviceType are required."
      });
    }

    if (!contract.adminSignature) {
      const settings = await getAdminSettings();
      contract.adminSignature = text(settings.adminSignature);
    }

    if (!contract.adminSignature) {
      return res.status(422).json({ message: "Admin signature is required before saving contract." });
    }

    await contract.save();
    return res.json(toContractView(contract));
  } catch (error) {
    console.error("Update contract failed:", error);
    return res.status(500).json({ message: "Failed to update contract" });
  }
}

export async function deleteContract(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findByIdAndDelete(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    try {
      await fs.unlink(path.join(CONTRACT_STORAGE_DIR, `${String(contract._id)}.pdf`));
    } catch {
      // ignore missing file
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Delete contract failed:", error);
    return res.status(500).json({ message: "Failed to delete contract" });
  }
}

export async function sendContract(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (!contract.adminSignature) {
      return res.status(422).json({ message: "Admin signature is required before sending contract." });
    }

    contract.clientPortalVisible = true;
    contract.status = "SENT";
    contract.emailSentAt = new Date();
    await contract.save();

    const warnings: string[] = [];
    let pdfGenerated = false;
    let emailSent = false;
    let whatsappSent = false;
    let pdfBuffer: Buffer | undefined;

    try {
      pdfBuffer = await generateContractPDF(toContractForPdf(contract));
      const pdfUrl = await savePdf(String(contract._id), pdfBuffer);
      contract.pdfUrl = pdfUrl;
      await contract.save();
      pdfGenerated = true;
    } catch (pdfError) {
      warnings.push("pdf_generation_failed");
      console.error("Send contract PDF generation failed:", pdfError);
    }

    const portalAccess = buildPortalAccess("contract", String(contract._id), getWebBase());

    try {
      emailSent = await sendContractEmail(toContractForPdf(contract), pdfBuffer, portalAccess.portalLink);
      if (!emailSent) {
        warnings.push("email_not_configured");
      }
    } catch (emailError) {
      warnings.push("email_send_failed");
      console.error("Send contract email failed:", emailError);
    }

    const whatsappText = buildContractWhatsApp({
      id: String(contract._id),
      clientName: contract.clientName,
      contractNumber: contract.contractNumber,
      serviceType: contract.serviceType,
      effectiveDate: contract.effectiveDate,
      advanceAmount: Number(contract.advanceAmount || 0),
      currencySymbol: contract.currencySymbol,
      portalLink: portalAccess.portalLink
    });
    if (text(contract.clientPhone)) {
      try {
        await sendWhatsAppMessage({
          phone: contract.clientPhone,
          message: whatsappText,
          allowTemplateFallback: true
        });
        whatsappSent = true;
      } catch (whatsappError) {
        warnings.push("whatsapp_send_failed");
        console.error("Send contract WhatsApp failed:", whatsappError);
      }
    } else {
      warnings.push("whatsapp_phone_missing");
    }

    return res.json({
      success: true,
      code: warnings.length > 0 ? "contract_sent_with_warnings" : "contract_sent",
      warnings,
      pdfGenerated,
      emailSent,
      whatsappSent,
      pdfUrl: contract.pdfUrl || null,
      portalLink: portalAccess.portalLink,
      status: contract.status,
      message: emailSent || whatsappSent
        ? `Contract sent to ${contract.clientEmail}`
        : "Contract marked as sent. Email and WhatsApp delivery failed."
    });
  } catch (error) {
    console.error("Send contract failed:", error);
    return res.status(500).json({
      code: "contract_send_failed",
      message: "Failed to send contract"
    });
  }
}

export async function signContract(req: Request, res: Response) {
  try {
    const signature = text(req.body?.signature);
    if (!signature) {
      return res.status(422).json({ message: "Signature is required" });
    }

    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    contract.clientSignature = signature;
    contract.clientSignedAt = req.body?.agreedAt ? new Date(req.body.agreedAt) : new Date();
    contract.clientSignedIP = getRequestIp(req);
    contract.status = "SIGNED";
    await contract.save();

    const warnings: string[] = [];
    let pdfGenerated = false;
    let notificationsSent = false;
    let pdfBuffer: Buffer | undefined;

    try {
      pdfBuffer = await generateContractPDF(toContractForPdf(contract));
      const pdfUrl = await savePdf(String(contract._id), pdfBuffer);
      contract.pdfUrl = pdfUrl;
      await contract.save();
      pdfGenerated = true;
    } catch (pdfError) {
      warnings.push("pdf_generation_failed");
      console.error("Sign contract PDF generation failed:", pdfError);
    }

    try {
      notificationsSent = await sendContractSignedNotifications(toContractForPdf(contract), pdfBuffer);
      if (!notificationsSent) {
        warnings.push("notification_email_not_configured");
      }
    } catch (notificationError) {
      warnings.push("notification_email_failed");
      console.error("Sign contract notification email failed:", notificationError);
    }

    let adminWhatsAppSent = false;
    try {
      adminWhatsAppSent = await sendAdminSignedWhatsApp(contract);
      if (!adminWhatsAppSent) {
        warnings.push("notification_whatsapp_phone_missing");
      }
    } catch (whatsAppError) {
      warnings.push("notification_whatsapp_failed");
      console.error("Sign contract admin WhatsApp failed:", whatsAppError);
    }

    return res.json({
      success: true,
      code: warnings.length > 0 ? "contract_signed_with_warnings" : "contract_signed",
      warnings,
      pdfGenerated,
      notificationsSent,
      adminWhatsAppSent,
      signedAt: contract.clientSignedAt,
      status: contract.status,
      pdfUrl: contract.pdfUrl || null,
      message: "Contract signed successfully"
    });
  } catch (error) {
    console.error("Sign contract failed:", error);
    return res.status(500).json({
      code: "contract_sign_failed",
      message: "Failed to sign contract"
    });
  }
}

export async function downloadContractPdf(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const filePath = path.join(CONTRACT_STORAGE_DIR, `${req.params.id}.pdf`);
    try {
      const file = await fs.readFile(filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=\"${contract.contractNumber}.pdf\"`);
      return res.send(file);
    } catch {
      try {
        const pdfBuffer = await generateContractPDF(toContractForPdf(contract));
        try {
          await savePdf(String(contract._id), pdfBuffer);
        } catch (saveError) {
          console.warn("Download contract PDF cache save failed, returning generated PDF directly:", saveError);
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=\"${contract.contractNumber}.pdf\"`);
        return res.send(pdfBuffer);
      } catch (generateError) {
        console.error("Download contract PDF regeneration failed:", generateError);
        return res.status(503).json({
          code: "pdf_unavailable",
          message: "Contract PDF is temporarily unavailable. Please try again shortly."
        });
      }
    }
  } catch (error) {
    console.error("Download contract PDF failed:", error);
    return res.status(500).json({ message: "Failed to download contract PDF" });
  }
}

export async function getPublicContractView(req: Request, res: Response) {
  try {
    const contract = await ContractModel.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    if (!contract.clientPortalVisible) {
      return res.status(404).json({ message: "Contract not found" });
    }

    contract.viewCount = (contract.viewCount || 0) + 1;
    contract.viewedAt = new Date();
    if (contract.status === "SENT") {
      contract.status = "VIEWED";
    }
    await contract.save();

    return res.json(toContractView(contract));
  } catch (error) {
    console.error("Public contract view failed:", error);
    return res.status(500).json({ message: "Failed to load contract" });
  }
}

export async function getContractSettings(_req: Request, res: Response) {
  try {
    const settings = await getAdminSettings();
    return res.json({
      key: settings.key,
      companyName: settings.companyName,
      companyPhone: settings.companyPhone,
      companyEmail: settings.companyEmail,
      companyAddress: settings.companyAddress,
      gstNumber: settings.gstNumber,
      upiId: settings.upiId,
      bankName: settings.bankName,
      accountNumber: settings.accountNumber,
      ifscCode: settings.ifscCode,
      adminSignature: settings.adminSignature,
      updatedAt: settings.updatedAt,
      createdAt: settings.createdAt
    });
  } catch (error) {
    console.error("Get contract settings failed:", error);
    return res.status(500).json({ message: "Failed to load settings" });
  }
}

export async function updateContractSettings(req: Request, res: Response) {
  try {
    const payload = (req.body ?? {}) as SettingsPayload;
    const settings = await AdminSettingsModel.findOneAndUpdate(
      { key: "default" },
      {
        key: "default",
        ...(payload.companyName !== undefined ? { companyName: text(payload.companyName) } : {}),
        ...(payload.companyPhone !== undefined ? { companyPhone: text(payload.companyPhone) } : {}),
        ...(payload.companyEmail !== undefined ? { companyEmail: text(payload.companyEmail) } : {}),
        ...(payload.companyAddress !== undefined ? { companyAddress: text(payload.companyAddress) } : {}),
        ...(payload.gstNumber !== undefined ? { gstNumber: text(payload.gstNumber) } : {}),
        ...(payload.upiId !== undefined ? { upiId: text(payload.upiId) } : {}),
        ...(payload.bankName !== undefined ? { bankName: text(payload.bankName) } : {}),
        ...(payload.accountNumber !== undefined ? { accountNumber: text(payload.accountNumber) } : {}),
        ...(payload.ifscCode !== undefined ? { ifscCode: text(payload.ifscCode) } : {}),
        ...(payload.adminSignature !== undefined ? { adminSignature: text(payload.adminSignature) } : {})
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      key: settings.key,
      companyName: settings.companyName,
      companyPhone: settings.companyPhone,
      companyEmail: settings.companyEmail,
      companyAddress: settings.companyAddress,
      gstNumber: settings.gstNumber,
      upiId: settings.upiId,
      bankName: settings.bankName,
      accountNumber: settings.accountNumber,
      ifscCode: settings.ifscCode,
      adminSignature: settings.adminSignature,
      updatedAt: settings.updatedAt,
      createdAt: settings.createdAt
    });
  } catch (error) {
    console.error("Update contract settings failed:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
}

export function getContractStorageDir(): string {
  return CONTRACT_STORAGE_DIR;
}
