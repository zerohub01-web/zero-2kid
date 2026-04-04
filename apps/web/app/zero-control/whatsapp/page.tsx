"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

type ChatStatus = "new" | "engaged" | "converted";
type LeadStatus = "new" | "contacted" | "converted";

interface ChatMessage {
  direction: "inbound" | "outbound";
  source: "user" | "ai" | "system" | "admin";
  text: string;
  timestamp: string;
}

interface ChatConversation {
  id: string;
  phone: string;
  status: ChatStatus;
  lastMessage: string;
  lastMessageAt: string;
  messages: ChatMessage[];
}

interface LeadRow {
  _id: string;
  bookingId: string;
  name: string;
  phone: string;
  service: string;
  createdAt: string;
  status: LeadStatus;
  proposalUrl?: string;
}

interface ConversationRow {
  id: string;
  clientName: string;
  phone: string;
  service: string;
  lastMessage: string;
  lastTouchedAt: string;
  status: "new" | "contacted" | "converted";
}

function digits(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function safeDateLabel(value?: string) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata"
  });
}

function buildQuickReply(row: ConversationRow) {
  const firstName = row.clientName.trim().split(" ")[0] || "there";
  return `Hi ${firstName}, following up from ZERO OPS. How can we help you today?`;
}

function buildWhatsAppLink(phone: string, message: string) {
  const cleanPhone = digits(phone);
  if (!cleanPhone) return "#";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export default function WhatsAppConversationsPage() {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chatRes, leadRes] = await Promise.all([
        api.get<ChatConversation[]>("/api/admin/chats"),
        api.get<LeadRow[]>("/api/admin/bookings")
      ]);

      setChats(Array.isArray(chatRes.data) ? chatRes.data : []);
      setLeads(Array.isArray(leadRes.data) ? leadRes.data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load WhatsApp conversations");
      setChats([]);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const rows = useMemo<ConversationRow[]>(() => {
    const leadsByPhone = new Map(
      leads
        .filter((lead) => digits(lead.phone))
        .map((lead) => [digits(lead.phone), lead] as const)
    );

    const fromChats = chats.map((chat) => {
      const linkedLead = leadsByPhone.get(digits(chat.phone));
      return {
        id: chat.id,
        clientName: linkedLead?.name || chat.phone,
        phone: linkedLead?.phone || chat.phone,
        service: linkedLead?.service || "General enquiry",
        lastMessage: chat.lastMessage || "No messages yet",
        lastTouchedAt: chat.lastMessageAt || linkedLead?.createdAt || "",
        status: linkedLead?.status || (chat.status === "engaged" ? "contacted" : chat.status)
      };
    });

    const chatPhones = new Set(fromChats.map((row) => digits(row.phone)));
    const fromLeads = leads
      .filter((lead) => digits(lead.phone) && !chatPhones.has(digits(lead.phone)))
      .map((lead) => ({
        id: lead._id,
        clientName: lead.name,
        phone: lead.phone,
        service: lead.service,
        lastMessage: "No WhatsApp thread yet",
        lastTouchedAt: lead.createdAt,
        status: lead.status
      }));

    return [...fromChats, ...fromLeads].sort(
      (left, right) => new Date(right.lastTouchedAt || 0).getTime() - new Date(left.lastTouchedAt || 0).getTime()
    );
  }, [chats, leads]);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return {
      total: rows.length,
      repliedToday: rows.filter((row) => new Date(row.lastTouchedAt).getTime() >= todayStart.getTime()).length,
      pendingReply: rows.filter((row) => row.status === "new").length,
      converted: rows.filter((row) => row.status === "converted").length
    };
  }, [rows]);

  return (
    <section className="space-y-6">
      <header className="soft-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-[var(--ink)]">WhatsApp Conversations</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Track all client WhatsApp interactions</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/10 bg-white text-sm"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Total Conversations</p>
            <p className="text-2xl font-display mt-2">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Replied Today</p>
            <p className="text-2xl font-display mt-2">{stats.repliedToday}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Pending Reply</p>
            <p className="text-2xl font-display mt-2">{stats.pendingReply}</p>
          </article>
          <article className="rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Converted</p>
            <p className="text-2xl font-display mt-2">{stats.converted}</p>
          </article>
        </div>
      </header>

      <section className="soft-card p-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--muted)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 p-10 text-center text-sm text-[var(--muted)]">
            No WhatsApp conversations or leads with phone numbers found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-black/10">
                <tr>
                  <th className="py-3 text-left">Client Name</th>
                  <th className="py-3 text-left">Phone</th>
                  <th className="py-3 text-left">Service</th>
                  <th className="py-3 text-left">Last Message</th>
                  <th className="py-3 text-left">Time</th>
                  <th className="py-3 text-left">Quick Reply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 font-medium">{row.clientName}</td>
                    <td className="py-3">{row.phone}</td>
                    <td className="py-3">{row.service}</td>
                    <td className="py-3 text-[var(--muted)] max-w-[320px] truncate">{row.lastMessage}</td>
                    <td className="py-3 text-[var(--muted)]">{safeDateLabel(row.lastTouchedAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={buildWhatsAppLink(row.phone, buildQuickReply(row))}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold"
                        >
                          <MessageCircle size={12} /> Quick Reply
                        </a>
                        <Link
                          href={`/zero-control/invoices/new?client=${encodeURIComponent(row.clientName)}&phone=${encodeURIComponent(
                            row.phone
                          )}&service=${encodeURIComponent(row.service)}` as Route}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-semibold"
                        >
                          <ExternalLink size={12} /> Send Invoice/Contract
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
