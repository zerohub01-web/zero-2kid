"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignaturePad from "signature_pad";
import toast from "react-hot-toast";
import { Loader2, Plus, Save, Send, Trash2, FileText, RefreshCcw } from "lucide-react";
import { api } from "../../../../lib/api";

type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "PAID" | "OVERDUE" | "CANCELLED";

interface InvoiceItemForm {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFormState {
  invoiceNumber: string;
  dueDate: string;
  issueDate: string;
  validUntil: string;
  status: InvoiceStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress: string;
  clientGST: string;
  clientLocation: string;
  currency: string;
  currencySymbol: string;
  gstRate: number;
  paymentTerms: string;
  proposalNote: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  bookingId: string;
  adminSignature: string;
}

interface InvoiceApiItem {
  category?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
}

interface InvoiceApiResponse {
  id: string;
  invoiceNumber?: string;
  dueDate?: string;
  createdAt?: string;
  validUntil?: string;
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
  gstRate?: number;
  paymentTerms?: string;
  proposalNote?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  bookingId?: string;
  adminSignature?: string;
  items?: InvoiceApiItem[];
}

interface SendInvoiceResponse {
  success?: boolean;
  whatsappUrl?: string;
  portalLink?: string;
  message?: string;
}

interface SentModalState {
  email: string;
  phone: string;
  whatsappUrl: string;
  portalLink: string;
}

const ITEM_CATEGORIES = [
  "Website Dev",
  "SEO",
  "Ads Management",
  "Automation",
  "Maintenance",
  "AI Chatbot",
  "Social Media",
  "Other"
];

const TEMPLATES: Array<{ label: string; category: string; description: string; amount: number }> = [
  { label: "Basic Package INR 14,999", category: "Website Dev", description: "Basic website package", amount: 14999 },
  { label: "Plus Package INR 39,999", category: "Automation", description: "Automation plus package", amount: 39999 },
  { label: "Premium Package INR 89,999", category: "Automation", description: "Premium full stack package", amount: 89999 },
  { label: "Growth Ops INR 30,000/mo", category: "Ads Management", description: "Growth Ops monthly retainer", amount: 30000 },
  { label: "Maintenance INR 2,000/mo", category: "Maintenance", description: "Maintenance support retainer", amount: 2000 }
];

const PAYMENT_TERM_OPTIONS = ["Due within 7 days", "Due within 15 days", "Due within 30 days", "Milestone based"];

function makeItem(partial?: Partial<InvoiceItemForm>): InvoiceItemForm {
  return {
    id: crypto.randomUUID(),
    category: partial?.category ?? "Website Dev",
    description: partial?.description ?? "",
    quantity: partial?.quantity ?? 1,
    unitPrice: partial?.unitPrice ?? 0
  };
}

function toIsoDate(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function InvoiceEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const initialId = params?.id ?? "new";

  const [invoiceId, setInvoiceId] = useState(initialId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSentModal, setShowSentModal] = useState(false);
  const [sentModalData, setSentModalData] = useState<SentModalState>({
    email: "",
    phone: "",
    whatsappUrl: "",
    portalLink: ""
  });
  const [saveDefaults, setSaveDefaults] = useState(false);

  const [form, setForm] = useState<InvoiceFormState>({
    invoiceNumber: "",
    dueDate: toIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
    issueDate: toIsoDate(new Date().toISOString()),
    validUntil: "",
    status: "DRAFT",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientBusiness: "",
    clientAddress: "",
    clientGST: "",
    clientLocation: "IN",
    currency: "INR",
    currencySymbol: "₹",
    gstRate: 18,
    paymentTerms: "Due within 7 days",
    proposalNote: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    bookingId: "",
    adminSignature: ""
  });

  const [items, setItems] = useState<InvoiceItemForm[]>([makeItem({ description: "Custom service item" })]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const gstAmount = (subtotal * Number(form.gstRate || 0)) / 100;
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
  }, [form.gstRate, items]);

