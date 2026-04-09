"use client";

import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignaturePad from "signature_pad";
import toast from "react-hot-toast";
import { FileText, Loader2, RefreshCcw, Save, Send, Trash2, Upload } from "lucide-react";
import { api } from "../../../../lib/api";

type ContractStatus = "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";

interface ContractFormState {
  contractNumber: string;
  effectiveDate: string;
  status: ContractStatus;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress: string;
  clientCity: string;
  clientCountry: string;
  bookingId: string;
  invoiceId: string;
  serviceType: string;
  customServiceType: string;
  projectScope: string;
  projectTimeline: string;
  advanceAmount: number;
  totalAmount: number;
  paymentTerms: string;
  customPaymentTerms: string;
  currency: string;
  currencySymbol: string;
  customClause: string;
  adminSignature: string;
}

interface ContractApiResponse {
  id: string;
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
  projectTimeline?: string;
  advanceAmount?: number;
  totalAmount?: number;
  paymentTerms?: string;
  currency?: string;
  currencySymbol?: string;
  customClause?: string;
  adminSignature?: string;
}

interface ContractSettings {
  adminSignature?: string;
}

interface SendContractResponse {
  success?: boolean;
  portalLink?: string;
  message?: string;
}

interface SentModalState {
  email: string;
  phone: string;
  portalLink: string;
}

const SERVICE_OPTIONS = [
  "Custom Website Development",
  "Website + Automation Systems",
  "Digital Marketing (Growth Ops)",
  "Maintenance & Support",
  "Full Business Automation",
  "Custom"
];

const PAYMENT_OPTIONS = [
  "50% advance, 50% on delivery",
  "100% advance",
  "33% advance, 33% midpoint, 34% delivery",
  "Custom"
];

