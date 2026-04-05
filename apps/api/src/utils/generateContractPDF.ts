import puppeteer from "puppeteer";
import type { Contract } from "../db/schema.js";
import { generateSimplePdf } from "./simplePdf.js";
import { generateEmergencyPdf } from "./emergencyPdf.js";

export type ContractForPdf = Omit<Contract, "createdAt" | "updatedAt"> & {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAmount(amount: number, symbol: string): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

export function buildContractHTML(contract: ContractForPdf): string {
  const clientName = escapeHtml(contract.clientName || "");
  const clientAddress = escapeHtml(contract.clientAddress || "");
  const serviceType = escapeHtml(contract.serviceType || "Custom Website + Automation");
  const projectScope = escapeHtml(contract.projectScope || "");
  const customClause = escapeHtml(contract.customClause || "");
  const paymentTerms = escapeHtml(contract.paymentTerms || "50% advance, 50% on delivery");
  const projectTimeline = escapeHtml(contract.projectTimeline || "4-6 weeks");
  const adminSignature = escapeHtml(contract.adminSignature || "");
  const clientSignature = escapeHtml(contract.clientSignature || "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Contract ${escapeHtml(contract.contractNumber)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'Arial', sans-serif;
    font-size: 13px;
    color: #111;
    background: #fff;
  }

  .page-header {
    background: linear-gradient(
      135deg,
      #1a5fa8 0%,
      #2980d4 40%,
      #5ba3e0 70%,
      #a8d4f5 100%
    );
    padding: 32px 48px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    min-height: 120px;
  }

  .page-header::after {
    content: '';
    position: absolute;
    bottom: -1px;
    right: 0;
    width: 60%;
    height: 100%;
    background: #fff;
    clip-path: ellipse(100% 100% at 100% 100%);
    opacity: 0.08;
  }

  .header-left {
    flex: 1;
  }

  .header-company-row {
    display: flex;
    gap: 48px;
    align-items: flex-start;
  }

  .company-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.7);
    margin-bottom: 4px;
    letter-spacing: 0.05em;
  }

  .company-name {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.4;
  }

  .company-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    line-height: 1.6;
  }

  .company-contact {
    font-size: 12px;
    color: #fff;
    line-height: 1.8;
  }

  .company-contact strong {
    font-weight: 700;
  }

  .logo-box {
    background: #0a0a0f;
    color: #fff;
    padding: 12px 18px;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -1px;
    border-radius: 4px;
    flex-shrink: 0;
    align-self: flex-start;
    font-family: 'Arial Black', sans-serif;
  }

  .recipient-row {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.2);
    gap: 20px;
  }

  .recipient-label {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255,255,255,0.8);
    margin-bottom: 4px;
  }

  .recipient-name {
    font-size: 16px;
    font-weight: 700;
    color: #7ec8f0;
  }

  .recipient-address {
    font-size: 12px;
    color: rgba(255,255,255,0.85);
    line-height: 1.6;
    text-align: right;
    max-width: 52%;
  }

  .recipient-address strong {
    font-weight: 700;
    color: #fff;
  }

  .header-divider {
    height: 3px;
    background: linear-gradient(90deg, #1a5fa8, #5ba3e0, #fff);
  }

  .doc-body {
    padding: 40px 48px;
  }

  .doc-title {
    font-size: 14px;
    font-weight: 900;
    color: #111;
    letter-spacing: 0.03em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }

  .doc-subtitle {
    font-size: 14px;
    color: #111;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 2px solid #1a5fa8;
  }

  .doc-subtitle strong {
    font-size: 16px;
    font-weight: 700;
  }

  .part-heading {
    font-size: 13px;
    font-weight: 900;
    color: #111;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 32px 0 16px;
    text-decoration: underline;
  }

  .section-heading {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    margin: 24px 0 12px;
  }

  .clause {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    margin-bottom: 10px;
    line-height: 1.7;
  }

  .clause-sub {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    margin-bottom: 10px;
    padding-left: 20px;
    line-height: 1.7;
  }

  .service-box {
    background: #f0f7ff;
    border-left: 4px solid #1a5fa8;
    padding: 16px 20px;
    margin: 20px 0;
    border-radius: 0 6px 6px 0;
  }

  .service-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(26,95,168,0.1);
    font-size: 13px;
    gap: 12px;
  }

  .service-row:last-child { border-bottom: none; }

  .service-row span:first-child {
    color: #555;
    font-weight: 600;
  }

  .service-row span:last-child {
    font-weight: 700;
    color: #111;
    text-align: right;
  }

  .signature-section {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 2px solid #1a5fa8;
  }

  .sig-part-heading {
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
  }

  .sig-agreement-text {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    line-height: 1.7;
    margin-bottom: 8px;
  }

  .sig-sub-text {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    margin-bottom: 32px;
    line-height: 1.6;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 24px;
  }

  .sig-label {
    font-size: 13px;
    font-weight: 700;
    color: #111;
    margin-bottom: 8px;
  }

  .sig-line-row {
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }

  .sig-underline {
    flex: 1;
    border-bottom: 1.5px solid #111;
    height: 60px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 4px;
  }

  .sig-image {
    max-height: 60px;
    max-width: 200px;
    object-fit: contain;
    border-bottom: 1.5px solid #111;
    padding-bottom: 4px;
  }

  .sig-date-label {
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .sig-date-value {
    font-size: 13px;
    font-weight: 400;
    min-width: 100px;
    border-bottom: 1.5px solid #111;
    padding-bottom: 4px;
    height: 60px;
    display: flex;
    align-items: flex-end;
  }

  .admin-sig-image {
    max-height: 70px;
    max-width: 220px;
    object-fit: contain;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>

<div class="page-header">
  <div class="header-left">
    <div class="header-company-row">
      <div class="company-name-block">
        <div class="company-label">Company Name</div>
        <div class="company-name">ZERO OPS</div>
        <div class="company-sub">Bangalore, Karnataka</div>
      </div>
      <div class="company-contact">
        <div>Phone: &nbsp;97469 27368</div>
        <div><strong>Email : Zerohub01@gmail.com</strong></div>
      </div>
    </div>

    <div class="recipient-row">
      <div>
        <div class="recipient-label">Name of the Recipient</div>
        <div class="recipient-name">${clientName}</div>
      </div>
      <div class="recipient-address">
        <strong>Address:</strong> ${clientAddress}
      </div>
    </div>
  </div>

  <div class="logo-box">ZERO</div>
</div>

<div class="header-divider"></div>

<div class="doc-body">
  <div class="doc-title">ZERO OPS - SERVICE AGREEMENT &amp; RECEIPT</div>
  <div class="doc-subtitle">
    Date: ${formatDate(contract.effectiveDate)} &nbsp;|&nbsp;
    Client: <strong>${clientName}</strong>
  </div>

  <div class="part-heading">PART I: TERMS AND CONDITIONS</div>

  <div class="section-heading">
    1. Financial Terms &amp; Non-Refundable Advance
  </div>
  <div class="clause">
    1.1 To commence the development of the ${serviceType},
    the Client agrees to pay an initial advance amount.
  </div>
  <div class="clause-sub">
    1.2 This advance payment is strictly non-refundable.
    These funds are immediately dispersed to procure
    third-party infrastructure on the Client's behalf,
    specifically domain name registration and premium
    server hosting.
  </div>

  ${(contract.advanceAmount || contract.totalAmount || contract.projectScope || contract.projectTimeline || contract.paymentTerms)
    ? `
  <div class="service-box">
    <div class="service-row">
      <span>Service</span>
      <span>${serviceType}</span>
    </div>
    ${projectScope
      ? `<div class="service-row"><span>Scope</span><span>${projectScope}</span></div>`
      : ""}
    ${contract.advanceAmount
      ? `<div class="service-row"><span>Advance Amount</span><span>${formatAmount(contract.advanceAmount, contract.currencySymbol || "\u20B9")}</span></div>`
      : ""}
    ${contract.totalAmount
      ? `<div class="service-row"><span>Total Project Value</span><span>${formatAmount(contract.totalAmount, contract.currencySymbol || "\u20B9")}</span></div>`
      : ""}
    ${projectTimeline
      ? `<div class="service-row"><span>Estimated Timeline</span><span>${projectTimeline}</span></div>`
      : ""}
    ${paymentTerms
      ? `<div class="service-row"><span>Payment Terms</span><span>${paymentTerms}</span></div>`
      : ""}
  </div>`
    : ""}

  <div class="section-heading">
    2. Asset Ownership &amp; Registration
  </div>
  <div class="clause">
    2.1 Upon successful deployment and receipt of all
    final payments, the Client shall retain 100% legal
    ownership of the website, domain name, hosting
    accounts, and automated workflows.
  </div>
  <div class="clause">
    2.2 All digital assets, domains, and hosting
    environments will be officially registered under
    the Client's name and business identity.
  </div>

  <div class="section-heading">
    3. Domain, Hosting, and Mandatory Renewals
  </div>
  <div class="clause">
    3.1 The initial project fee encompasses domain
    registration and premium server hosting for a period
    of exactly one (1) year from the Effective Date.
  </div>
  <div class="clause">
    3.2 To maintain platform security and operational
    integrity, all subsequent domain and hosting renewals
    after the first year must be processed exclusively
    through ZERO OPS.
  </div>

  <div class="section-heading">
    4. Annual Maintenance Contract (AMC) &amp; Storage Limits
  </div>
  <div class="clause">
    4.1 First Year: ZERO OPS includes a complimentary
    Annual Maintenance Contract (AMC) for the first
    twelve (12) months following deployment.
  </div>
  <div class="clause">
    4.2 From the second year onwards, the Client must
    subscribe to an AMC plan to continue receiving
    security patches, uptime monitoring, and technical
    support. Plans are available on the ZERO OPS website.
  </div>
  <div class="clause">
    4.3 Storage is provisioned based on the selected
    hosting tier. Exceeding allocated storage limits
    will require an upgrade to the next hosting plan
    at the applicable rate.
  </div>

  <div class="section-heading">
    5. Intellectual Property &amp; Code Ownership
  </div>
  <div class="clause">
    5.1 Upon receipt of full and final payment, all
    custom code, design assets, and automation workflows
    developed specifically for the Client are transferred
    to the Client's ownership.
  </div>
  <div class="clause">
    5.2 ZERO OPS retains the right to use
    non-identifying project elements as portfolio
    references unless explicitly agreed otherwise
    in writing.
  </div>

  <div class="section-heading">
    6. Project Delivery &amp; Revisions
  </div>
  <div class="clause">
    6.1 ZERO OPS will deliver the agreed project scope
    within the estimated timeline communicated at project
    initiation. Timelines are subject to timely
    cooperation and content provision by the Client.
  </div>
  <div class="clause">
    6.2 The agreement includes one (1) round of
    structural revisions post-delivery. Additional
    revision rounds are billable at the standard
    hourly rate.
  </div>

  <div class="section-heading">
    7. Limitation of Liability
  </div>
  <div class="clause">
    7.1 ZERO OPS shall not be liable for any indirect,
    incidental, or consequential damages arising from
    the use or inability to use the delivered systems.
  </div>
  <div class="clause">
    7.2 ZERO OPS total liability shall not exceed the
    total amount paid by the Client for the specific
    service giving rise to the claim.
  </div>

  <div class="section-heading">8. Security Infrastructure</div>
  <div class="clause">
    8.1 The Client's automation systems and digital
    storefront are deployed with rigorous,
    industry-standard security measures, including
    active antivirus protocols, secure routing, and
    vulnerability monitoring to prevent unauthorized
    external access.
  </div>

  <div class="section-heading">
    9. Artificial Intelligence (AI) Training Prohibition
  </div>
  <div class="clause">
    9.1 ZERO OPS rigorously protects Client business
    intelligence. Under no circumstances will any Client
    data, customer interactions, internal records, or
    database entries be utilized to train, fine-tune,
    or feed any Artificial Intelligence (AI) models.
    All Client data remains strictly isolated, secure,
    and proprietary.
  </div>

  <div class="section-heading">
    10. Client's Responsibility to End-Users
    (Data Controller Status)
  </div>
  <div class="clause">
    10.1 In the context of global data protection laws,
    the Client acts as the "Data Controller" and ZERO OPS
    acts solely as the "Data Processor." 10.2 The Client
    is strictly responsible for obtaining all necessary
    legal consents from their own customers before
    capturing, storing, or automating their data through
    the provided systems. ZERO OPS assumes no liability
    for the Client's failure to maintain a lawful privacy
    policy on their own digital storefront or properly
    manage end-user consent.
  </div>

  <div class="section-heading">
    11. Information Collected About the Client
  </div>
  <div class="clause">
    11.1 ZERO OPS collects and retains strictly necessary
    corporate and billing information regarding the Client
    (e.g., contact names, business addresses, email
    communication, and payment records) required to
    maintain the business relationship, execute this
    Agreement, and provide ongoing AMC support.
  </div>

  ${customClause
    ? `<div class="section-heading">12. Additional Terms</div><div class="clause">${customClause}</div>`
    : ""}

  <div class="signature-section">
    <div class="sig-part-heading">
      PART III: EXECUTION &amp; SIGNATURES
    </div>
    <div class="sig-agreement-text">
      By signing below, both parties acknowledge that
      they have read, understood, and agree to be legally
      bound by all terms, conditions, and privacy policies
      outlined in this Agreement.
    </div>

    <br>

    <div class="sig-part-heading">AGREEMENT</div>
    <div class="sig-sub-text">
      By signing, the Client acknowledges the
      non-refundable advance and agrees to the terms above.
    </div>

    <div class="signature-grid">
      <div class="sig-block">
        <div class="sig-label">Client Signature:</div>
        <div class="sig-line-row">
          ${clientSignature
            ? `<img src="${clientSignature}" class="sig-image" alt="Client signature">`
            : `<div class="sig-underline"></div>`
          }
          &nbsp;&nbsp;
          <span class="sig-date-label">Date:</span>
          <div class="sig-date-value">
            ${contract.clientSignedAt ? formatDate(contract.clientSignedAt) : ""}
          </div>
        </div>
      </div>

      <div class="sig-block">
        <div class="sig-label">ZERO OPS Signature:</div>
        <div class="sig-line-row">
          <img src="${adminSignature}" class="admin-sig-image" alt="ZERO OPS signature">
          &nbsp;&nbsp;
          <span class="sig-date-label">Date:${formatDate(contract.adminSignedAt)}</span>
        </div>
      </div>

    </div>
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

export async function generateContractPDF(contract: ContractForPdf): Promise<Buffer> {
  try {
    const browser = await launchPdfBrowser();
    try {
    const page = await browser.newPage();
    await page.setContent(buildContractHTML(contract), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "20mm",
        left: "0"
      }
    });
    return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("[PDF] Contract styled PDF generation failed. Falling back to simplified PDF.", error);
    try {
      return await generateSimplePdf({
        title: "ZERO OPS - Service Agreement",
        subtitle: contract.contractNumber || "",
        rows: [
          { label: "Contract Number", value: contract.contractNumber || "-" },
          { label: "Client Name", value: contract.clientName || "-" },
          { label: "Client Email", value: contract.clientEmail || "-" },
          { label: "Client Phone", value: contract.clientPhone || "-" },
          { label: "Service Type", value: contract.serviceType || "-" },
          { label: "Project Scope", value: contract.projectScope || "-" },
          { label: "Effective Date", value: formatDate(contract.effectiveDate) || "-" },
          { label: "Advance Amount", value: formatAmount(Number(contract.advanceAmount || 0), contract.currencySymbol || "\u20B9") },
          { label: "Total Amount", value: formatAmount(Number(contract.totalAmount || 0), contract.currencySymbol || "\u20B9") },
          { label: "Payment Terms", value: contract.paymentTerms || "-" },
          { label: "Client Signed At", value: formatDate(contract.clientSignedAt) || "-" }
        ],
        footerNote:
          "This is a simplified fallback PDF because the high-fidelity renderer is temporarily unavailable."
      });
    } catch (fallbackError) {
      console.error("[PDF] Contract simplified fallback failed. Using emergency PDF.", fallbackError);
      return generateEmergencyPdf("ZERO OPS - Service Agreement", [
        `Contract Number: ${contract.contractNumber || "-"}`,
        `Client Name: ${contract.clientName || "-"}`,
        `Client Email: ${contract.clientEmail || "-"}`,
        `Client Phone: ${contract.clientPhone || "-"}`,
        `Service Type: ${contract.serviceType || "-"}`,
        `Effective Date: ${formatDate(contract.effectiveDate) || "-"}`,
        `Total Amount: ${formatAmount(Number(contract.totalAmount || 0), contract.currencySymbol || "\u20B9")}`,
        `Payment Terms: ${contract.paymentTerms || "-"}`
      ]);
    }
  }
}
