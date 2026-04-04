export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  readingMinutes: number;
  tags: string[];
  sections: BlogSection[];
};

const posts: BlogPost[] = [
  {
    slug: "digital-marketing-funnel-for-service-businesses",
    title: "The 2026 Digital Marketing Funnel for Service Businesses",
    description:
      "How to turn a brochure website into a lead engine using clean CTAs, fast forms, and automated follow-ups.",
    publishedAt: "2026-03-24",
    updatedAt: "2026-03-25",
    author: "ZERO Growth Team",
    readingMinutes: 6,
    tags: ["lead generation", "conversion", "marketing funnel"],
    sections: [
      {
        heading: "Start with one conversion goal",
        paragraphs: [
          "Most service websites fail because they ask users to do too many things at once. A high-performing funnel starts with one primary conversion event.",
          "For ZERO projects, that event is usually a lead form submission or strategy-call booking."
        ]
      },
      {
        heading: "Reduce friction on every step",
        paragraphs: [
          "Use mobile-first forms, prefill known data, and keep required fields minimal. Every extra field reduces completion rate.",
          "Pair this with spam protection and server-side validation so quality does not drop while volume increases."
        ],
        bullets: [
          "Single CTA above the fold",
          "Sticky free-audit button for quick action",
          "Optional WhatsApp handoff after submit"
        ]
      },
      {
        heading: "Automate follow-up immediately",
        paragraphs: [
          "Speed matters more than polished copy in early follow-up. Send confirmation to the user and alert the admin instantly.",
          "Then run day-based reminders only while lead status is new. Stop automation the moment a lead is converted."
        ]
      }
    ]
  },
  {
    slug: "seo-content-plan-for-local-service-brands",
    title: "SEO Content Plan for Local Service Brands",
    description:
      "A practical blog and metadata strategy to rank for high-intent local searches while improving lead quality.",
    publishedAt: "2026-03-22",
    author: "ZERO Content Ops",
    readingMinutes: 7,
    tags: ["seo", "blog strategy", "local search"],
    sections: [
      {
        heading: "Focus on buying-intent topics",
        paragraphs: [
          "Informational traffic alone will not grow revenue. Prioritize topics that align with a service decision.",
          "Examples include pricing, timelines, implementation steps, and common objections."
        ]
      },
      {
        heading: "Ship structured metadata on every page",
        paragraphs: [
          "Page title, description, canonical URL, Open Graph tags, and sitemap coverage should be standard for every post.",
          "Structured metadata improves index quality and increases click-through rate from search."
        ],
        bullets: [
          "One clear keyword theme per post",
          "Internal links to service pages and case studies",
          "Updated publish dates when content changes meaningfully"
        ]
      },
      {
        heading: "Measure business outcomes, not only traffic",
        paragraphs: [
          "Tie analytics to lead events: form submit, call booking, and WhatsApp click.",
          "A smaller traffic stream with stronger intent often beats vanity traffic from broad terms."
        ]
      }
    ]
  },
  {
    slug: "how-to-score-leads-and-prioritize-sales-followups",
    title: "How to Score Leads and Prioritize Sales Follow-ups",
    description:
      "Use budget, service intent, and message quality to classify leads and route high-value opportunities first.",
    publishedAt: "2026-03-18",
    author: "ZERO Automation Lab",
    readingMinutes: 5,
    tags: ["lead scoring", "sales automation", "follow-up"],
    sections: [
      {
        heading: "Define a transparent scoring model",
        paragraphs: [
          "Lead score should be simple enough for sales and ops to trust. Avoid black-box logic when you are still early.",
          "Budget thresholds, service type, and inquiry depth are enough to classify most inbound leads."
        ]
      },
      {
        heading: "Route actions by score",
        paragraphs: [
          "High-score leads should trigger immediate admin alerts and faster call scheduling. Medium and low-score leads can enter nurture workflows.",
          "This prevents team bandwidth from being consumed by low-intent requests."
        ],
        bullets: [
          "High: instant notification + proposal priority",
          "Medium: standard follow-up sequence",
          "Low: lightweight nurture and periodic check-in"
        ]
      },
      {
        heading: "Keep feedback loops short",
        paragraphs: [
          "Review won and lost deals monthly to improve scoring assumptions. Update thresholds as your average deal size changes.",
          "A lead model is only valuable when it evolves with real conversion data."
        ]
      }
    ]
  }
];

export function getAllBlogPosts() {
  return posts;
}

export function getFeaturedBlogPosts(limit = 3) {
  return posts.slice(0, limit);
}

export function getBlogPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}