  const getWebBase = () => {
    const envBase = process.env.NEXT_PUBLIC_WEB_URL;
    if (envBase) return envBase.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
    return "";
  };

  const loadInvoice = async (id: string) => {
    if (!id || id === "new") {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<InvoiceApiResponse>(`/api/invoices/${id}`);
      setForm((prev) => ({
        ...prev,
        invoiceNumber: data.invoiceNumber || "",
        dueDate: toIsoDate(data.dueDate),
        issueDate: toIsoDate(data.createdAt),
        validUntil: toIsoDate(data.validUntil),
        status: data.status || "DRAFT",
        clientName: data.clientName || "",
        clientEmail: data.clientEmail || "",
        clientPhone: data.clientPhone || "",
        clientBusiness: data.clientBusiness || "",
        clientAddress: data.clientAddress || "",
        clientGST: data.clientGST || "",
        clientLocation: data.clientLocation || "",
        currency: data.currency || "INR",
        currencySymbol: data.currencySymbol || "₹",
        gstRate: Number(data.gstRate || 18),
        paymentTerms: data.paymentTerms || "Due within 7 days",
        proposalNote: data.proposalNote || "",
        bankName: data.bankName || "",
        accountNumber: data.accountNumber || "",
        ifscCode: data.ifscCode || "",
        upiId: data.upiId || "",
        bookingId: data.bookingId || "",
        adminSignature: data.adminSignature || ""
      }));

      const mappedItems = Array.isArray(data.items)
        ? data.items.map((item) =>
            makeItem({
              category: item.category || "Other",
              description: item.description || "",
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0)
            })
          )
        : [];

      if (mappedItems.length > 0) {
        setItems(mappedItems);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const defaults = window.localStorage.getItem("zero_invoice_bank_defaults");
      if (defaults) {
        const parsed = JSON.parse(defaults) as Partial<InvoiceFormState>;
        setForm((prev) => ({
          ...prev,
          bankName: parsed.bankName || prev.bankName,
          accountNumber: parsed.accountNumber || prev.accountNumber,
          ifscCode: parsed.ifscCode || prev.ifscCode,
          upiId: parsed.upiId || prev.upiId
        }));
      }
    } catch {
      // no-op
    }

    void loadInvoice(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 160 * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.4,
      penColor: "#0f172a"
    });

    if (form.adminSignature) {
      signaturePadRef.current.fromDataURL(form.adminSignature);
    }

