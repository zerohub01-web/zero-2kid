"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { trackEvent } from "../../lib/analytics";
import { buildAdminPing, buildWhatsAppLink } from "../../utils/whatsapp";

type BookingFormValues = {
  name: string;
  email: string;
  phone: string;
  businessType: string;
  service: string;
  teamSize: string;
  budget: string;
  message: string;
  website: string;
};

type FieldKey = keyof BookingFormValues;
type FieldErrors = Partial<Record<FieldKey, string>>;

const fallbackServices = [
  "Basic website package",
  "Business automation package",
  "Advanced web + automation package",
  "Full system (website + automation + dashboard)",
  "Digital Marketing Growth Ops Package",
  "Search engine growth (SEO + local rank)",
  "Paid advertising (Google + Meta ads)",
  "Social media content and authority",
  "Marketing analytics and reporting dashboard",
  "AI chatbot + WhatsApp automation"
];
const LEAD_MEMORY_KEY = "zero_lead_memory";
const SYMBOLS = {
  check: "\u2705",
  rocket: "\uD83D\uDE80",
  bell: "\uD83D\uDD14",
  phone: "\uD83D\uDCF1",
  email: "\uD83D\uDCE7",
  tools: "\uD83D\uDEE0",
  line: "\u2501".repeat(15)
} as const;

function validateForm(values: BookingFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Please enter your full name.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (values.phone.replace(/[^\d]/g, "").length < 7) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (values.businessType.trim().length < 2) {
    errors.businessType = "Please add your business type.";
  }

  if (values.service.trim().length < 2) {
    errors.service = "Please select a service.";
  }

  if (values.teamSize.trim().length < 1) {
    errors.teamSize = "Please share your team size.";
  }

  if (values.message.trim().length < 5) {
    errors.message = "Please share a few details about your request.";
  }

  return errors;
}

function extractFieldErrors(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];

  const errors: string[] = [];
  const source = data as {
    details?: unknown;
    errors?:
      | Array<{ message?: unknown }>
      | {
          fieldErrors?: Record<string, unknown>;
          formErrors?: unknown;
        };
  };

  if (Array.isArray(source.errors)) {
    source.errors.forEach((item) => {
      const message = typeof item?.message === "string" ? item.message.trim() : "";
      if (message) errors.push(message);
    });
  }

  const fieldErrors =
    !Array.isArray(source.errors) && source.errors && typeof source.errors === "object"
      ? (source.errors as { fieldErrors?: Record<string, unknown> }).fieldErrors
      : undefined;

  if (fieldErrors && typeof fieldErrors === "object") {
    Object.entries(fieldErrors).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          const msg = String(entry ?? "").trim();
          if (msg) errors.push(`${field}: ${msg}`);
        });
      } else {
        const msg = String(value ?? "").trim();
        if (msg) errors.push(`${field}: ${msg}`);
      }
    });
  }

  const formErrors =
    !Array.isArray(source.errors) && source.errors && typeof source.errors === "object"
      ? (source.errors as { formErrors?: unknown }).formErrors
      : undefined;

  if (Array.isArray(formErrors)) {
    formErrors.forEach((entry) => {
      const msg = String(entry ?? "").trim();
      if (msg) errors.push(msg);
    });
  }

  if (Array.isArray(source.details)) {
    source.details.forEach((entry) => {
      const msg = String(entry ?? "").trim();
      if (msg) errors.push(msg);
    });
  }

  return Array.from(new Set(errors.filter(Boolean)));
}

function resolveErrorMessages(status: number, data: unknown): string[] {
  if (status === 429) {
    return ["Too many attempts. Please wait a moment and try again."];
  }

  if (status === 503) {
    return ["Service is temporarily unavailable. Please try again shortly."];
  }

  if (status === 422) {
    const fieldMessages = extractFieldErrors(data);
    if (fieldMessages.length > 0) return fieldMessages;
  }

  if (data && typeof data === "object") {
    const source = data as {
      error?: unknown;
      message?: unknown;
      details?: unknown;
      errors?: Array<{ message?: unknown }>;
    };

    const fallback =
      source.error ||
      source.message ||
      source.errors?.[0]?.message ||
      source.details ||
      `Request failed (${status})`;

    if (Array.isArray(fallback)) {
      const collected = fallback.map((item) => String(item ?? "").trim()).filter(Boolean);
      if (collected.length > 0) return collected;
    }

    const oneLine = String(fallback ?? "").trim();
    if (oneLine) return [oneLine];
  }

  return [`Request failed (${status})`];
}

interface SuccessPayload {
  message: string;
  bookingId: string;
  adminWaLink: string;
  selfWaLink: string;
}

