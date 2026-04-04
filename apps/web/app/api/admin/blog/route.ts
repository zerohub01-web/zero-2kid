import { NextResponse } from "next/server";

import {
  createAdminBlogPost,
  getAdminBlogPosts,
  type AdminBlogStatus
} from "../../../../lib/blog-store";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toStatus(value: unknown): AdminBlogStatus {
  return toSafeString(value).toLowerCase() === "published" ? "published" : "draft";
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toSafeString(item))
      .filter((item) => item.length > 0);
  }

  const raw = toSafeString(value);
  if (!raw) return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function getAdminAuthStatus(request: Request): Promise<200 | 401 | 403> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (!cookieHeader.includes("token=")) return 401;

  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/admin/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        cookie: cookieHeader
      },
      cache: "no-store"
    });
    if (!response.ok) {
      return response.status === 403 ? 403 : 401;
    }

    const adminData = (await response.json().catch(() => null)) as
      | { role?: string; token_type?: string }
      | null;

    return adminData?.role && adminData?.token_type === "admin" ? 200 : 403;
  } catch (error) {
    console.error("Admin auth check failed for blog endpoint:", error);
    return 401;
  }
}

export async function GET(request: Request) {
  try {
    const authStatus = await getAdminAuthStatus(request);
    if (authStatus !== 200) {
      return NextResponse.json(
        { message: authStatus === 403 ? "Forbidden" : "Unauthorized" },
        { status: authStatus }
      );
    }

    const posts = await getAdminBlogPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Admin blog list failed:", error);
    return NextResponse.json(
      { message: "Unable to load blog posts right now.", posts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authStatus = await getAdminAuthStatus(request);
    if (authStatus !== 200) {
      return NextResponse.json(
        { message: authStatus === 403 ? "Forbidden" : "Unauthorized" },
        { status: authStatus }
      );
    }

    const body = toRecord(await request.json().catch(() => ({})));

    const title = toSafeString(body.title);
    const content = toSafeString(body.content);
    if (title.length < 3) {
      return NextResponse.json({ message: "Title must be at least 3 characters." }, { status: 422 });
    }
    if (content.length < 20) {
      return NextResponse.json(
        { message: "Content must be at least 20 characters." },
        { status: 422 }
      );
    }

    const created = await createAdminBlogPost({
      title,
      slug: toSafeString(body.slug),
      description: toSafeString(body.description),
      content,
      author: toSafeString(body.author),
      tags: toTags(body.tags),
      status: toStatus(body.status)
    });

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (error) {
    console.error("Admin blog create failed:", error);
    return NextResponse.json({ message: "Unable to create blog post." }, { status: 500 });
  }
}
