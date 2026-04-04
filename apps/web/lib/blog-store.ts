import "server-only";

import crypto from "node:crypto";

import { BlogPost, getAllBlogPosts as getStaticBlogPosts } from "./blog";

export type AdminBlogStatus = "draft" | "published";

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  tags: string[];
  status: AdminBlogStatus;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CreateAdminBlogInput {
  title: string;
  description?: string;
  content: string;
  author?: string;
  tags?: string[];
  slug?: string;
  status?: AdminBlogStatus;
  readingMinutes?: number;
}

export interface UpdateAdminBlogInput {
  title?: string;
  description?: string;
  content?: string;
  author?: string;
  tags?: string[];
  slug?: string;
  status?: AdminBlogStatus;
  readingMinutes?: number;
}

const WORDS_PER_MINUTE = 180;
const DEFAULT_AUTHOR = "ZERO Editorial Team";

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStatus(value: unknown): AdminBlogStatus {
  const normalized = toSafeString(value).toLowerCase();
  return normalized === "published" ? "published" : "draft";
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toSafeString(item))
      .filter((item) => item.length > 0)
      .map((item) => item.toLowerCase());
  }

  const asString = toSafeString(value);
  if (!asString) return [];

  return asString
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function stripHtml(input: string): string {
  return input.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

function estimateReadingMinutes(text: string): number {
  const clean = stripHtml(text);
  const words = clean.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}

function slugify(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || `post-${Date.now()}`;
}

function buildDescription(title: string, description: string, content: string): string {
  const cleanDescription = stripHtml(description);
  if (cleanDescription.length > 0) return cleanDescription.slice(0, 220);

  const cleanContent = stripHtml(content).replace(/\s+/g, " ").trim();
  if (cleanContent.length > 0) return cleanContent.slice(0, 220);

  return stripHtml(title).slice(0, 220);
}

async function resolveStoragePath(): Promise<string> {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");

  const localPath = path.join(process.cwd(), "data", "blog-posts.json");
  const repoPath = path.join(process.cwd(), "apps", "web", "data", "blog-posts.json");
  const candidates = [localPath, repoPath];

  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }

  await fs.mkdir(path.dirname(localPath), { recursive: true });
  return localPath;
}

function normalizeStoredPost(value: unknown): AdminBlogPost | null {
  const record = toRecord(value);
  if (!record) return null;

  const title = toSafeString(record.title);
  const content = toSafeString(record.content);
  if (!title || !content) return null;

  const createdAt = toSafeString(record.createdAt) || new Date().toISOString();
  const updatedAt = toSafeString(record.updatedAt) || createdAt;
  const status = normalizeStatus(record.status);
  const description = buildDescription(title, toSafeString(record.description), content);
  const readingMinutes = Math.max(
    1,
    toSafeNumber(record.readingMinutes, estimateReadingMinutes(`${title} ${description} ${content}`))
  );

  const publishedAtRaw = toSafeString(record.publishedAt);
  const publishedAt = status === "published" ? publishedAtRaw || createdAt : null;

  return {
    id: toSafeString(record.id) || crypto.randomUUID(),
    slug: slugify(toSafeString(record.slug) || title),
    title,
    description,
    content,
    author: toSafeString(record.author) || DEFAULT_AUTHOR,
    tags: normalizeTags(record.tags),
    status,
    readingMinutes,
    createdAt,
    updatedAt,
    publishedAt
  };
}

