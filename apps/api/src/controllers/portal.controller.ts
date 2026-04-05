import type { Request, Response } from "express";
import { ContractModel, InvoiceModel } from "../db/schema.js";
import { BookingModel, toCanonicalBookingStatus } from "../models/Booking.js";
import { ProjectModel } from "../models/Project.js";
import { ensureTimelineForBooking } from "./projectTimeline.controller.js";

interface PortalContractView {
  id: string;
  contractNumber: string;
  status: string;
  serviceType: string;
  createdAt: Date;
  effectiveDate: Date;
  clientSignedAt?: Date;
}

interface PortalInvoiceView {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  currencySymbol: string;
  dueDate: Date;
  createdAt: Date;
}

function bookingStatus(status: string): string {
  return toCanonicalBookingStatus(status) ?? "new";
}

function normalizeBookingKey(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEmailKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function resolveBookingMongoId(
  rawBookingKey: string,
  bookingMongoIds: Set<string>,
  bookingMongoIdByPublicId: Map<string, string>
): string | null {
  if (!rawBookingKey) return null;
  if (bookingMongoIds.has(rawBookingKey)) return rawBookingKey;
  return bookingMongoIdByPublicId.get(rawBookingKey) ?? null;
}

function pickContractForBooking(
  bookingId: string,
  contractsByBooking: Map<string, PortalContractView>,
  contractsByEmail: PortalContractView[]
): PortalContractView | null {
  const direct = contractsByBooking.get(bookingId);
  if (direct) return direct;
  return contractsByEmail[0] ?? null;
}

function pickInvoiceForBooking(
  bookingId: string,
  invoicesByBooking: Map<string, PortalInvoiceView>,
  invoicesByEmail: PortalInvoiceView[]
): PortalInvoiceView | null {
  const direct = invoicesByBooking.get(bookingId);
  if (direct) return direct;
  return invoicesByEmail[0] ?? null;
}

export async function getPortalProject(req: Request, res: Response) {
  try {
    if (!req.customer) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const customerEmail = req.customer.email.toLowerCase();
    const bookings = await BookingModel.find({ email: customerEmail }).sort({ createdAt: -1 });
    if (bookings.length === 0) {
      return res.json({ projects: [] });
    }

    const bookingIds = bookings.map((booking) => String(booking._id));
    const bookingMongoIds = new Set(bookingIds);
    const bookingMongoIdByPublicId = new Map<string, string>();
    for (const booking of bookings) {
      const publicBookingId = normalizeBookingKey(booking.bookingId);
      if (publicBookingId) {
        bookingMongoIdByPublicId.set(publicBookingId, String(booking._id));
      }
    }
    const bookingLookupKeys = Array.from(
      new Set([...bookingIds, ...Array.from(bookingMongoIdByPublicId.keys())].filter(Boolean))
    );
    const customerEmailKey = normalizeEmailKey(customerEmail);

    const [projectRows, contracts, invoices] = await Promise.all([
      ProjectModel.find({ leadId: { $in: bookingIds } }),
      ContractModel.find({
        clientPortalVisible: true,
        $or: [{ bookingId: { $in: bookingLookupKeys } }, { clientEmail: customerEmail }]
      })
        .sort({ createdAt: -1 })
        .select("contractNumber status serviceType createdAt effectiveDate clientSignedAt bookingId clientEmail"),
      InvoiceModel.find({
        clientPortalVisible: true,
        $or: [{ bookingId: { $in: bookingLookupKeys } }, { clientEmail: customerEmail }]
      })
        .sort({ createdAt: -1 })
        .select("invoiceNumber status totalAmount currencySymbol dueDate createdAt bookingId clientEmail")
    ]);

    const projectByLead = new Map(projectRows.map((row) => [String(row.leadId), row]));

    const contractsByBooking = new Map<string, PortalContractView>();
    const contractsByEmail: PortalContractView[] = [];
    for (const contract of contracts) {
      const formatted: PortalContractView = {
        id: String(contract._id),
        contractNumber: contract.contractNumber,
        status: contract.status,
        serviceType: contract.serviceType,
        createdAt: contract.createdAt,
        effectiveDate: contract.effectiveDate,
        clientSignedAt: contract.clientSignedAt
      };
      const linkedBooking = normalizeBookingKey(contract.bookingId);
      const resolvedBookingId = resolveBookingMongoId(linkedBooking, bookingMongoIds, bookingMongoIdByPublicId);
      const contractEmailKey = normalizeEmailKey(contract.clientEmail);
      if (resolvedBookingId && !contractsByBooking.has(resolvedBookingId)) {
        contractsByBooking.set(resolvedBookingId, formatted);
      } else if (contractEmailKey === customerEmailKey) {
        contractsByEmail.push(formatted);
      } else {
        // Fallback for legacy data where booking/email linkage can be inconsistent.
        contractsByEmail.push(formatted);
      }
    }

    const invoicesByBooking = new Map<string, PortalInvoiceView>();
    const invoicesByEmail: PortalInvoiceView[] = [];
    for (const invoice of invoices) {
      const formatted: PortalInvoiceView = {
        id: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount || 0),
        currencySymbol: invoice.currencySymbol || "\u20B9",
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt
      };
      const linkedBooking = normalizeBookingKey(invoice.bookingId);
      const resolvedBookingId = resolveBookingMongoId(linkedBooking, bookingMongoIds, bookingMongoIdByPublicId);
      const invoiceEmailKey = normalizeEmailKey(invoice.clientEmail);
      if (resolvedBookingId && !invoicesByBooking.has(resolvedBookingId)) {
        invoicesByBooking.set(resolvedBookingId, formatted);
      } else if (invoiceEmailKey === customerEmailKey) {
        invoicesByEmail.push(formatted);
      } else {
        // Fallback for legacy data where booking/email linkage can be inconsistent.
        invoicesByEmail.push(formatted);
      }
    }

    const projects = await Promise.all(
      bookings.map(async (booking) => {
        const bookingId = String(booking._id);
        const timeline = await ensureTimelineForBooking(bookingId);
        const row = projectByLead.get(bookingId);

        return {
          id: bookingId,
          title: booking.service,
          status: row?.status ?? bookingStatus(booking.status),
          date: booking.date,
          createdAt: booking.createdAt,
          value: booking.servicePriceSnapshot,
          businessType: booking.businessType,
          files: row?.files ?? [],
          milestones: timeline ? timeline.toObject().milestones : [],
          contract: pickContractForBooking(bookingId, contractsByBooking, contractsByEmail),
          invoice: pickInvoiceForBooking(bookingId, invoicesByBooking, invoicesByEmail)
        };
      })
    );

    return res.json({ projects });
  } catch (error) {
    console.error("Portal project fetch failed:", error);
    return res.status(500).json({ message: "Failed to load portal project data" });
  }
}

