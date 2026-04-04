"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { api } from "../../../lib/api";

type BlogStatus = "draft" | "published";

interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  tags: string[];
  status: BlogStatus;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface BlogApiListResponse {
  posts?: AdminBlogPost[];
  message?: string;
}

interface BlogApiSingleResponse {
  post?: AdminBlogPost;
  message?: string;
}

interface BlogFormState {
  title: string;
  slug: string;
  author: string;
  tags: string;
  description: string;
  content: string;
  status: BlogStatus;
}

const EMPTY_FORM: BlogFormState = {
  title: "",
  slug: "",
  author: "ZERO Editorial Team",
  tags: "",
  description: "",
  content: "",
  status: "draft"
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || !error) return fallback;

  const maybeResponse = error as { response?: { data?: { message?: string } } };
  return maybeResponse.response?.data?.message ?? fallback;
}

function sortNewest(posts: AdminBlogPost[]) {
  return [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function AdminBlogManagerPage() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);

  const isEditMode = Boolean(editingId);

  useEffect(() => {
    void loadPosts();
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<BlogApiListResponse>("/api/admin/blog");
      const items = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(sortNewest(items));
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load blog posts"));
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (post: AdminBlogPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      author: post.author,
      tags: post.tags.join(", "),
      description: post.description,
      content: post.content,
      status: post.status
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this blog post?");
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/blog/${id}`);
      toast.success("Blog post deleted");
      setPosts((previous) => previous.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete blog post"));
    }
  };

  const togglePublish = async (post: AdminBlogPost) => {
    const nextStatus: BlogStatus = post.status === "published" ? "draft" : "published";

    try {
      const { data } = await api.patch<BlogApiSingleResponse>(`/api/admin/blog/${post.id}`, {
        status: nextStatus
      });
      if (!data?.post) {
        toast.error(data?.message || "Failed to update status");
        return;
      }

      const updatedPost = data.post;
      setPosts((previous) =>
        sortNewest(previous.map((item) => (item.id === updatedPost.id ? updatedPost : item)))
      );
      if (editingId === updatedPost.id) {
        setForm((prev) => ({ ...prev, status: updatedPost.status }));
      }
      toast.success(
        updatedPost.status === "published"
          ? "Post published to live blog"
          : "Post moved to draft"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update blog status"));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }

    if (form.content.trim().length < 20) {
      toast.error("Content must be at least 20 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        author: form.author.trim(),
        tags: form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        description: form.description.trim(),
        content: form.content.trim(),
        status: form.status
      };

      if (editingId) {
        const { data } = await api.patch<BlogApiSingleResponse>(
          `/api/admin/blog/${editingId}`,
          payload
        );
        if (!data?.post) {
          toast.error(data?.message || "Failed to update blog post");
          return;
        }

        setPosts((previous) =>
          sortNewest(previous.map((item) => (item.id === data.post?.id ? data.post : item)))
        );
        toast.success("Blog post updated");
      } else {
        const { data } = await api.post<BlogApiSingleResponse>("/api/admin/blog", payload);
        if (!data?.post) {
          toast.error(data?.message || "Failed to create blog post");
          return;
        }

        setPosts((previous) => sortNewest([data.post as AdminBlogPost, ...previous]));
        toast.success(
          data.post.status === "published"
            ? "Blog published successfully"
            : "Draft created successfully"
        );
      }

      resetForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save blog post"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((post) => post.status === "published").length,
      drafts: posts.filter((post) => post.status === "draft").length
    }),
    [posts]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-display text-[var(--ink)]">Blog Manager</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Write, edit, and publish blog posts directly from admin control.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white hover:bg-black/85 transition"
        >
          <Plus size={16} />
          New Post
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="soft-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Total Posts</p>
          <p className="mt-2 text-2xl font-display text-[var(--ink)]">{stats.total}</p>
        </article>
        <article className="soft-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Published</p>
          <p className="mt-2 text-2xl font-display text-[var(--ink)]">{stats.published}</p>
        </article>
        <article className="soft-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Drafts</p>
          <p className="mt-2 text-2xl font-display text-[var(--ink)]">{stats.drafts}</p>
        </article>
      </div>

      <form onSubmit={handleSubmit} className="soft-card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display text-[var(--ink)]">
            {isEditMode ? "Edit Blog Post" : "Write New Blog Post"}
          </h2>
          <label className="text-sm text-[var(--muted)] inline-flex items-center gap-2">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as BlogStatus }))
              }
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm"
            placeholder="Blog title"
          />
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm"
            placeholder="Slug (optional)"
          />
          <input
            value={form.author}
            onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm"
            placeholder="Author"
          />
          <input
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm"
            placeholder="Tags (comma separated)"
          />
        </div>

        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm min-h-[80px]"
          placeholder="Short description (optional)"
        />

        <textarea
          required
          value={form.content}
          onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 text-sm min-h-[220px]"
          placeholder="Write your blog content here..."
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-medium text-white hover:bg-black/85 transition disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isEditMode ? "Update Post" : "Create Post"}
          </button>
          {isEditMode ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-black/5 transition"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {isLoading ? (
        <div className="soft-card p-10 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--muted)]" />
        </div>
      ) : posts.length === 0 ? (
        <section className="soft-card p-10 text-center">
          <h3 className="text-xl font-display text-[var(--ink)]">No blog posts yet</h3>
          <p className="text-sm text-[var(--muted)] mt-2">
            Create your first post above and publish it to the public blog.
          </p>
        </section>
      ) : (
        <div className="soft-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-[var(--ink)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Updated</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-t border-black/10">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--ink)]">{post.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">/{post.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        post.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(post.updatedAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        className="inline-flex items-center gap-1 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void togglePublish(post)}
                        className="inline-flex items-center gap-1 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                      >
                        {post.status === "published" ? "Move to Draft" : "Publish"}
                      </button>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(post.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

