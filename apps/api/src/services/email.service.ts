import { Resend } from "resend";
import { env } from "../config/env.js";
import { escapeHtml } from "../utils/sanitize.js";
import { LeadScore } from "../models/Booking.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

const FROM = env.emailFrom;
const PORTAL_URL = "https://zeroops.in/client-dashboard";

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZERO</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px;background:#0d1117;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;border-radius:14px;overflow:hidden;background:#111827;border:1px solid #1f2937;">
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #1f2937;background:linear-gradient(140deg,#111827,#0f172a);">
              <span style="display:inline-block;background:#ffffff;color:#0f172a;font-weight:900;padding:6px 12px;border-radius:8px;letter-spacing:0.4px;">ZERO</span>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px;">${content}</td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #1f2937;color:#64748b;font-size:12px;">
              ZERO automated lead notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(title: string, subtitle?: string) {
  return `
    <h1 style="margin:0 0 8px;color:#f8fafc;font-size:24px;line-height:1.3;">${title}</h1>
    ${subtitle ? `<p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.6;">${subtitle}</p>` : ""}
  `;
}

function infoRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1f2937;">
        <div style="color:#64748b;font-size:12px;">${label}</div>
        <div style="color:#e2e8f0;font-size:14px;font-weight:600;margin-top:2px;">${value}</div>
      </td>
    </tr>
  `;
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:22px;padding:12px 20px;border-radius:10px;background:#f8fafc;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;">${text}</a>`;
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]) {
  if (!resend) {
    console.error("Email Error: Resend is not configured (missing API key)");
    return;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((file) => ({
        filename: file.filename,
        content: file.content
      }))
    });
    if (result.error) {
      console.error(`Email delivery failed to ${to}:`, result.error);
    } else {
      console.log(`Email sent to ${to}. ID: ${result.data?.id}`);
    }
  } catch (err) {
    console.error(`Email crash while sending to ${to}:`, err);
  }
}

export async function sendVerificationEmail(to: string, otpCode: string) {
  await sendEmail(
    to,
    "Your ZERO verification code",
    layout(`
      ${heading("Verify your account", "Enter this code to complete your sign-up.")}
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;text-align:center;">
        <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;">Code</p>
        <p style="margin:12px 0 0;color:#f8fafc;font-size:36px;letter-spacing:8px;font-weight:900;font-family:'Courier New',monospace;">${escapeHtml(
          otpCode
        )}</p>
      </div>
    `)
  );
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(
    to,
    "Welcome to ZERO",
    layout(`
      ${heading(`Welcome, ${escapeHtml(name)}`, "Your client portal is now ready.")}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        You can now track projects, milestones, and updates in one place.
      </p>
      ${btn("Open Client Portal", PORTAL_URL)}
    `)
  );
}

export async function sendBookingCreatedEmails(params: {
  customerEmail: string;
  customerName: string;
  service: string;
  bookingId: string;
  message: string;
  businessType: string;
  phone: string;
  budget?: number | null;
  score: LeadScore;
  trackingUrl: string;
  adminUrl: string;
  ipAddress: string;
}) {
  const customerName = escapeHtml(params.customerName);
  const customerEmail = escapeHtml(params.customerEmail);
  const service = escapeHtml(params.service);
  const bookingId = escapeHtml(params.bookingId);
  const message = escapeHtml(params.message);
  const businessType = escapeHtml(params.businessType);
  const phone = escapeHtml(params.phone);
  const budget =
    typeof params.budget === "number" ? `INR ${params.budget.toLocaleString()}` : "Not provided";
  const score = escapeHtml(params.score.toUpperCase());
  const trackingUrl = escapeHtml(params.trackingUrl);
  const adminUrl = escapeHtml(params.adminUrl);
  const ipAddress = escapeHtml(params.ipAddress || "Unknown");

  await Promise.all([
    sendEmail(
      params.customerEmail,
      "Your request has been received",
      layout(`
        ${heading("Request received", "Thank you for contacting ZERO.")}
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
          ${infoRow("Lead ID", bookingId)}
          ${infoRow("Service", service)}
          ${infoRow("Status", "New")}
        </table>
        <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;">
          Your request has been received. We will contact you soon.
        </p>
        ${btn("Track Status", trackingUrl)}
      `)
    ),
    sendEmail(
      env.adminNotifyEmail,
      "New lead received",
      layout(`
        ${heading("New lead received", "A new public lead entered the automation pipeline.")}
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
          ${infoRow("Lead ID", bookingId)}
          ${infoRow("Name", customerName)}
          ${infoRow("Email", customerEmail)}
          ${infoRow("Phone", phone)}
          ${infoRow("Business Type", businessType)}
          ${infoRow("Service", service)}
          ${infoRow("Budget", budget)}
          ${infoRow("Lead Score", score)}
          ${infoRow("Message", message)}
          ${infoRow("IP Address", ipAddress)}
        </table>
        ${btn("Open Admin Dashboard", adminUrl)}
      `)
    )
  ]);
}

