import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";
import { getPublishedBlogPostBySlug } from "../../../lib/blog-store";

type BlogPostPageProps = {
  params: { slug: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPublishedBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Article Not Found | ZERO Blog",
      description: "The requested article is unavailable."
    };
  }

  return {
    title: `${post.title} | ZERO Blog`,
    description: post.description,
    alternates: {
      canonical: `https://zeroops.in/blog/${post.slug}`
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://zeroops.in/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author]
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description
    }
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPublishedBlogPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen relative overflow-hidden px-6 md:px-10 py-8">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <SiteHeader />

      <article className="relative z-10 max-w-3xl mx-auto mt-8 pb-10">
        <Link href="/blog" className="inline-flex text-xs uppercase tracking-[0.14em] text-[var(--muted)] underline">
          Back to blog
        </Link>

        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] mt-5">
          {new Date(post.publishedAt).toLocaleDateString()} | {post.readingMinutes} min read
        </p>
        <h1 className="text-4xl md:text-5xl font-display text-[var(--ink)] mt-3 leading-tight">{post.title}</h1>
        <p className="text-base text-[var(--muted)] mt-5 leading-relaxed">{post.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full border border-black/10 bg-white/75 px-3 py-1 text-xs text-[var(--muted)]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-8 soft-card p-6 md:p-8 space-y-8">
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-display text-[var(--ink)]">{section.heading}</h2>
              <div className="space-y-3 mt-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm md:text-base text-[var(--ink)]/90 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((item) => (
                    <li key={item} className="text-sm md:text-base text-[var(--ink)]/90 leading-relaxed flex gap-2">
                      <span className="text-[var(--accent)]">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
