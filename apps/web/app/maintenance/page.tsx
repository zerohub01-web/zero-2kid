import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";

const plans = [
  {
    name: "Essential Care",
    price: "INR 2,000 - 3,500 / year",
    items: [
      "Managed cloud hosting",
      "Automated weekly off-site backups",
      "SSL certificate management and renewal",
      "24/7 uptime monitoring and alerting"
    ]
  },
  {
    name: "Growth & Security",
    price: "INR 6,000 - 10,000 / year",
    items: [
      "Everything in Essential Care",
      "Quarterly vulnerability scan and patching",
      "Database optimization and cleanup",
      "Up to 36 hours yearly updates/tweaks",
      "Automated annual analytics report"
    ]
  },
  {
    name: "Elite Retainer",
    price: "INR 14,999+ / year",
    items: [
      "Everything in Growth & Security",
      "AI chatbot prompt tuning and conversion review",
      "Priority SLA: critical fixes within 12 hours",
      "Weekly competitor intelligence automation brief"
    ]
  }
];

export default function MaintenancePage() {
  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Maintenance</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">Security and infrastructure care plans.</h1>
        <p className="text-[var(--muted)] mt-4 max-w-3xl">
          Every launched system needs recurring protection. These retainers protect uptime, performance, and conversion continuity.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {plans.map((plan) => (
            <article key={plan.name} className="soft-card p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Yearly</p>
              <h2 className="text-2xl font-display text-[var(--ink)] mt-2">{plan.name}</h2>
              <p className="text-xl font-display text-[var(--accent)] mt-2">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {plan.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-10"><SiteFooter /></div>
    </main>
  );
}
