import { NextResponse } from "next/server";

import {
  deleteAdminBlogPost,
  updateAdminBlogPost,
  type AdminBlogStatus
} from "../../../../../lib/blog-store";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;
type RouteContext = { params: { id: string } };

function toRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toStatus(value: unknown): AdminBlogStatus | undefined {
  const normalized = toSafeString(value).toLowerCase();
  if (!normalized) return undefined;
  return normalized === "published" ? "published" : "draft";
}

function toTags(value: unknown): string[] | undefined {
  if (typeof value === "undefined") return undefined;

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
    console.error("Admin auth check failed for blog mutation endpoint:", error);
    return 401;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authStatus = await getAdminAuthStatus(request);
    if (authStatus !== 200) {
      return NextResponse.json(
        { message: authStatus === 403 ? "Forbidden" : "Unauthorized" },
        { status: authStatus }
      );
    }

    const id = toSafeString(context.params.id);
    if (!id) {
      return NextResponse.json({ message: "Missing blog id." }, { status: 400 });
    }

    const body = toRecord(await request.json().catch(() => ({})));
    const title = toSafeString(body.title);
    const content = toSafeString(body.content);

    if (title && title.length < 3) {
      return NextResponse.json({ message: "Title must be at least 3 characters." }, { status: 422 });
    }
    if (content && content.length < 20) {
      return NextResponse.json(
        { message: "Content must be at least 20 characters." },
        { status: 422 }
      );
    }

    const updated = await updateAdminBlogPost(id, {
      title: title || undefined,
      slug: toSafeString(body.slug) || undefined,
      description: toSafeString(body.description) || undefined,
      content: content || undefined,
      author: toSafeString(body.author) || undefined,
      tags: toTags(body.tags),
      status: toStatus(body.status)
    });

    if (!updated) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error("Admin blog update failed:", error);
    return NextResponse.json({ message: "Unable to update blog post." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authStatus = await getAdminAuthStatus(request);
    if (authStatus !== 200) {
      return NextResponse.json(
        { message: authStatus === 403 ? "Forbidden" : "Unauthorized" },
        { status: authStatus }
      );
    }

    const id = toSafeString(context.params.id);
    if (!id) {
      return NextResponse.json({ message: "Missing blog id." }, { status: 400 });
    }

    const deleted = await deleteAdminBlogPost(id);
    if (!deleted) {
      return NextResponse.json({ message: "Blog post not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin blog delete failed:", error);
    return NextResponse.json({ message: "Unable to delete blog post." }, { status: 500 });
  }
}
