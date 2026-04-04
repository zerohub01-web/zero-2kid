import mongoose, { Schema, type HydratedDocument } from "mongoose";

export type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "PAID" | "OVERDUE" | "CANCELLED";
export type ContractStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface Invoice {
  invoiceNumber: string;
  createdAt: Date;
  dueDate: Date;
  status: InvoiceStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress?: string;
  clientGST?: string;
  clientLocation: string;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paymentTerms: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  pdfUrl?: string;
  emailSentAt?: Date;
  emailSentTo?: string;
  viewedAt?: Date;
  viewCount: number;
  clientSignature?: string;
  signedAt?: Date;
  adminSignature?: string;
  proposalNote?: string;
  validUntil?: Date;
  bookingId?: string;
  clientPortalVisible: boolean;
  updatedAt: Date;
}

export type InvoiceDocument = HydratedDocument<Invoice>;

export interface Contract {
  contractNumber: string;
  createdAt: Date;
  effectiveDate: Date;
  status: ContractStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress: string;
  clientCity?: string;
  clientCountry?: string;
  bookingId?: string;
  invoiceId?: string;
  serviceType: string;
  projectScope?: string;
  advanceAmount?: number;
  totalAmount?: number;
  currency: string;
  currencySymbol: string;
  pdfUrl?: string;
  emailSentAt?: Date;
  viewedAt?: Date;
  viewCount: number;
  clientSignature?: string;
  clientSignedAt?: Date;
  clientSignedIP?: string;
  adminSignature: string;
  adminSignedAt: Date;
  customClause?: string;
  paymentTerms?: string;
  projectTimeline?: string;
  clientPortalVisible: boolean;
  updatedAt: Date;
}

export type ContractDocument = HydratedDocument<Contract>;

export interface AdminSettings {
  key: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  gstNumber?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  adminSignature?: string;
  updatedAt: Date;
  createdAt: Date;
}

export type AdminSettingsDocument = HydratedDocument<AdminSettings>;

export interface Review {
  clientId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  status: ReviewStatus;
  clientName: string;
  clientEmail: string;
  clientBusiness?: string;
  serviceUsed?: string;
  rating: number;
  reviewText: string;
  testimonial: string;
  approved: boolean;
  approvedBy?: string;
  rejectedBy?: string;
  rejectReason?: string;
  source: string;
  featured: boolean;
  displayOrder: number;
}

export type ReviewDocument = HydratedDocument<Review>;

const invoiceItemSchema = new Schema<InvoiceItem>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: "" }
  },
  { _id: true }
);

