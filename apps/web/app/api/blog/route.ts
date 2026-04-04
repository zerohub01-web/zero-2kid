import { NextResponse } from "next/server";

import { getPublishedBlogPosts } from "../../../lib/blog-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await getPublishedBlogPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Public blog list API failed:", error);
    return NextResponse.json(
      { message: "Unable to load blog posts right now.", posts: [] },
      { status: 500 }
    );
  }
}