export async function sendProposalEmail(params: {
  customerEmail: string;
  customerName: string;
  service: string;
  bookingId: string;
  proposalUrl: string;
}) {
  await sendEmail(
    params.customerEmail,
    "Here is your proposal",
    layout(`
      ${heading("Your ZERO proposal is ready", `Hi ${escapeHtml(params.customerName)}, here is your proposal.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
        ${infoRow("Service", escapeHtml(params.service))}
      </table>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        Review the proposal and reply if you want us to proceed with implementation.
      </p>
      ${btn("View Proposal", escapeHtml(params.proposalUrl))}
    `)
  );
}

export async function sendClientCredentialsEmail(params: {
  customerEmail: string;
  customerName: string;
  plainPassword: string;
}) {
  await sendEmail(
    params.customerEmail,
    "Your client portal credentials",
    layout(`
      ${heading("Client portal access enabled", `Hi ${escapeHtml(params.customerName)}, your account is ready.`)}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        Your lead was converted to a client account. Use the credentials below to sign in.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Login URL", "https://zeroops.in/client-login")}
        ${infoRow("Email", escapeHtml(params.customerEmail))}
        ${infoRow("Temporary Password", escapeHtml(params.plainPassword))}
      </table>
      <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;">
        Please change your password after first login.
      </p>
    `)
  );
}

export async function sendLeadFollowUpEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
}) {
  await sendEmail(
    params.customerEmail,
    "Just checking if you're still interested",
    layout(`
      ${heading("Quick follow-up", `Hi ${escapeHtml(params.customerName)}, we wanted to check in.`)}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        Just checking if you're still interested in moving forward with your ZERO request.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
      </table>
    `)
  );
}

export async function sendLeadDayOneFollowUpEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
}) {
  await sendEmail(
    params.customerEmail,
    "Quick follow-up from ZERO",
    layout(`
      ${heading("Day 1 follow-up", `Hi ${escapeHtml(params.customerName)}, we're checking in.`)}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        We wanted to see if you had any questions before we proceed further.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
      </table>
    `)
  );
}

export async function sendLeadFinalReminderEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
}) {
  await sendEmail(
    params.customerEmail,
    "Final reminder from ZERO",
    layout(`
      ${heading("Final reminder", `Hi ${escapeHtml(params.customerName)}, this is our final check-in.`)}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        If you're still interested, simply reply to this email and we'll prioritize your project.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
      </table>
      ${btn("Open Client Portal", PORTAL_URL)}
    `)
  );
}

export async function sendBookingStatusEmail(params: {
  customerEmail: string;
  customerName: string;
  status: "contacted" | "converted";
  service: string;
  bookingId: string;
}) {
  const isContacted = params.status === "contacted";
  const subject = isContacted ? "Lead Update: Contacted" : "Lead Update: Converted";
  const title = isContacted ? "We have contacted you" : "Lead marked as converted";
  const subtitle = isContacted
    ? "Our team has reviewed your request and reached out."
    : "Great news. Your lead has moved to converted status.";

  await sendEmail(
    params.customerEmail,
    subject,
    layout(`
      ${heading(title, subtitle)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
        ${infoRow("Service", escapeHtml(params.service))}
        ${infoRow("Client", escapeHtml(params.customerName))}
        ${infoRow("Status", isContacted ? "Contacted" : "Converted")}
      </table>
    `)
  );
}

export async function sendBookingFeeQuoteEmail(params: {
  customerEmail: string;
  customerName: string;
  bookingId: string;
  service: string;
  quotedFee: number;
}) {
  const quotedFee = `INR ${params.quotedFee.toLocaleString()}`;

  await sendEmail(
    params.customerEmail,
    "Your project fee estimate from ZERO",
    layout(`
      ${heading("Project fee estimate ready", `Hi ${escapeHtml(params.customerName)}, we reviewed your request.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Lead ID", escapeHtml(params.bookingId))}
        ${infoRow("Service", escapeHtml(params.service))}
        ${infoRow("Estimated Fee", escapeHtml(quotedFee))}
      </table>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        Reply to this email or contact us on WhatsApp to confirm next steps.
      </p>
      ${btn("Open Client Portal", PORTAL_URL)}
    `)
  );
}

export async function sendCallBookingConfirmationEmail(params: {
  customerEmail: string;
  customerName: string;
  timeSlot: Date;
}) {
  await sendEmail(
    params.customerEmail,
    "Your ZERO call is booked",
    layout(`
      ${heading("Call confirmed", `Hi ${escapeHtml(params.customerName)}, your call is scheduled.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Time Slot", escapeHtml(params.timeSlot.toLocaleString()))}
      </table>
      <p style="margin:18px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        We will email you a reminder before the call.
      </p>
    `)
  );
}

export async function sendCallReminderEmail(params: {
  customerEmail: string;
  customerName: string;
  timeSlot: Date;
}) {
  await sendEmail(
    params.customerEmail,
    "Reminder: Your ZERO call is coming up",
    layout(`
      ${heading("Call reminder", `Hi ${escapeHtml(params.customerName)}, your ZERO call is coming up soon.`)}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
        ${infoRow("Time Slot", escapeHtml(params.timeSlot.toLocaleString()))}
      </table>
    `)
  );
}

const MILESTONE_META: Record<string, { headline: string; body: string }> = {
  planning: {
    headline: "Planning phase started",
    body: "We are defining project scope and milestones."
  },
  development: {
    headline: "Development started",
    body: "Build work has started on your project."
  },
  review: {
    headline: "Ready for review",
    body: "A build cycle is complete and under review."
  },
  launch: {
    headline: "Launch in progress",
    body: "Deployment and final checks are underway."
  },
  completed: {
    headline: "Project completed",
    body: "Your project is complete and deliverables are available."
  }
};

export async function sendMilestoneUpdateEmail(params: {
  customerEmail: string;
  customerName: string;
  milestoneTitle: string;
  status: "PENDING" | "DONE";
}) {
  if (params.status !== "DONE") return;

  const key = params.milestoneTitle.toLowerCase();
  const meta = Object.entries(MILESTONE_META).find(([candidate]) => key.includes(candidate))?.[1] ?? {
    headline: `Milestone updated: ${params.milestoneTitle}`,
    body: `The milestone "${params.milestoneTitle}" has been marked as complete.`
  };

  await sendEmail(
    params.customerEmail,
    `ZERO Update: ${meta.headline}`,
    layout(`
      ${heading(meta.headline, `Hi ${escapeHtml(params.customerName)}, here is your latest update.`)}
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">
        ${escapeHtml(meta.body)}
      </p>
      ${btn("Open Client Portal", PORTAL_URL)}
    `)
  );
}
