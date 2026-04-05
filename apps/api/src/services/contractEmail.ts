import { Resend } from "resend";
import { env } from "../config/env.js";
import type { ContractForPdf } from "../utils/generateContractPDF.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

function getWebBase(): string {
  const direct = process.env.NEXT_PUBLIC_WEB_URL ?? process.env.WEB_URL ?? env.clientOrigin;
  return (direct || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendContractEmail(
  contract: ContractForPdf,
  pdfBuffer?: Buffer,
  portalLink = `${getWebBase()}/portal/contract/${contract.id}`
): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY missing: skipping contract email send.");
    return false;
  }

  await resend.emails.send({
    from: process.env.CONTRACT_EMAIL_FROM || "ZeroOps <contracts@zeroops.in>",
    to: contract.clientEmail,
    subject: "Service Agreement from ZERO OPS - Please Review and Sign",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#1a5fa8,#2980d4,#5ba3e0);padding:32px 40px;border-radius:8px 8px 0 0">
          <table width="100%">
            <tr>
              <td>
                <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:4px">Company Name</div>
                <div style="font-size:16px;font-weight:900;color:#fff">ZERO OPS</div>
                <div style="font-size:12px;color:rgba(255,255,255,0.8)">Bangalore, Karnataka</div>
              </td>
              <td align="right">
                <div style="background:#0a0a0f;color:#fff;padding:10px 16px;font-size:18px;font-weight:900;border-radius:4px;display:inline-block">ZERO</div>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:40px;border:1px solid #eee;border-top:none">
          <p style="font-size:16px;font-weight:700;color:#111;margin:0 0 8px">
            Dear ${contract.clientName},
          </p>
          <p style="color:#555;line-height:1.8;margin:0 0 24px;font-size:13px">
            Please find your Service Agreement attached to this email.
            Kindly review all terms carefully and sign the document
            using the button below.
          </p>

          <div style="background:#f0f7ff;border-left:4px solid #1a5fa8;padding:16px 20px;margin-bottom:28px;border-radius:0 6px 6px 0">
            <p style="font-size:11px;font-weight:700;color:#1a5fa8;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px">
              Agreement Summary
            </p>
            <table width="100%" style="font-size:12px">
              <tr>
                <td style="color:#666;padding:4px 0">Contract No.</td>
                <td align="right" style="font-weight:700;color:#111">${contract.contractNumber}</td>
              </tr>
              <tr>
                <td style="color:#666;padding:4px 0">Service</td>
                <td align="right" style="font-weight:700;color:#111">${contract.serviceType}</td>
              </tr>
              ${contract.advanceAmount
                ? `<tr><td style="color:#666;padding:4px 0">Advance Amount</td><td align="right" style="font-weight:700;color:#111">${contract.currencySymbol}${Number(contract.advanceAmount || 0).toLocaleString("en-IN")}</td></tr>`
                : ""}
              <tr>
                <td style="color:#666;padding:4px 0">Date</td>
                <td align="right" style="font-weight:700;color:#111">${new Date(contract.effectiveDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align:center;margin-bottom:32px">
            <a href="${portalLink}"
               style="display:inline-block;background:#1a5fa8;color:#fff;padding:14px 40px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.02em">
              Review and Sign Agreement ->
            </a>
            <p style="font-size:11px;color:#aaa;margin:10px 0 0">
              ${
                pdfBuffer
                  ? "The PDF is also attached for your records."
                  : "You can access the latest agreement from the review link above."
              }
            </p>
          </div>

          <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px;margin:0;line-height:1.8">
            Questions about this agreement?<br>
            Email: zerohub01@gmail.com | WhatsApp: +91 97469 27368
          </p>
        </div>

        <div style="background:#1a5fa8;padding:16px 40px;border-radius:0 0 8px 8px;text-align:center">
          <p style="font-size:11px;color:rgba(255,255,255,0.7);margin:0">
            ZERO OPS - Bangalore, Karnataka - zerohub01@gmail.com
          </p>
        </div>
      </div>
    `,
    ...(pdfBuffer
      ? {
          attachments: [
            {
              filename: `${contract.contractNumber}.pdf`,
              content: pdfBuffer.toString("base64")
            }
          ]
        }
      : {})
  });

  return true;
}

export async function sendContractSignedNotifications(contract: ContractForPdf, pdfBuffer?: Buffer): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY missing: skipping signed contract notifications.");
    return false;
  }

  const signedAt = contract.clientSignedAt ? new Date(contract.clientSignedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

  const clientHtml = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 28px">
      <h2 style="margin:0 0 10px;color:#111">Agreement signed successfully</h2>
      <p style="margin:0 0 14px;color:#4b5563">Your agreement <strong>${contract.contractNumber}</strong> has been signed and recorded.</p>
      <p style="margin:8px 0 0;color:#4b5563">Signed at: ${signedAt}</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px 28px">
      <h2 style="margin:0 0 10px;color:#111">Client signed contract</h2>
      <p style="margin:0 0 14px;color:#4b5563"><strong>${contract.clientName}</strong> has signed contract <strong>${contract.contractNumber}</strong>.</p>
      <p style="margin:8px 0 0;color:#4b5563">Signed at: ${signedAt}</p>
    </div>
  `;

  await Promise.all([
    resend.emails.send({
      from: process.env.CONTRACT_EMAIL_FROM || "ZeroOps <contracts@zeroops.in>",
      to: contract.clientEmail,
      subject: `Signed Agreement Copy - ${contract.contractNumber}`,
      html: clientHtml,
      ...(pdfBuffer
        ? {
            attachments: [
              {
                filename: `${contract.contractNumber}-signed.pdf`,
                content: pdfBuffer.toString("base64")
              }
            ]
          }
        : {})
    }),
    resend.emails.send({
      from: process.env.CONTRACT_EMAIL_FROM || "ZeroOps <contracts@zeroops.in>",
      to: env.adminNotifyEmail,
      subject: `Client signed contract ${contract.contractNumber}`,
      html: adminHtml,
      ...(pdfBuffer
        ? {
            attachments: [
              {
                filename: `${contract.contractNumber}-signed.pdf`,
                content: pdfBuffer.toString("base64")
              }
            ]
          }
        : {})
    })
  ]);

  return true;
}