async function readStoredPosts(): Promise<AdminBlogPost[]> {
  try {
    const fs = await import("node:fs/promises");
    const filePath = await resolveStoragePath();
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeStoredPost(item))
      .filter((item): item is AdminBlogPost => item !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

async function writeStoredPosts(posts: AdminBlogPost[]): Promise<void> {
  const fs = await import("node:fs/promises");
  const filePath = await resolveStoragePath();

  await fs.writeFile(filePath, JSON.stringify(posts, null, 2), "utf8");
}

function toPublicBlogPost(post: AdminBlogPost): BlogPost {
  const paragraphs = post.content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt ?? post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
    readingMinutes: post.readingMinutes,
    tags: post.tags,
    sections: [
      {
        heading: "Overview",
        paragraphs: paragraphs.length > 0 ? paragraphs : [post.description]
      }
    ]
  };
}

function ensureUniqueSlug(
  proposedSlug: string,
  existingStatic: BlogPost[],
  existingDynamic: AdminBlogPost[],
  excludeId?: string
): string {
  const existing = new Set<string>();

  for (const post of existingStatic) existing.add(post.slug);
  for (const post of existingDynamic) {
    if (excludeId && post.id === excludeId) continue;
    existing.add(post.slug);
  }

  let candidate = slugify(proposedSlug);
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${slugify(proposedSlug)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export async function getAdminBlogPosts(): Promise<AdminBlogPost[]> {
  return readStoredPosts();
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const staticPosts = getStaticBlogPosts();
  const dynamicPosts = await readStoredPosts();
  const publishedDynamic = dynamicPosts.filter((post) => post.status === "published");

  const merged = new Map<string, BlogPost>();
  for (const post of staticPosts) merged.set(post.slug, post);
  for (const post of publishedDynamic) merged.set(post.slug, toPublicBlogPost(post));

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const normalizedSlug = slugify(slug);
  const dynamicPosts = await readStoredPosts();
  const dynamicMatch = dynamicPosts.find(
    (post) => post.slug === normalizedSlug && post.status === "published"
  );

  if (dynamicMatch) return toPublicBlogPost(dynamicMatch);
  return getStaticBlogPosts().find((post) => post.slug === normalizedSlug);
}

export async function createAdminBlogPost(input: CreateAdminBlogInput): Promise<AdminBlogPost> {
  const title = toSafeString(input.title);
  const content = toSafeString(input.content);
  if (!title || !content) {
    throw new Error("Title and content are required.");
  }

  const storedPosts = await readStoredPosts();
  const staticPosts = getStaticBlogPosts();

  const status = normalizeStatus(input.status);
  const nowIso = new Date().toISOString();

  const desiredSlug = toSafeString(input.slug) || title;
  const uniqueSlug = ensureUniqueSlug(desiredSlug, staticPosts, storedPosts);

  const description = buildDescription(title, toSafeString(input.description), content);
  const tags = normalizeTags(input.tags);
  const readingMinutes = Math.max(
    1,
    toSafeNumber(input.readingMinutes, estimateReadingMinutes(`${title} ${description} ${content}`))
  );

  const nextPost: AdminBlogPost = {
    id: crypto.randomUUID(),
    slug: uniqueSlug,
    title,
    description,
    content,
    author: toSafeString(input.author) || DEFAULT_AUTHOR,
    tags,
    status,
    readingMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: status === "published" ? nowIso : null
  };

  const nextPosts = [nextPost, ...storedPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  await writeStoredPosts(nextPosts);

  return nextPost;
}

export async function updateAdminBlogPost(
  id: string,
  input: UpdateAdminBlogInput
): Promise<AdminBlogPost | null> {
  const targetId = toSafeString(id);
  if (!targetId) return null;

  const storedPosts = await readStoredPosts();
  const index = storedPosts.findIndex((post) => post.id === targetId);
  if (index < 0) return null;

  const current = storedPosts[index];
  const staticPosts = getStaticBlogPosts();
  const nowIso = new Date().toISOString();

  const nextTitle = toSafeString(input.title) || current.title;
  const nextContent = toSafeString(input.content) || current.content;
  const nextDescription = buildDescription(
    nextTitle,
    toSafeString(input.description) || current.description,
    nextContent
  );

  const desiredSlug = toSafeString(input.slug) || current.slug || nextTitle;
  const nextSlug = ensureUniqueSlug(desiredSlug, staticPosts, storedPosts, current.id);

  const nextStatus = typeof input.status === "undefined" ? current.status : normalizeStatus(input.status);
  const nextReading = Math.max(
    1,
    toSafeNumber(
      input.readingMinutes,
      estimateReadingMinutes(`${nextTitle} ${nextDescription} ${nextContent}`)
    )
  );

  const nextPost: AdminBlogPost = {
    ...current,
    title: nextTitle,
    content: nextContent,
    description: nextDescription,
    slug: nextSlug,
    author: toSafeString(input.author) || current.author,
    tags: normalizeTags(input.tags ?? current.tags),
    status: nextStatus,
    readingMinutes: nextReading,
    updatedAt: nowIso,
    publishedAt:
      nextStatus === "published"
        ? current.publishedAt || nowIso
        : null
  };

  const nextPosts = [...storedPosts];
  nextPosts[index] = nextPost;
  await writeStoredPosts(nextPosts);

  return nextPost;
}

export async function deleteAdminBlogPost(id: string): Promise<boolean> {
  const targetId = toSafeString(id);
  if (!targetId) return false;

  const storedPosts = await readStoredPosts();
  const nextPosts = storedPosts.filter((post) => post.id !== targetId);
  if (nextPosts.length === storedPosts.length) return false;

  await writeStoredPosts(nextPosts);
  return true;
}

