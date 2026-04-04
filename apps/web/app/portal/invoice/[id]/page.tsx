"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import toast from "react-hot-toast";
import { Download, Loader2, MessageSquare, PenLine } from "lucide-react";

interface PublicInvoice {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "PAID" | "OVERDUE" | "CANCELLED";
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress?: string;
  totalAmount: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  currencySymbol: string;
  paymentTerms: string;
  dueDate: string;
  createdAt: string;
  items: Array<{ category?: string; description: string; quantity: number; unitPrice: number; total: number }>;
  upiId?: string;
  ifscCode?: string;
  accountNumber?: string;
  bankName?: string;
  proposalNote?: string;
  clientSignature?: string;
  signedAt?: string;
  portalTokens?: {
    view?: string;
    sign?: string;
    pdf?: string;
  };
}

function formatMoney(symbol: string, amount: number): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  return (fromEnv || "http://localhost:4000").replace(/\/$/, "");
}

export default function PortalInvoicePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id ?? "";
  const viewToken = searchParams?.get("token") ?? "";

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const apiBase = useMemo(() => getApiBase(), []);

  const fetchInvoice = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const tokenQuery = viewToken ? `?token=${encodeURIComponent(viewToken)}` : "";
      const res = await fetch(`${apiBase}/portal/invoice/${id}${tokenQuery}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Invoice fetch failed (${res.status})`);
      }
      const data = (await res.json()) as PublicInvoice;
      setInvoice(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoice();
  }, [id, viewToken]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 170 * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      minWidth: 0.9,
      maxWidth: 2.3,
      penColor: "#0f172a"
    });

    return () => {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
    };
  }, [invoice?.id]);

  const signAndAccept = async () => {
    if (!invoice) return;

    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty()) {
      toast.error("Please add your signature first.");
      return;
    }

    setSigning(true);
    try {
      const signature = pad.toDataURL("image/png");
      const signToken = invoice.portalTokens?.sign ?? "";
      if (!signToken) {
        throw new Error("This signing link is missing a valid access token.");
      }

      const res = await fetch(`${apiBase}/api/invoices/${invoice.id}/sign?token=${encodeURIComponent(signToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature })
      });

      if (!res.ok) {
        throw new Error(`Sign failed (${res.status})`);
      }

      toast.success("Invoice signed successfully.");
      await fetchInvoice();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save signature.");
    } finally {
      setSigning(false);
    }
  };

  const copyUpi = async () => {
    if (!invoice?.upiId) return;
    try {
      await navigator.clipboard.writeText(invoice.upiId);
      toast.success("UPI ID copied.");
    } catch {
      toast.error("Could not copy UPI ID.");
    }
  };

  const waLink = useMemo(() => {
    if (!invoice) return "";
    const phone = (process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "918590464379").replace(/\D/g, "") || "918590464379";
    const txt = `Hi ZeroOps, I have a question about invoice ${invoice.invoiceNumber}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(txt)}`;
  }, [invoice]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="soft-card p-8 text-center text-sm text-[var(--muted)]">Invoice not found.</div>
      </main>
    );
  }

  const pdfToken = invoice.portalTokens?.pdf ?? "";
  const pdfHref = pdfToken
    ? `${apiBase}/api/invoices/${invoice.id}/pdf?token=${encodeURIComponent(pdfToken)}`
    : `${apiBase}/api/invoices/${invoice.id}/pdf`;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <section className="max-w-5xl mx-auto space-y-5">
        <article className="soft-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Client Invoice</p>
              <h1 className="text-3xl font-display text-[var(--ink)] mt-2">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-[var(--muted)] mt-2">{invoice.clientName} - {invoice.clientBusiness}</p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Total Due</p>
              <p className="text-2xl font-semibold mt-2">{formatMoney(invoice.currencySymbol || "₹", invoice.totalAmount)}</p>
              <p className="text-sm text-[var(--muted)] mt-2">Due by {new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </article>

        <article className="soft-card p-6">
          {invoice.proposalNote ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900 mb-4">
              {invoice.proposalNote}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-left">Qty</th>
                  <th className="py-2 text-left">Unit Price</th>
                  <th className="py-2 text-left">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(Array.isArray(invoice.items) ? invoice.items : []).map((item, idx) => (
                  <tr key={`${item.description}-${idx}`}>
                    <td className="py-2">
                      <p className="font-medium">{item.description}</p>
                      {item.category ? <p className="text-xs text-[var(--muted)] mt-0.5">{item.category}</p> : null}
                    </td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2">{formatMoney(invoice.currencySymbol || "₹", item.unitPrice)}</td>
                    <td className="py-2 font-semibold">{formatMoney(invoice.currencySymbol || "₹", item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ml-auto max-w-xs rounded-xl border border-black/10 bg-white/70 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(invoice.currencySymbol || "₹", invoice.subtotal)}</strong></div>
            <div className="flex justify-between"><span>GST ({invoice.gstRate}%)</span><strong>{formatMoney(invoice.currencySymbol || "₹", invoice.gstAmount)}</strong></div>
            <div className="flex justify-between text-base"><span>Total</span><strong>{formatMoney(invoice.currencySymbol || "₹", invoice.totalAmount)}</strong></div>
          </div>
        </article>

        <article className="soft-card p-6 grid gap-5 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Payment Details</h2>
            <p className="text-sm text-[var(--muted)] mt-2">Terms: {invoice.paymentTerms || "Due within 7 days"}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p>Bank: {invoice.bankName || "HDFC Bank"}</p>
              <p>Account: {invoice.accountNumber || "-"}</p>
              <p>IFSC: {invoice.ifscCode || "-"}</p>
              <p>UPI: {invoice.upiId || "zerohub01@upi"}</p>
            </div>
            <button type="button" onClick={copyUpi} className="mt-3 px-3 py-2 rounded-lg border border-black/10 bg-white text-xs font-semibold">
              Copy UPI ID
            </button>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Digital Signature</h2>
            {invoice.clientSignature ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Signed</p>
                <p className="mt-1">Signed at: {invoice.signedAt ? new Date(invoice.signedAt).toLocaleString("en-IN") : "-"}</p>
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-xl border border-black/10 bg-white/70 p-3">
                  <canvas ref={canvasRef} className="w-full h-40 rounded-lg bg-white border border-black/10" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => signaturePadRef.current?.clear()} className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm">
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => void signAndAccept()}
                    disabled={signing}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-2"
                  >
                    {signing ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                    Sign and Accept
                  </button>
                </div>
              </>
            )}
          </div>
        </article>

        <article className="soft-card p-6 flex flex-wrap gap-2">
          <a href={pdfHref} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold inline-flex items-center gap-2">
            <Download size={14} /> Download PDF
          </a>

          <a href={waLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold inline-flex items-center gap-2">
            <MessageSquare size={14} /> Questions? Chat on WhatsApp
          </a>
        </article>
      </section>
    </main>
  );
}