function toIsoDate(input?: string): string {
  if (!input) return "";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export default function ContractEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const initialId = params?.id ?? "new";

  const [contractId, setContractId] = useState(initialId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSentModal, setShowSentModal] = useState(false);
  const [sentModalData, setSentModalData] = useState<SentModalState>({
    email: "",
    phone: "",
    portalLink: ""
  });
  const [bookingLookup, setBookingLookup] = useState("");

  const [form, setForm] = useState<ContractFormState>({
    contractNumber: "",
    effectiveDate: toIsoDate(new Date().toISOString()),
    status: "DRAFT",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientBusiness: "",
    clientAddress: "",
    clientCity: "",
    clientCountry: "",
    bookingId: "",
    invoiceId: "",
    serviceType: "Custom Website Development",
    customServiceType: "",
    projectScope: "",
    projectTimeline: "4-6 weeks",
    advanceAmount: 0,
    totalAmount: 0,
    paymentTerms: "50% advance, 50% on delivery",
    customPaymentTerms: "",
    currency: "INR",
    currencySymbol: "\u20B9",
    customClause: "",
    adminSignature: ""
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const serviceTypeValue = useMemo(() => {
    if (form.serviceType === "Custom") return form.customServiceType.trim();
    return form.serviceType;
  }, [form.customServiceType, form.serviceType]);

  const paymentTermsValue = useMemo(() => {
    if (form.paymentTerms === "Custom") return form.customPaymentTerms.trim();
    return form.paymentTerms;
  }, [form.customPaymentTerms, form.paymentTerms]);

  const getWebBase = () => {
    const envBase = process.env.NEXT_PUBLIC_WEB_URL;
    if (envBase) return envBase.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
    return "";
  };

  const loadSettings = async () => {
    try {
      const { data } = await api.get<ContractSettings>("/api/contracts/settings");
      if (data?.adminSignature) {
        setForm((prev) => ({ ...prev, adminSignature: String(data.adminSignature) }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadContract = async (id: string) => {
    if (!id || id === "new") {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get<ContractApiResponse>(`/api/contracts/${id}`);
      setForm((prev) => ({
        ...prev,
        contractNumber: data.contractNumber || "",
        effectiveDate: toIsoDate(data.effectiveDate),
        status: data.status || "DRAFT",
        clientName: data.clientName || "",
        clientEmail: data.clientEmail || "",
        clientPhone: data.clientPhone || "",
        clientBusiness: data.clientBusiness || "",
        clientAddress: data.clientAddress || "",
        clientCity: data.clientCity || "",
        clientCountry: data.clientCountry || "",
        bookingId: data.bookingId || "",
        invoiceId: data.invoiceId || "",
        serviceType: SERVICE_OPTIONS.includes(data.serviceType || "") ? (data.serviceType as string) : "Custom",
        customServiceType: SERVICE_OPTIONS.includes(data.serviceType || "") ? "" : data.serviceType || "",
        projectScope: data.projectScope || "",
        projectTimeline: data.projectTimeline || "4-6 weeks",
        advanceAmount: Number(data.advanceAmount || 0),
        totalAmount: Number(data.totalAmount || 0),
        paymentTerms: PAYMENT_OPTIONS.includes(data.paymentTerms || "") ? (data.paymentTerms as string) : "Custom",
        customPaymentTerms: PAYMENT_OPTIONS.includes(data.paymentTerms || "") ? "" : data.paymentTerms || "",
        currency: data.currency || "INR",
        currencySymbol: data.currencySymbol || "\u20B9",
        customClause: data.customClause || "",
        adminSignature: data.adminSignature || prev.adminSignature
      }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contract.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadSettings();
      await loadContract(initialId);
    })();
  }, [initialId]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 160 * window.devicePixelRatio;
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
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

  const setField = <K extends keyof ContractFormState>(key: K, value: ContractFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const captureSignature = (): string => {
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) return form.adminSignature;
    return pad.toDataURL("image/png");
  };

  const buildPayload = () => {
    return {
      contractNumber: form.contractNumber,
      effectiveDate: form.effectiveDate,
      status: form.status,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      clientBusiness: form.clientBusiness,
      clientAddress: form.clientAddress,
      clientCity: form.clientCity,
      clientCountry: form.clientCountry,
      bookingId: form.bookingId,
      invoiceId: form.invoiceId,
      serviceType: serviceTypeValue,
      projectScope: form.projectScope,
      projectTimeline: form.projectTimeline,
      advanceAmount: Number(form.advanceAmount || 0),
      totalAmount: Number(form.totalAmount || 0),
      paymentTerms: paymentTermsValue,
      currency: form.currency,
      currencySymbol: form.currencySymbol,
      customClause: form.customClause,
      adminSignature: captureSignature()
    };
  };

  const validateRequired = (): boolean => {
    if (!form.clientName || !form.clientEmail || !form.clientPhone || !form.clientBusiness || !form.clientAddress) {
      toast.error("Please fill all required client fields.");
      return false;
    }
    if (!serviceTypeValue) {
      toast.error("Please select a service type.");
      return false;
    }
    if (!captureSignature()) {
      toast.error("Admin signature is required.");
      return false;
    }
    return true;
  };

  const saveDraft = async (): Promise<string | null> => {
    if (!validateRequired()) return null;

    setSaving(true);
    try {
      const payload = buildPayload();
      const isNew = !contractId || contractId === "new";
      const response = isNew
        ? await api.post<ContractApiResponse>("/api/contracts", payload)
        : await api.patch<ContractApiResponse>(`/api/contracts/${contractId}`, payload);

      const nextId = response.data?.id || contractId;
      if (isNew && nextId && nextId !== "new") {
        setContractId(nextId);
        router.replace(`/zero-control/contracts/${nextId}` as Route);
      }

      setForm((prev) => ({
        ...prev,
        contractNumber: response.data?.contractNumber || prev.contractNumber,
        status: response.data?.status || prev.status,
        adminSignature: payload.adminSignature || prev.adminSignature
      }));

      toast.success("Draft saved.");
      return nextId;
    } catch (error) {
      console.error(error);
      toast.error("Failed to save contract.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const previewPdf = async () => {
    const id = await saveDraft();
    if (!id) return;
    window.open(`/api/contracts/${id}/pdf`, "_blank", "noopener,noreferrer");
  };

  const sendToClient = async () => {
    const id = await saveDraft();
    if (!id) return;

    setSending(true);
    try {
      const { data } = await api.post<SendContractResponse>(`/api/contracts/${id}/send`);
      const success = data?.success === true;
      if (!success) {
        throw new Error(data?.message || "Failed to send contract.");
      }

      setForm((prev) => ({ ...prev, status: "SENT" }));
      toast.success(`\u2705 Contract sent to ${form.clientEmail}`);

      setShowSentModal(true);
      setSentModalData({
        email: form.clientEmail,
        phone: form.clientPhone,
        portalLink: data.portalLink || `${getWebBase()}/portal/contract/${id}`
      });
    } catch (error) {
      console.error(error);
      toast.error("\u274C Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteContract = async () => {
    if (!contractId || contractId === "new") {
      setForm((prev) => ({
        ...prev,
        contractNumber: "",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientBusiness: "",
        clientAddress: "",
        projectScope: "",
        customClause: ""
      }));
      signaturePadRef.current?.clear();
      return;
    }

    if (!window.confirm("Delete this contract?")) return;

    try {
      await api.delete(`/api/contracts/${contractId}`);
      toast.success("Contract deleted.");
      router.push("/zero-control/contracts" as Route);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete contract.");
    }
  };

  const prefillFromBooking = async () => {
    const id = bookingLookup.trim();
    if (!id) {
      toast.error("Enter booking ID first.");
      return;
    }

    try {
      const response = await api.post<ContractApiResponse>(`/api/contracts/from-booking/${encodeURIComponent(id)}`);
      const createdId = response.data?.id;
      if (!createdId) {
        toast.error("Booking prefill failed.");
        return;
      }
      toast.success("Draft created from booking.");
      router.push(`/zero-control/contracts/${createdId}` as Route);
    } catch (error) {
      console.error(error);
      toast.error("Unable to prefill from booking.");
    }
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
            <h1 className="text-3xl font-display text-[var(--ink)]">Contract Editor</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Build, preview, and send service agreements with digital signatures.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 bg-white/70">
            Status: {form.status}
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <article className="soft-card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Client Details</p>
            <div className="grid gap-3">
              <input className="field py-2.5" placeholder="Client Full Name *" autoComplete="name" value={form.clientName} onChange={(event) => setField("clientName", event.target.value)} />
              <div className="grid md:grid-cols-2 gap-3">
                <input type="email" inputMode="email" autoComplete="email" className="field py-2.5" placeholder="Client Email *" value={form.clientEmail} onChange={(event) => setField("clientEmail", event.target.value)} />
                <input type="tel" inputMode="tel" autoComplete="tel" className="field py-2.5" placeholder="Client Phone *" value={form.clientPhone} onChange={(event) => setField("clientPhone", event.target.value)} />
              </div>
              <input className="field py-2.5" placeholder="Client Business Name *" autoComplete="organization" value={form.clientBusiness} onChange={(event) => setField("clientBusiness", event.target.value)} />
              <textarea className="field min-h-[90px] py-2.5" placeholder="Client Full Address *" value={form.clientAddress} onChange={(event) => setField("clientAddress", event.target.value)} />
              <div className="grid md:grid-cols-2 gap-3">
                <input className="field py-2.5" placeholder="City" value={form.clientCity} onChange={(event) => setField("clientCity", event.target.value)} />
                <input className="field py-2.5" placeholder="Country" value={form.clientCountry} onChange={(event) => setField("clientCountry", event.target.value)} />
              </div>

              <div className="rounded-xl border border-black/10 bg-white/70 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Linked Booking</p>
                <div className="flex flex-wrap gap-2">
                  <input className="field w-full py-2.5 md:flex-1 md:min-w-[220px]" placeholder="Enter booking ID to prefill" value={bookingLookup} onChange={(event) => setBookingLookup(event.target.value)} />
                  <button type="button" onClick={() => void prefillFromBooking()} className="btn-secondary px-4 py-2.5 text-sm whitespace-nowrap">
                    Prefill from Booking
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className="soft-card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Contract Settings</p>
            <div className="grid gap-3">
              <input className="field py-2.5" placeholder="Contract Number (auto if blank)" value={form.contractNumber} onChange={(event) => setField("contractNumber", event.target.value)} />
              <div className="grid md:grid-cols-2 gap-3">
                <label className="grid gap-1 text-xs text-[var(--muted)]">
                  Effective Date
                  <input type="date" className="field py-2.5" value={form.effectiveDate} onChange={(event) => setField("effectiveDate", event.target.value)} />
                </label>
                <select className="field py-2.5" value={form.status} onChange={(event) => setField("status", event.target.value as ContractStatus)}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">SENT</option>
                  <option value="VIEWED">VIEWED</option>
                  <option value="SIGNED">SIGNED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <label className="grid gap-1 text-xs text-[var(--muted)]">
                Service Type
                <select className="field py-2.5" value={form.serviceType} onChange={(event) => setField("serviceType", event.target.value)}>
                  {SERVICE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {form.serviceType === "Custom" ? (
                <input className="field py-2.5" placeholder="Type custom service" value={form.customServiceType} onChange={(event) => setField("customServiceType", event.target.value)} />
              ) : null}

              <textarea className="field min-h-[100px] py-2.5" placeholder="Project scope" value={form.projectScope} onChange={(event) => setField("projectScope", event.target.value)} />
              <input className="field py-2.5" placeholder="Project timeline (e.g. 4-6 weeks)" value={form.projectTimeline} onChange={(event) => setField("projectTimeline", event.target.value)} />
            </div>
          </article>

          <article className="soft-card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Financial Details</p>
            <div className="grid md:grid-cols-2 gap-3">
              <input type="number" inputMode="decimal" min={0} className="field py-2.5" placeholder="Advance Amount" value={form.advanceAmount} onChange={(event) => setField("advanceAmount", Number(event.target.value) || 0)} />
              <input type="number" inputMode="decimal" min={0} className="field py-2.5" placeholder="Total Project Value" value={form.totalAmount} onChange={(event) => setField("totalAmount", Number(event.target.value) || 0)} />
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <select className="field py-2.5" value={form.paymentTerms} onChange={(event) => setField("paymentTerms", event.target.value)}>
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className="field py-2.5" placeholder="Currency" value={form.currency} onChange={(event) => setField("currency", event.target.value)} />
                <input className="field py-2.5" placeholder="Symbol" value={form.currencySymbol} onChange={(event) => setField("currencySymbol", event.target.value)} />
              </div>
            </div>
            {form.paymentTerms === "Custom" ? (
              <input className="field py-2.5 mt-3" placeholder="Custom payment terms" value={form.customPaymentTerms} onChange={(event) => setField("customPaymentTerms", event.target.value)} />
            ) : null}
          </article>

          <article className="soft-card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Admin Signature</p>
            <div className="rounded-xl border border-black/10 bg-white/60 p-3">
              <canvas ref={canvasRef} className="w-full h-40 rounded-lg bg-white border border-black/10" />
              <div className="mt-2 flex flex-wrap gap-2">
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
                    toast.success("Signature updated.");
                  }}
                >
                  <Save size={12} /> Save Signature
                </button>
                <label className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-xs inline-flex items-center gap-1 cursor-pointer">
                  <Upload size={12} /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await readAsDataURL(file);
                        setField("adminSignature", dataUrl);
                        toast.success("Signature image loaded.");
                      } catch {
                        toast.error("Failed to read image file.");
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </article>

          <article className="soft-card p-6">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Additional Clause (Optional)</p>
            <textarea className="field min-h-[100px] py-2.5" placeholder="Any project-specific legal terms" value={form.customClause} onChange={(event) => setField("customClause", event.target.value)} />
          </article>

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

            <button type="button" onClick={deleteContract} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50">
              <Trash2 size={14} /> Delete
            </button>

            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  contractNumber: "",
                  clientName: "",
                  clientEmail: "",
                  clientPhone: "",
                  clientBusiness: "",
                  clientAddress: "",
                  projectScope: "",
                  customClause: ""
                }));
                signaturePadRef.current?.clear();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-black/10 bg-white"
            >
              <RefreshCcw size={14} /> Reset
            </button>
          </section>
        </div>

        <aside className="soft-card p-6 h-fit sticky top-8">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)] mb-2">Live Preview</p>
          <h2 className="text-xl font-display text-[var(--ink)] leading-tight">{form.contractNumber || "ZERO-CONTRACT-YYYY-001"}</h2>
          <p className="text-sm text-[var(--muted)] mt-2">Date: {form.effectiveDate || "--"}</p>

          <div className="mt-4 rounded-xl border border-black/10 bg-white/70 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Client</span>
              <strong className="text-right">{form.clientName || "-"}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Service</span>
              <strong className="text-right">{serviceTypeValue || "-"}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Advance</span>
              <strong>{formatMoney(form.currencySymbol || "\u20B9", form.advanceAmount)}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Total</span>
              <strong>{formatMoney(form.currencySymbol || "\u20B9", form.totalAmount)}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Timeline</span>
              <strong>{form.projectTimeline || "-"}</strong>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--muted)]">Payment</span>
              <strong className="text-right">{paymentTermsValue || "-"}</strong>
            </div>
          </div>

          {contractId !== "new" ? (
            <a href={`/portal/contract/${contractId}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full justify-center rounded-lg border border-black/10 bg-white py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-black/5">
              Open Full Preview
            </a>
          ) : (
            <p className="text-xs text-[var(--muted)] mt-4">Save draft to open full preview link.</p>
          )}
        </aside>
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
                <span className="channel-check">\u2713</span>
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
