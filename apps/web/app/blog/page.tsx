import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { getPublishedBlogPosts } from "../../lib/blog-store";

export const metadata: Metadata = {
  title: "ZERO Blog | Digital Marketing, SEO, and Automation Insights",
  description:
    "Actionable digital marketing and automation guides from ZERO. Learn lead generation, SEO execution, and follow-up systems for service businesses.",
  alternates: {
    canonical: "https://zeroops.in/blog"
  },
  openGraph: {
    title: "ZERO Blog | Digital Marketing and Automation Insights",
    description:
      "Read practical playbooks for lead generation, SEO, and automated follow-up systems.",
    url: "https://zeroops.in/blog",
    type: "website"
  }
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <section className="relative z-10 max-w-6xl mx-auto mt-8 pb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">ZERO Blog</p>
        <h1 className="text-5xl md:text-6xl font-display text-[var(--ink)] mt-3">
          Digital marketing systems that convert.
        </h1>
        <p className="text-sm md:text-base text-[var(--muted)] mt-4 max-w-3xl">
          Frameworks, checklists, and implementation notes for lead capture, SEO growth, and automation
          execution.
        </p>

        {posts.length === 0 ? (
          <div className="soft-card p-8 mt-8 text-center">
            <h2 className="text-2xl font-display text-[var(--ink)]">No blog posts published yet</h2>
            <p className="text-sm text-[var(--muted)] mt-2">
              Check back soon for fresh insights from ZERO.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {posts.map((post) => (
              <article key={post.slug} className="soft-card p-6 flex flex-col">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  {new Date(post.publishedAt).toLocaleDateString()} | {post.readingMinutes} min read
                </p>
                <h2 className="text-2xl font-display text-[var(--ink)] mt-3 leading-tight">{post.title}</h2>
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed flex-1">{post.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-[11px] text-[var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex text-sm font-semibold underline">
                  Read article
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