const invoiceSchema = new Schema<Invoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true, trim: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "VIEWED", "SIGNED", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
      index: true
    },

    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    clientPhone: { type: String, required: true, trim: true },
    clientBusiness: { type: String, required: true, trim: true },
    clientAddress: { type: String, trim: true, default: "" },
    clientGST: { type: String, trim: true, default: "" },
    clientLocation: { type: String, required: true, trim: true },

    currency: { type: String, default: "INR", trim: true },
    currencySymbol: { type: String, default: "\u20B9", trim: true },
    exchangeRate: { type: Number, default: 1, min: 0 },

    items: { type: [invoiceItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0, default: 0 },
    gstRate: { type: Number, required: true, min: 0, default: 18 },
    gstAmount: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },

    paymentTerms: { type: String, default: "Due within 7 days", trim: true },
    bankName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, default: "" },
    upiId: { type: String, trim: true, default: "" },

    pdfUrl: { type: String, trim: true, default: "" },
    emailSentAt: { type: Date },
    emailSentTo: { type: String, trim: true, default: "" },
    viewedAt: { type: Date },
    viewCount: { type: Number, default: 0, min: 0 },

    clientSignature: { type: String, default: "" },
    signedAt: { type: Date },
    adminSignature: { type: String, default: "" },

    proposalNote: { type: String, default: "", trim: true },
    validUntil: { type: Date },

    bookingId: { type: String, trim: true, default: "", index: true },
    clientPortalVisible: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const contractSchema = new Schema<Contract>(
  {
    contractNumber: { type: String, required: true, unique: true, index: true, trim: true },
    effectiveDate: { type: Date, default: Date.now, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "VIEWED", "SIGNED", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      index: true
    },

    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    clientPhone: { type: String, required: true, trim: true },
    clientBusiness: { type: String, required: true, trim: true },
    clientAddress: { type: String, required: true, trim: true },
    clientCity: { type: String, trim: true, default: "" },
    clientCountry: { type: String, trim: true, default: "" },

    bookingId: { type: String, trim: true, default: "", index: true },
    invoiceId: { type: String, trim: true, default: "", index: true },

    serviceType: { type: String, required: true, trim: true },
    projectScope: { type: String, trim: true, default: "" },
    advanceAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, trim: true, default: "INR" },
    currencySymbol: { type: String, trim: true, default: "\u20B9" },

    pdfUrl: { type: String, trim: true, default: "" },
    emailSentAt: { type: Date },
    viewedAt: { type: Date },
    viewCount: { type: Number, min: 0, default: 0 },

    clientSignature: { type: String, default: "" },
    clientSignedAt: { type: Date },
    clientSignedIP: { type: String, trim: true, default: "" },
    adminSignature: { type: String, required: true, trim: true },
    adminSignedAt: { type: Date, default: Date.now, required: true },

    customClause: { type: String, trim: true, default: "" },
    paymentTerms: { type: String, trim: true, default: "50% advance, 50% on delivery" },
    projectTimeline: { type: String, trim: true, default: "4-6 weeks" },
    clientPortalVisible: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const adminSettingsSchema = new Schema<AdminSettings>(
  {
    key: { type: String, required: true, unique: true, index: true, default: "default", trim: true },
    companyName: { type: String, required: true, trim: true, default: "ZERO OPS" },
    companyPhone: { type: String, required: true, trim: true, default: "97469 27368" },
    companyEmail: { type: String, required: true, trim: true, default: "Zerohub01@gmail.com" },
    companyAddress: { type: String, required: true, trim: true, default: "Bangalore, Karnataka" },
    gstNumber: { type: String, trim: true, default: "" },
    upiId: { type: String, trim: true, default: "zerohub01@upi" },
    bankName: { type: String, trim: true, default: process.env.ZERO_BANK_NAME ?? "HDFC Bank" },
    accountNumber: { type: String, trim: true, default: process.env.ZERO_ACCOUNT_NUMBER ?? "" },
    ifscCode: { type: String, trim: true, default: process.env.ZERO_IFSC_CODE ?? "" },
    adminSignature: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

const reviewSchema = new Schema<Review>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Customer", required: false, index: true },
    publishedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true
    },

    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    clientBusiness: { type: String, trim: true, default: "" },
    serviceUsed: { type: String, trim: true, default: "" },

    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true, trim: true, maxlength: 500 },
    testimonial: { type: String, required: true, trim: true, maxlength: 500 },
    approved: { type: Boolean, default: false, index: true },

    approvedBy: { type: String, trim: true, default: "" },
    rejectedBy: { type: String, trim: true, default: "" },
    rejectReason: { type: String, trim: true, default: "" },

    source: { type: String, trim: true, default: "portal" },
    featured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ clientEmail: 1 });

contractSchema.index({ createdAt: -1 });
contractSchema.index({ status: 1, effectiveDate: 1 });
contractSchema.index({ clientEmail: 1 });

reviewSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
reviewSchema.index({ clientEmail: 1, createdAt: -1 });
reviewSchema.index({ featured: 1, displayOrder: 1, publishedAt: -1 });

export const InvoiceModel =
  (mongoose.models.Invoice as mongoose.Model<Invoice>) || mongoose.model<Invoice>("Invoice", invoiceSchema);

export const ContractModel =
  (mongoose.models.Contract as mongoose.Model<Contract>) || mongoose.model<Contract>("Contract", contractSchema);

export const AdminSettingsModel =
  (mongoose.models.AdminSettings as mongoose.Model<AdminSettings>) ||
  mongoose.model<AdminSettings>("AdminSettings", adminSettingsSchema);

export const ReviewModel =
  (mongoose.models.Review as mongoose.Model<Review>) || mongoose.model<Review>("Review", reviewSchema);
