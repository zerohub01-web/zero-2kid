import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "We collect the information you submit directly, including name, email address, phone number, company details, service requirements, and messages shared through forms, booking flows, chatbot interactions, and client communication channels.",
      "We may also collect technical usage information such as IP address, browser details, device metadata, and interaction events to protect our platform, prevent abuse, and improve service quality."
    ]
  },
  {
    title: "How We Use Your Information",
    body: [
      "We use your information to respond to requests, provide requested services, deliver proposals or contracts, manage onboarding, process invoices and payments, and provide support.",
      "We also use data for operational analytics, service reliability, security monitoring, communication updates, and legal compliance obligations."
    ]
  },
  {
    title: "Sharing of Information",
    body: [
      "We do not sell your personal information. We share data only when necessary to deliver services, process transactions, run infrastructure, or meet legal obligations.",
      "Service providers are contractually required to process data only for authorized purposes and with appropriate safeguards."
    ]
  },
  {
    title: "Cookies and Tracking",
    body: [
      "We use essential cookies and similar technologies to maintain session behavior, protect forms, prevent spam, and improve performance.",
      "Where applicable, analytics and traffic insights may use aggregated interaction data to help us optimize user experience and service delivery."
    ]
  },
  {
    title: "Data Retention",
    body: [
      "We retain data only as long as needed for the purposes described in this policy, including account management, contractual obligations, financial records, security operations, and regulatory compliance.",
      "When data is no longer required, we delete or anonymize it according to operational and legal requirements."
    ]
  },
  {
    title: "Your Rights",
    body: [
      "You may request access, correction, export, or deletion of your personal information, subject to legal and contractual constraints.",
      "You may also request updates to communication preferences and object to specific processing where applicable under relevant law."
    ]
  },
  {
    title: "Third-Party Services",
    body: [
      "Our platform may integrate third-party services including Google reCAPTCHA, Stripe, Google OAuth, Cloudinary, Resend, and OpenAI to provide security checks, authentication, payments, media handling, transactional communication, and AI-powered workflows.",
      "Each provider operates under its own terms and privacy policy. We recommend reviewing their policies where relevant to your use of our services."
    ]
  },
  {
    title: "Contact Us",
    body: [
      "For privacy requests, data deletion requests, or policy-related questions, contact us at ",
      "zerohub01@gmail.com"
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8"
      style={{ backgroundColor: "#F5F2EB" }}
    >
      <SiteHeader />

      <section className="relative z-10 max-w-3xl mx-auto mt-8">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#555555] font-semibold">Legal</p>
          <h1 className="text-5xl md:text-6xl font-display text-[#111111] mt-3">Privacy Policy</h1>
          <p className="text-sm md:text-base text-[#555555] mt-3">Last updated: April 2026</p>
        </header>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-[#ECE8DE] bg-white shadow-[0_6px_20px_rgba(17,17,17,0.05)] p-6 md:p-7"
            >
              <h2 className="text-xl font-semibold text-[#111111]">{section.title}</h2>

              <div className="mt-3 space-y-3">
                {section.title === "Contact Us" ? (
                  <p className="text-[0.95rem] leading-7 text-[#444444]">
                    {section.body[0]}
                    <a href="mailto:zerohub01@gmail.com" className="font-semibold text-[#111111] underline">
                      {section.body[1]}
                    </a>
                    .
                  </p>
                ) : (
                  section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[0.95rem] leading-7 text-[#444444]">
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  );
}