export function BookingRequestForm() {
  const [services, setServices] = useState<{ _id: string; title: string }[]>([]);
  const [values, setValues] = useState<BookingFormValues>({
    name: "",
    email: "",
    phone: "",
    businessType: "",
    service: "",
    teamSize: "",
    budget: "",
    message: "",
    website: ""
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [successPayload, setSuccessPayload] = useState<SuccessPayload | null>(null);
  const [memoryGreeting, setMemoryGreeting] = useState("");

  const errors = useMemo(() => validateForm(values), [values]);
  const isValid = Object.values(errors).every((error) => !error);
  const adminWhatsApp = (process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "918590464379").trim();

  const renderedServices = useMemo(() => {
    const fromApi = services.map((service) => service.title.trim()).filter(Boolean);
    const combined = [...fromApi, ...fallbackServices];
    return Array.from(new Set(combined));
  }, [services]);

  useEffect(() => {
    api
      .get("/api/services")
      .then((response) => setServices(Array.isArray(response.data) ? response.data : []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawMemory = window.localStorage.getItem(LEAD_MEMORY_KEY);
    if (!rawMemory) return;

    try {
      const memory = JSON.parse(rawMemory) as Partial<BookingFormValues>;
      setValues((previous) => ({
        ...previous,
        name: previous.name || String(memory.name ?? ""),
        email: previous.email || String(memory.email ?? ""),
        phone: previous.phone || String(memory.phone ?? ""),
        businessType: previous.businessType || String(memory.businessType ?? ""),
        service: previous.service || String(memory.service ?? ""),
        teamSize: previous.teamSize || String(memory.teamSize ?? "")
      }));

      const email = String(memory.email ?? "").trim();
      const phone = String(memory.phone ?? "").trim();
      if (!email && !phone) return;

      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);

      api
        .get(`/api/leads/memory?${params.toString()}`)
        .then((response) => {
          if (response.data?.found) {
            setMemoryGreeting("Welcome back. We prefilled your previous details.");
          }
        })
        .catch(() => {
          // no-op for memory lookup failures
        });
    } catch {
      // ignore local memory payload issues
    }
  }, []);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || siteKey === "your_site_key_here") return;

    if (document.querySelector("#recaptcha-script")) return;

    const script = document.createElement("script");
    script.id = "recaptcha-script";
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => console.warn("reCAPTCHA script failed to load");
    document.head.appendChild(script);
  }, []);

  function updateField(field: FieldKey, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setTouched((previous) => ({ ...previous, [field]: true }));
  }

  const getRecaptchaToken = async (action: string): Promise<string | null> => {
    try {
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

      if (!siteKey || siteKey.trim() === "" || siteKey === "your_site_key_here") {
        console.warn("WARNING: reCAPTCHA site key not configured - skipping");
        return null;
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("reCAPTCHA timeout")), 5000);

        if (typeof window !== "undefined" && window.grecaptcha) {
          window.grecaptcha.ready(() => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      });

      if (typeof window === "undefined" || !window.grecaptcha?.execute) return null;

      const token = await window.grecaptcha.execute(siteKey, { action });
      return token || null;
    } catch (err) {
      console.warn("reCAPTCHA failed silently:", err);
      return null;
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      businessType: true,
      service: true,
      teamSize: true,
      message: true,
      website: true
    });
    setSubmitErrors([]);

    if (!isValid) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const recaptchaToken = await getRecaptchaToken("booking_submit");

    setSending(true);

    try {
      const res = await fetch("/internal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          businessType: values.businessType,
          service: values.service,
          teamSize: values.teamSize,
          budget: values.budget,
          message: values.message,
          website: values.website,
          ...(recaptchaToken ? { recaptchaToken } : {})
        })
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Booking response parse failed:", parseError);
        setSubmitErrors([`Server error (${res.status}). Please try again.`]);
        return;
      }

      if (!res.ok) {
        const failures = resolveErrorMessages(res.status, data);
        setSubmitErrors(failures);
        toast.error(failures[0] ?? "Request failed.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          LEAD_MEMORY_KEY,
          JSON.stringify({
            name: values.name,
            email: values.email,
            phone: values.phone,
            businessType: values.businessType,
            service: values.service,
            teamSize: values.teamSize
          })
        );
      }

      const responseData = (data ?? {}) as { message?: unknown; bookingId?: unknown };
      const bookingId = String(responseData.bookingId ?? "").trim();
      const responseMessage =
        typeof responseData.message === "string" && responseData.message.trim()
          ? responseData.message.trim()
          : "Your request has been received. We will contact you soon.";

      const adminPingMessage = `
${SYMBOLS.bell} *New Booking - ZeroOps*
${SYMBOLS.line}
Name: ${values.name}
Email: ${values.email}
Phone: ${values.phone}
Business Type: ${values.businessType}
Service: ${values.service}
Team Size: ${values.teamSize}
Budget: ${values.budget || "Not specified"}
Message: ${values.message}
${SYMBOLS.line}
Submitted: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
`.trim();

      const backupPing = buildAdminPing("New Booking", {
        Name: values.name,
        Email: values.email,
        Phone: values.phone,
        "Business Type": values.businessType,
        Service: values.service,
        "Team Size": values.teamSize,
        Budget: values.budget || "Not specified",
        Message: values.message
      });

      const confirmMsg = `
${SYMBOLS.check} *Your ZeroOps Booking is Confirmed!*
${SYMBOLS.line}
Hi ${values.name}!

We've received your booking request for:
${SYMBOLS.tools} ${values.service}

Our team will contact you within 24 hours.

${SYMBOLS.email} Email: zerohub01@gmail.com
${SYMBOLS.phone} WhatsApp: +91 85904 64379
Website: https://www.zeroops.in

Thank you for choosing ZeroOps! ${SYMBOLS.rocket}
`.trim();

      setSuccessPayload({
        message: responseMessage,
        bookingId,
        adminWaLink: buildWhatsAppLink(adminWhatsApp, adminPingMessage || backupPing),
        selfWaLink: buildWhatsAppLink(adminWhatsApp, confirmMsg)
      });

      trackEvent("generate_lead", {
        source: "booking_request_form",
        service: values.service.trim() || "unknown",
        business_type: values.businessType.trim() || "unknown",
        booking_id: bookingId || "none"
      });
      toast.success("Request submitted successfully.");
    } catch (error) {
      console.error("Booking submit failed:", error);
      const fallback = "Service is temporarily unavailable. Please try again shortly.";
      setSubmitErrors([fallback]);
      toast.error(fallback);
    } finally {
      setSending(false);
    }
  }

  if (successPayload) {
    const bookingId = successPayload.bookingId.trim();
    const trackingPath = bookingId ? `/booking-status/${bookingId}` : "";

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8 text-emerald-900">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <CheckCircle2 size={24} />
        </div>

        <h3 className="mt-4 text-2xl font-display">{SYMBOLS.check} Booking submitted successfully!</h3>
        <p className="mt-2 text-sm md:text-base">{successPayload.message}</p>

        {bookingId ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.14em] font-semibold">Lead ID</p>
            <p className="mt-1 text-lg font-semibold">{bookingId}</p>
            <a href={trackingPath} className="mt-3 inline-flex text-sm font-semibold underline">
              Track lead status
            </a>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <a
            href={successPayload.adminWaLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#25D366]"
          >
            {`${SYMBOLS.phone} Also notify us on WhatsApp`}
          </a>
          <p className="text-xs text-emerald-900/80">
            Tap above to send us a quick WhatsApp so we can prioritize your request.
          </p>

          <a
            href={successPayload.selfWaLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-900 bg-white"
          >
            Send yourself a confirmation
          </a>
          <p className="text-xs text-emerald-900/80">
            This opens WhatsApp with a pre-filled message you can send to save your booking details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {memoryGreeting ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {memoryGreeting}
        </div>
      ) : null}

      <div className="absolute -left-[5000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={values.website}
          onChange={(event) => updateField("website", event.target.value)}
        />
      </div>

      <div className="grid gap-1">
        <input
          name="name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
          placeholder="Full name"
          className="field py-3"
        />
        {touched.name && errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-1">
          <input
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
            placeholder="Email address"
            className="field py-3"
          />
          {touched.email && errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div className="grid gap-1">
          <input
            name="phone"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            required
            placeholder="Phone number"
            className="field py-3"
          />
          {touched.phone && errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
        </div>
      </div>

      <div className="grid gap-1">
        <input
          name="businessType"
          value={values.businessType}
          onChange={(event) => updateField("businessType", event.target.value)}
          required
          placeholder="Business type"
          className="field py-3"
        />
        {touched.businessType && errors.businessType ? <p className="text-xs text-red-600">{errors.businessType}</p> : null}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-1">
          <select
            name="service"
            value={values.service}
            onChange={(event) => updateField("service", event.target.value)}
            required
            className="field py-3"
          >
            <option value="">Select service</option>
            {renderedServices.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          {touched.service && errors.service ? <p className="text-xs text-red-600">{errors.service}</p> : null}
        </div>

        <div className="grid gap-1">
          <input
            name="teamSize"
            value={values.teamSize}
            onChange={(event) => updateField("teamSize", event.target.value)}
            required
            placeholder="Team size"
            className="field py-3"
          />
          {touched.teamSize && errors.teamSize ? <p className="text-xs text-red-600">{errors.teamSize}</p> : null}
        </div>
      </div>

      <div className="grid gap-1">
        <textarea
          name="message"
          value={values.message}
          onChange={(event) => updateField("message", event.target.value)}
          required
          placeholder="Tell us what you need"
          className="field py-3 min-h-[120px] resize-y"
        />
        {touched.message && errors.message ? <p className="text-xs text-red-600">{errors.message}</p> : null}
      </div>

      <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-xs text-[var(--muted)] flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <p>Protected by rate limiting, honeypot filtering, and optional captcha verification.</p>
      </div>

      {submitErrors.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <ul className="list-disc pl-4 space-y-1">
            {submitErrors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="btn-primary py-3.5 text-sm md:text-base disabled:opacity-70 inline-flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Request"
        )}
      </button>
    </form>
  );
}