    return () => {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
    };
  }, [form.adminSignature]);

  const setField = <K extends keyof InvoiceFormState>(key: K, value: InvoiceFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setItem = (id: string, patch: Partial<InvoiceItemForm>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addTemplate = (template?: { label: string; category: string; description: string; amount: number }) => {
    if (!template) {
      setItems((prev) => [...prev, makeItem({ category: "Other", description: "Custom item" })]);
      return;
    }

    setItems((prev) => [
      ...prev,
      makeItem({
        category: template.category,
        description: template.description,
        quantity: 1,
        unitPrice: template.amount
      })
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const captureSignature = () => {
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) {
      return form.adminSignature;
    }
    return pad.toDataURL("image/png");
  };

  const buildPayload = () => {
    const signature = captureSignature();

    return {
      invoiceNumber: form.invoiceNumber,
      dueDate: form.dueDate,
      status: form.status,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      clientBusiness: form.clientBusiness,
      clientAddress: form.clientAddress,
      clientGST: form.clientGST,
      clientLocation: form.clientLocation,
      currency: form.currency,
      currencySymbol: form.currencySymbol,
      gstRate: Number(form.gstRate || 0),
      paymentTerms: form.paymentTerms,
      proposalNote: form.proposalNote,
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      ifscCode: form.ifscCode,
      upiId: form.upiId,
      bookingId: form.bookingId,
      validUntil: form.validUntil || undefined,
      adminSignature: signature,
      items: items.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.quantity || 1) * Number(item.unitPrice || 0)
      }))
    };
  };

  const persistDefaultsIfNeeded = () => {
    if (!saveDefaults) return;
    try {
      window.localStorage.setItem(
        "zero_invoice_bank_defaults",
        JSON.stringify({
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
          upiId: form.upiId
        })
      );
    } catch {
      // no-op
    }
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!form.clientName || !form.clientEmail || !form.clientPhone || !form.clientBusiness) {
      toast.error("Please fill client name, email, phone, and business name.");
      return null;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const isNew = !invoiceId || invoiceId === "new";
      const response = isNew
        ? await api.post("/api/invoices", payload)
        : await api.patch(`/api/invoices/${invoiceId}`, payload);

      const nextId = response.data?.id || invoiceId;
      if (isNew && nextId && nextId !== "new") {
        setInvoiceId(nextId);
        router.replace(`/zero-control/invoices/${nextId}`);
      }

      setForm((prev) => ({
        ...prev,
        invoiceNumber: response.data?.invoiceNumber || prev.invoiceNumber,
        status: response.data?.status || prev.status,
        adminSignature: payload.adminSignature || prev.adminSignature
      }));

      persistDefaultsIfNeeded();
      toast.success("Draft saved.");
      return nextId;
    } catch (error) {
      console.error(error);
      toast.error("Failed to save draft.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const previewPdf = async () => {
    const id = await saveDraft();
    if (!id) return;
    window.open(`/api/invoices/${id}/pdf`, "_blank", "noopener,noreferrer");
  };

  const sendToClient = async () => {
    const id = await saveDraft();
    if (!id) return;

    setSending(true);
    try {
      const { data } = await api.post<SendInvoiceResponse>(`/api/invoices/${id}/send`);
      const success = data?.success === true;
      if (!success) {
        throw new Error(data?.message || "Failed to send invoice.");
      }

      setForm((prev) => ({ ...prev, status: "SENT" }));
      toast.success(`\u2705 Invoice sent to ${form.clientEmail}`);

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }

      setShowSentModal(true);
      setSentModalData({
        email: form.clientEmail,
        phone: form.clientPhone,
        whatsappUrl: data.whatsappUrl || "",
        portalLink: data.portalLink || `${getWebBase()}/portal/invoice/${id}`
      });
    } catch (error) {
      console.error(error);
      toast.error("\u274C Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteInvoice = async () => {
    if (!invoiceId || invoiceId === "new") {
      startFresh();
      return;
    }

    if (!confirm("Delete this invoice?")) return;

    try {
      await api.delete(`/api/invoices/${invoiceId}`);
      toast.success("Invoice deleted.");
      router.push("/zero-control/invoices");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete invoice.");
    }
  };

  const startFresh = () => {
    setForm((prev) => ({
      ...prev,
      invoiceNumber: "",
      dueDate: toIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
      status: "DRAFT",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientBusiness: "",
      clientAddress: "",
      clientGST: "",
      proposalNote: ""
    }));
    setItems([makeItem({ description: "Custom service item" })]);
    signaturePadRef.current?.clear();
  };

  if (loading) {
    return (
      <div className="h-[420px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <section className="space-y-5 pb-10">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">Invoice Editor</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Create proposals, set totals, generate PDF, and send via email.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white/70">
            Status: {form.status}
          </div>
        </div>
      </header>

      <section className="soft-card p-6 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Client Details</p>
          <div className="grid gap-3">
            <input className="field py-2.5" placeholder="Client Name" value={form.clientName} onChange={(e) => setField("clientName", e.target.value)} />
            <input className="field py-2.5" placeholder="Client Email" value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} />
            <input className="field py-2.5" placeholder="Client Phone" value={form.clientPhone} onChange={(e) => setField("clientPhone", e.target.value)} />
            <input className="field py-2.5" placeholder="Business Name" value={form.clientBusiness} onChange={(e) => setField("clientBusiness", e.target.value)} />
            <input className="field py-2.5" placeholder="Address" value={form.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="field py-2.5" placeholder="GST Number" value={form.clientGST} onChange={(e) => setField("clientGST", e.target.value)} />
              <input className="field py-2.5" placeholder="Location (IN / US...)" value={form.clientLocation} onChange={(e) => setField("clientLocation", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Invoice Settings</p>
          <div className="grid gap-3">
            <input className="field py-2.5" placeholder="Invoice Number (auto if blank)" value={form.invoiceNumber} onChange={(e) => setField("invoiceNumber", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Due Date
                <input type="date" className="field py-2.5" value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Valid Until
                <input type="date" className="field py-2.5" value={form.validUntil} onChange={(e) => setField("validUntil", e.target.value)} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="field py-2.5" placeholder="Currency" value={form.currency} onChange={(e) => setField("currency", e.target.value)} />
              <input className="field py-2.5" placeholder="Symbol" value={form.currencySymbol} onChange={(e) => setField("currencySymbol", e.target.value)} />
            </div>
            <label className="grid gap-1 text-xs text-[var(--muted)]">
              Payment Terms
              <select className="field py-2.5" value={form.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)}>
                {PAYMENT_TERM_OPTIONS.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
            <input className="field py-2.5" placeholder="Linked Booking ID (optional)" value={form.bookingId} onChange={(e) => setField("bookingId", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="soft-card p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Proposal Note</p>
        <textarea
          className="field min-h-[120px] py-2.5"
          placeholder="Dear [Name], thank you for choosing ZeroOps. Here is your proposal..."
          value={form.proposalNote}
          onChange={(e) => setField("proposalNote", e.target.value)}
        />
      </section>

      <section className="soft-card p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => addTemplate(template)}
              className="px-3 py-1.5 rounded-full border border-black/10 bg-white text-xs font-medium"
            >
              + {template.label}
            </button>
          ))}
          <button type="button" onClick={() => addTemplate()} className="px-3 py-1.5 rounded-full border border-black/10 bg-white text-xs font-medium">
            + Custom Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-black/10">
              <tr>
                <th className="py-2 text-left">Category</th>
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-left">Qty</th>
                <th className="py-2 text-left">Unit Price</th>
                <th className="py-2 text-left">Total</th>
                <th className="py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {items.map((item) => {
                const lineTotal = item.quantity * item.unitPrice;
                return (
                  <tr key={item.id}>
                    <td className="py-2">
                      <select
                        className="field py-2"
                        value={item.category}
                        onChange={(e) => setItem(item.id, { category: e.target.value })}
                      >
                        {ITEM_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        className="field py-2"
                        value={item.description}
                        onChange={(e) => setItem(item.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        className="field py-2"
                        value={item.quantity}
                        onChange={(e) => setItem(item.id, { quantity: Number(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        className="field py-2"
                        value={item.unitPrice}
                        onChange={(e) => setItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="py-2 font-semibold">{formatMoney(form.currencySymbol || "₹", lineTotal)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-50 text-red-700 text-xs"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="soft-card p-6 grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Payment Details</p>
          <div className="grid gap-3">
            <input className="field py-2.5" placeholder="Bank Name" value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
            <input className="field py-2.5" placeholder="Account Number" value={form.accountNumber} onChange={(e) => setField("accountNumber", e.target.value)} />
            <input className="field py-2.5" placeholder="IFSC" value={form.ifscCode} onChange={(e) => setField("ifscCode", e.target.value)} />
            <input className="field py-2.5" placeholder="UPI ID" value={form.upiId} onChange={(e) => setField("upiId", e.target.value)} />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" checked={saveDefaults} onChange={(e) => setSaveDefaults(e.target.checked)} />
              Save as default
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Admin Signature</p>
          <div className="rounded-xl border border-black/10 bg-white/60 p-3">
            <canvas ref={canvasRef} className="w-full h-40 rounded-lg bg-white border border-black/10" />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs"
                onClick={() => {
                  signaturePadRef.current?.clear();
                  setField("adminSignature", "");
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1"
                onClick={() => {
                  const next = captureSignature();
                  setField("adminSignature", next);
                  toast.success("Signature saved.");
                }}
              >
                <Save size={12} /> Save Signature
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Live Totals</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(form.currencySymbol || "₹", totals.subtotal)}</strong></div>
              <div className="flex justify-between items-center">
                <span>GST</span>
                <div className="inline-flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="field py-1 px-2 w-20"
                    value={form.gstRate}
                    onChange={(e) => setField("gstRate", Number(e.target.value) || 0)}
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex justify-between"><span>GST Amount</span><strong>{formatMoney(form.currencySymbol || "₹", totals.gstAmount)}</strong></div>
              <div className="flex justify-between text-base"><span>Total Due</span><strong>{formatMoney(form.currencySymbol || "₹", totals.total)}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="soft-card p-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveDraft()} disabled={saving} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Draft
        </button>

        <button type="button" onClick={() => void previewPdf()} className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          <FileText size={14} /> Preview PDF
        </button>

        <button type="button" onClick={() => void sendToClient()} disabled={sending} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-emerald-600 text-white">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send to Client
        </button>

        <button type="button" onClick={deleteInvoice} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50">
          <Trash2 size={14} /> Delete
        </button>

        <button type="button" onClick={startFresh} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-black/10 bg-white">
          <RefreshCcw size={14} /> Reset
        </button>
      </section>

      {showSentModal ? (
        <div className="sent-modal-overlay" onClick={() => setShowSentModal(false)}>
          <div className="sent-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sent-modal-icon">\u2705</div>
            <h2 className="sent-modal-title">Document Sent Successfully</h2>

            <div className="sent-channel-list">
              <div className="sent-channel">
                <span className="channel-icon">{"\u{1F4E7}"}</span>
                <div>
                  <div className="channel-label">Email sent via Resend</div>
                  <div className="channel-detail">{sentModalData.email}</div>
                </div>
                <span className="channel-check">\u2713</span>
              </div>

              <div className="sent-channel">
                <span className="channel-icon">{"\u{1F4AC}"}</span>
                <div>
                  <div className="channel-label">WhatsApp notification</div>
                  <div className="channel-detail">{sentModalData.phone}</div>
                </div>
                {sentModalData.whatsappUrl ? (
                  <a href={sentModalData.whatsappUrl} target="_blank" rel="noopener noreferrer" className="channel-open-btn">
                    Open WhatsApp \u2197
                  </a>
                ) : (
                  <span className="channel-check">\u2713</span>
                )}
              </div>

              <div className="sent-channel">
                <span className="channel-icon">{"\u{1F517}"}</span>
                <div>
                  <div className="channel-label">Client portal link</div>
                  <div className="channel-detail mono">{sentModalData.portalLink}</div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard
                      .writeText(sentModalData.portalLink)
                      .then(() => toast.success("Link copied!"))
                      .catch(() => toast.error("Could not copy link."));
                  }}
                  className="channel-open-btn"
                >
                  Copy Link
                </button>
              </div>
            </div>

            <button className="sent-modal-close" onClick={() => setShowSentModal(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .sent-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .sent-modal {
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .sent-modal-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .sent-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #111;
          margin-bottom: 28px;
        }

        .sent-channel-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
          text-align: left;
        }

        .sent-channel {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 10px;
        }

        .channel-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .channel-label {
          font-size: 13px;
          font-weight: 600;
          color: #111;
        }

        .channel-detail {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
        }

        .channel-detail.mono {
          font-size: 11px;
          font-family: monospace;
          word-break: break-all;
        }

        .channel-check {
          margin-left: auto;
          color: #2e7d32;
          font-weight: 700;
          font-size: 16px;
        }

        .channel-open-btn {
          margin-left: auto;
          background: #0a0a0f;
          color: #fff;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .channel-open-btn:hover {
          background: #333;
        }

        .sent-modal-close {
          background: #0a0a0f;
          color: #fff;
          border: none;
          padding: 12px 40px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }

        .sent-modal-close:hover {
          background: #333;
        }
      `}</style>
    </section>
  );
}
