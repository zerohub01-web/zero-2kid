import { NextResponse } from "next/server";

import { getPublishedBlogPostBySlug } from "../../../../lib/blog-store";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { slug: string };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const post = await getPublishedBlogPostBySlug(context.params.slug);
    if (!post) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Public blog detail API failed:", error);
    return NextResponse.json(
      { message: "Unable to load this blog post right now." },
      { status: 500 }
    );
  }
}

