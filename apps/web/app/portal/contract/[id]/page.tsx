"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import toast from "react-hot-toast";
import { Download, Loader2, MessageSquare, PenLine } from "lucide-react";
import { buildWhatsAppLink } from "../../../../utils/whatsapp";

interface PublicContract {
  id: string;
  contractNumber: string;
  effectiveDate: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED" | "COMPLETED" | "CANCELLED";
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientBusiness: string;
  clientAddress: string;
  serviceType: string;
  projectScope?: string;
  projectTimeline?: string;
  advanceAmount?: number;
  totalAmount?: number;
  currencySymbol?: string;
  paymentTerms?: string;
  customClause?: string;
  adminSignature: string;
  clientSignature?: string;
  clientSignedAt?: string;
  portalTokens?: {
    view?: string;
    sign?: string;
    pdf?: string;
  };
}

function formatAmount(symbol: string, amount?: number): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildContractPreviewHTML(contract: PublicContract): string {
  const section12 = contract.customClause
    ? `<div class="section-heading">12. Additional Terms</div><div class="clause">${esc(contract.customClause)}</div>`
    : "";

  return `
    <style>
      .contract-wrap{font-family:Arial,sans-serif;color:#111;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb}
      .page-header{background:linear-gradient(135deg,#1a5fa8 0%,#2980d4 40%,#5ba3e0 70%,#a8d4f5 100%);padding:28px 34px 24px;display:flex;justify-content:space-between;gap:20px}
      .company-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.75)}
      .company-name{font-size:16px;font-weight:800;color:#fff;margin-top:2px}
      .company-sub{font-size:12px;color:rgba(255,255,255,.85)}
      .company-contact{font-size:12px;color:#fff;line-height:1.7;margin-top:8px}
      .logo-box{background:#0a0a0f;color:#fff;padding:10px 16px;font-size:18px;font-weight:900;border-radius:4px;height:fit-content}
      .recipient-row{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25);display:flex;justify-content:space-between;gap:14px}
      .recipient-label{font-size:12px;font-weight:700;color:rgba(255,255,255,.85)}
      .recipient-name{font-size:16px;color:#7ec8f0;font-weight:700}
      .recipient-address{font-size:12px;color:rgba(255,255,255,.9);text-align:right;max-width:60%}
      .header-divider{height:3px;background:linear-gradient(90deg,#1a5fa8,#5ba3e0,#fff)}
      .doc-body{padding:28px 34px}
      .doc-title{font-size:14px;font-weight:900;letter-spacing:.03em;text-transform:uppercase}
      .doc-subtitle{font-size:14px;margin-top:8px;padding-bottom:14px;border-bottom:2px solid #1a5fa8;margin-bottom:24px}
      .part-heading{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;margin:26px 0 12px;text-decoration:underline}
      .section-heading{font-size:13px;font-weight:700;margin:18px 0 10px}
      .clause,.clause-sub{font-size:13px;line-height:1.7;font-weight:700;margin-bottom:9px}
      .clause-sub{padding-left:20px}
      .service-box{background:#f0f7ff;border-left:4px solid #1a5fa8;padding:14px 16px;border-radius:0 6px 6px 0;margin:16px 0}
      .service-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(26,95,168,.12);font-size:13px}
      .service-row:last-child{border-bottom:none}
      .service-row span:first-child{color:#555;font-weight:600}
      .service-row span:last-child{font-weight:700;text-align:right}
      .signature-section{margin-top:30px;padding-top:20px;border-top:2px solid #1a5fa8}
      .sig-part-heading{font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
      .sig-text{font-size:13px;font-weight:700;line-height:1.7;margin-bottom:8px}
      .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}
      .sig-label{font-size:13px;font-weight:700;margin-bottom:8px}
      .sig-line-row{display:flex;align-items:flex-end;gap:10px}
      .sig-image{max-height:60px;max-width:220px;object-fit:contain;border-bottom:1.5px solid #111;padding-bottom:4px}
      .sig-underline{flex:1;height:60px;border-bottom:1.5px solid #111}
      .sig-date{font-size:13px;min-width:100px;border-bottom:1.5px solid #111;height:60px;display:flex;align-items:flex-end}
      @media(max-width:900px){.signature-grid{grid-template-columns:1fr}.recipient-row{flex-direction:column}.recipient-address{text-align:left;max-width:100%}}
    </style>

    <div class="contract-wrap">
      <div class="page-header">
        <div style="flex:1">
          <div class="company-label">Company Name</div>
          <div class="company-name">ZERO OPS</div>
          <div class="company-sub">Bangalore, Karnataka</div>
          <div class="company-contact">Phone: 97469 27368<br><strong>Email : Zerohub01@gmail.com</strong></div>

          <div class="recipient-row">
            <div>
              <div class="recipient-label">Name of the Recipient</div>
              <div class="recipient-name">${esc(contract.clientName)}</div>
            </div>
            <div class="recipient-address"><strong>Address:</strong> ${esc(contract.clientAddress)}</div>
          </div>
        </div>
        <div class="logo-box">ZERO</div>
      </div>
      <div class="header-divider"></div>

      <div class="doc-body">
        <div class="doc-title">ZERO OPS - SERVICE AGREEMENT & RECEIPT</div>
        <div class="doc-subtitle">Date: ${formatDate(contract.effectiveDate)} | Client: <strong>${esc(contract.clientName)}</strong></div>

        <div class="part-heading">PART I: TERMS AND CONDITIONS</div>

        <div class="section-heading">1. Financial Terms & Non-Refundable Advance</div>
        <div class="clause">1.1 To commence the development of the ${esc(contract.serviceType || "custom website and automation systems")}, the Client agrees to pay an initial advance amount.</div>
        <div class="clause-sub">1.2 This advance payment is strictly non-refundable. These funds are immediately dispersed to procure third-party infrastructure on the Client's behalf, specifically domain name registration and premium server hosting.</div>

        <div class="service-box">
          <div class="service-row"><span>Service</span><span>${esc(contract.serviceType || "-")}</span></div>
          <div class="service-row"><span>Scope</span><span>${esc(contract.projectScope || "-")}</span></div>
          <div class="service-row"><span>Advance Amount</span><span>${formatAmount(contract.currencySymbol || "\u20B9", contract.advanceAmount)}</span></div>
          <div class="service-row"><span>Total Project Value</span><span>${formatAmount(contract.currencySymbol || "\u20B9", contract.totalAmount)}</span></div>
          <div class="service-row"><span>Estimated Timeline</span><span>${esc(contract.projectTimeline || "4-6 weeks")}</span></div>
          <div class="service-row"><span>Payment Terms</span><span>${esc(contract.paymentTerms || "50% advance, 50% on delivery")}</span></div>
        </div>

        <div class="section-heading">2. Asset Ownership & Registration</div>
        <div class="clause">2.1 Upon successful deployment and receipt of all final payments, the Client shall retain 100% legal ownership of the website, domain name, hosting accounts, and automated workflows.</div>
        <div class="clause">2.2 All digital assets, domains, and hosting environments will be officially registered under the Client's name and business identity.</div>

        <div class="section-heading">3. Domain, Hosting, and Mandatory Renewals</div>
        <div class="clause">3.1 The initial project fee encompasses domain registration and premium server hosting for a period of exactly one (1) year from the Effective Date.</div>
        <div class="clause">3.2 To maintain platform security and operational integrity, all subsequent domain and hosting renewals after the first year must be processed exclusively through ZERO OPS.</div>

        <div class="section-heading">4. Annual Maintenance Contract (AMC) & Storage Limits</div>
        <div class="clause">4.1 First Year: ZERO OPS includes a complimentary Annual Maintenance Contract (AMC) for the first twelve (12) months following deployment.</div>
        <div class="clause">4.2 From the second year onwards, the Client must subscribe to an AMC plan to continue receiving security patches, uptime monitoring, and technical support. Plans are available on the ZERO OPS website.</div>
        <div class="clause">4.3 Storage is provisioned based on the selected hosting tier. Exceeding allocated storage limits will require an upgrade to the next hosting plan at the applicable rate.</div>

        <div class="section-heading">5. Intellectual Property & Code Ownership</div>
        <div class="clause">5.1 Upon receipt of full and final payment, all custom code, design assets, and automation workflows developed specifically for the Client are transferred to the Client's ownership.</div>
        <div class="clause">5.2 ZERO OPS retains the right to use non-identifying project elements as portfolio references unless explicitly agreed otherwise in writing.</div>

        <div class="section-heading">6. Project Delivery & Revisions</div>
        <div class="clause">6.1 ZERO OPS will deliver the agreed project scope within the estimated timeline communicated at project initiation. Timelines are subject to timely cooperation and content provision by the Client.</div>
        <div class="clause">6.2 The agreement includes one (1) round of structural revisions post-delivery. Additional revision rounds are billable at the standard hourly rate.</div>

        <div class="section-heading">7. Limitation of Liability</div>
        <div class="clause">7.1 ZERO OPS shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use the delivered systems.</div>
        <div class="clause">7.2 ZERO OPS total liability shall not exceed the total amount paid by the Client for the specific service giving rise to the claim.</div>

        <div class="section-heading">8. Security Infrastructure</div>
        <div class="clause">8.1 The Client's automation systems and digital storefront are deployed with rigorous, industry-standard security measures, including active antivirus protocols, secure routing, and vulnerability monitoring to prevent unauthorized external access.</div>

        <div class="section-heading">9. Artificial Intelligence (AI) Training Prohibition</div>
        <div class="clause">9.1 ZERO OPS rigorously protects Client business intelligence. Under no circumstances will any Client data, customer interactions, internal records, or database entries be utilized to train, fine-tune, or feed any Artificial Intelligence (AI) models. All Client data remains strictly isolated, secure, and proprietary.</div>

        <div class="section-heading">10. Client's Responsibility to End-Users (Data Controller Status)</div>
        <div class="clause">10.1 In the context of global data protection laws, the Client acts as the Data Controller and ZERO OPS acts solely as the Data Processor. 10.2 The Client is strictly responsible for obtaining all necessary legal consents from their own customers before capturing, storing, or automating their data through the provided systems.</div>

        <div class="section-heading">11. Information Collected About the Client</div>
        <div class="clause">11.1 ZERO OPS collects and retains strictly necessary corporate and billing information regarding the Client required to maintain the business relationship, execute this Agreement, and provide ongoing AMC support.</div>

        ${section12}

        <div class="signature-section">
          <div class="sig-part-heading">PART III: EXECUTION & SIGNATURES</div>
          <div class="sig-text">By signing below, both parties acknowledge that they have read, understood, and agree to be legally bound by all terms, conditions, and privacy policies outlined in this Agreement.</div>
          <div class="sig-part-heading" style="margin-top:10px">AGREEMENT</div>
          <div class="sig-text">By signing, the Client acknowledges the non-refundable advance and agrees to the terms above.</div>

          <div class="signature-grid">
            <div>
              <div class="sig-label">Client Signature:</div>
              <div class="sig-line-row">
                ${contract.clientSignature ? `<img class="sig-image" src="${contract.clientSignature}" alt="Client signature"/>` : `<div class="sig-underline"></div>`}
                <span style="font-size:13px;font-weight:700">Date:</span>
                <div class="sig-date">${contract.clientSignedAt ? formatDate(contract.clientSignedAt) : ""}</div>
              </div>
            </div>

            <div>
              <div class="sig-label">ZERO OPS Signature:</div>
              <div class="sig-line-row">
                <img class="sig-image" src="${contract.adminSignature}" alt="ZERO OPS signature"/>
                <span style="font-size:13px;font-weight:700">Date: ${formatDate(contract.effectiveDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default function PortalContractPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id ?? "";
  const viewToken = searchParams?.get("token") ?? "";

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedMessage, setSignedMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const fetchContract = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const tokenQuery = viewToken ? `?token=${encodeURIComponent(viewToken)}` : "";
      const response = await fetch(`/api/contracts/public/${id}${tokenQuery}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Contract fetch failed (${response.status})`);
      }
      const data = (await response.json()) as PublicContract;
      setContract(data);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load contract.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContract();
  }, [id, viewToken]);

  useEffect(() => {
    if (!canvasRef.current || !contract || contract.clientSignature) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = 180 * window.devicePixelRatio;
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    signaturePadRef.current = new SignaturePad(canvas, {
      minWidth: 0.8,
      maxWidth: 2.3,
      penColor: "#0f172a"
    });

    return () => {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
    };
  }, [contract]);

  const signAgreement = async () => {
    if (!contract) return;
    const pad = signaturePadRef.current;
    if (!pad || pad.isEmpty() || pad.toData().length === 0) {
      toast.error("Please draw your signature before submitting.");
      return;
    }
    if (!agreeChecked) {
      toast.error("Please accept the agreement terms first.");
      return;
    }

    setSigning(true);
    try {
      const signature = pad.toDataURL("image/png");
      const signToken = contract.portalTokens?.sign ?? "";
      if (!signToken) {
        throw new Error("This signing link is missing a valid access token.");
      }

      const response = await fetch(`/api/contracts/${contract.id}/sign?token=${encodeURIComponent(signToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          agreedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(String(data?.message || "Failed to sign agreement."));
      }

      const signedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      setSignedMessage(`Agreement signed successfully. A copy has been sent to ${contract.clientEmail}. Date: ${signedAt}`);
      toast.success("Agreement signed successfully.");
      await fetchContract();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to sign agreement.");
    } finally {
      setSigning(false);
    }
  };

  const whatsAppLink = useMemo(() => {
    if (!contract) return "";
    const phone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "918590464379";
    return buildWhatsAppLink(phone, `Hi ZERO OPS, I have a question regarding contract ${contract.contractNumber}.`);
  }, [contract]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  if (!contract) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="soft-card p-8 text-center text-sm text-[var(--muted)]">Contract not found.</div>
      </main>
    );
  }

  const alreadySigned = Boolean(contract.clientSignature && contract.clientSignedAt);
  const pdfToken = contract.portalTokens?.pdf ?? "";
  const pdfHref = pdfToken
    ? `/api/contracts/${contract.id}/pdf?token=${encodeURIComponent(pdfToken)}`
    : `/api/contracts/${contract.id}/pdf`;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <section className="max-w-5xl mx-auto space-y-5">
        <article className="soft-card p-3 md:p-4" dangerouslySetInnerHTML={{ __html: buildContractPreviewHTML(contract) }} />

        <article className="soft-card p-6">
          <div className="flex flex-wrap gap-2">
            <a href={pdfHref} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-black/10 bg-white text-sm font-semibold inline-flex items-center gap-2">
              <Download size={14} /> Download PDF Copy
            </a>
            <a href={whatsAppLink} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold inline-flex items-center gap-2">
              <MessageSquare size={14} /> Questions? Chat on WhatsApp
            </a>
          </div>
        </article>

        {alreadySigned ? (
          <article className="soft-card p-6 border border-emerald-200 bg-emerald-50/70">
            <h3 className="text-lg font-semibold text-emerald-800">This agreement is already signed.</h3>
            <p className="text-sm text-emerald-700 mt-2">
              Signed by {contract.clientName} on {new Date(contract.clientSignedAt || "").toLocaleString("en-IN")}.
            </p>
            {signedMessage ? <p className="text-sm text-emerald-700 mt-2">{signedMessage}</p> : null}
          </article>
        ) : (
          <article className="soft-card p-6">
            <h3 className="text-xl font-display text-[var(--ink)]">Sign This Agreement</h3>
            <p className="text-sm text-[var(--muted)] mt-2">By signing below you confirm you have read and agree to all terms above.</p>

            <div className="rounded-xl border border-black/10 bg-white/65 p-3 mt-4">
              <canvas ref={canvasRef} className="w-full h-44 rounded-lg bg-white border border-black/10" />
            </div>

            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => signaturePadRef.current?.clear()} className="px-3 py-2 rounded-lg border border-black/10 bg-white text-sm">
                Clear
              </button>
            </div>

            <label className="mt-4 inline-flex items-start gap-2 text-sm text-[var(--ink)]">
              <input type="checkbox" checked={agreeChecked} onChange={(event) => setAgreeChecked(event.target.checked)} className="mt-1" />
              <span>I have read and agree to all terms and conditions outlined in this agreement.</span>
            </label>

            <button
              type="button"
              onClick={() => void signAgreement()}
              disabled={signing || !agreeChecked}
              className="mt-4 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {signing ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
              Sign and Accept Agreement
            </button>

            {signedMessage ? <p className="text-sm text-emerald-700 mt-3">{signedMessage}</p> : null}
          </article>
        )}
      </section>
    </main>
  );
}
