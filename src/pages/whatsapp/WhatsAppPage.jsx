import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { LuMessageCircle, LuSend, LuCheckCheck } from "react-icons/lu";

// Live WhatsApp inbox (whatsapp_conversations, one row per contact) and the
// real approval status of every template on this WABA, straight from Meta.

const AVATAR_COLORS = ["#5C6BB8", "#FF7A59", "#DC2626", "#2B3A67", "#0E9F6E", "#9333EA"];
const colorFor = (key) => AVATAR_COLORS[Math.abs(String(key || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

function timeAgo(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function WhatsAppPage() {
  const toast = useToast();
  const call = useApiCall();
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: inboxData, loading: inboxLoading, error: inboxError, reload } = useApiQuery(`/whatsapp/inbox${buildQuery({ limit: 30 })}`);
  const { data: templatesData, loading: templatesLoading, error: templatesError } = useApiQuery("/whatsapp/templates");

  const conversations = inboxData || [];
  const templates = templatesData || [];
  const current = active ? conversations.find((c) => (c.phoneNumber || c.waUserId) === active) : conversations[0];

  async function sendReply() {
    if (!current || !draft.trim()) return;
    setSending(true);
    try {
      await call("/whatsapp/inbox/reply", {
        method: "POST",
        body: { phoneNumber: current.phoneNumber || undefined, waUserId: current.waUserId || undefined, body: draft.trim() },
      });
      setDraft("");
      toast.push("Reply sent.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp Integration"
        title="WhatsApp"
        subtitle="Live conversations from the business number, and the real approval status of every template."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="border-b border-line p-5">
            <h3 className="font-display text-base font-bold text-ink-950">Recent conversations</h3>
          </div>
          {inboxLoading ? (
            <div className="p-6"><InlineSpinner /></div>
          ) : inboxError ? (
            <div className="p-6 text-sm text-coral-600">{inboxError}</div>
          ) : !conversations.length ? (
            <EmptyState title="No conversations yet" subtitle="Inbound and outbound WhatsApp messages will show up here." />
          ) : (
            <div className="divide-y divide-line">
              {conversations.map((c) => {
                const key = c.phoneNumber || c.waUserId;
                const isActive = current && (current.phoneNumber || current.waUserId) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActive(key)}
                    className={`flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-muted ${isActive ? "bg-surface-muted" : ""}`}
                  >
                    <Avatar name={c.name} color={colorFor(key)} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                        <span className="text-xs text-ink-500">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="flex items-center gap-1 truncate text-xs text-ink-500">
                        {c.lastDirection === "outbound" && <LuCheckCheck className="h-3.5 w-3.5 text-green-500" />}
                        {c.lastMessage}
                      </p>
                    </div>
                    {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-line p-4">
            <LuMessageCircle className="h-4 w-4 text-ink-500" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder={current ? `Reply to ${current.name}...` : "Select a conversation first"}
              disabled={!current || sending}
              className="field-input flex-1"
            />
            <button className="btn-primary btn-sm" disabled={!current || !draft.trim() || sending} onClick={sendReply}>
              <LuSend className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Approved templates</h3>
          <p className="mb-4 text-xs text-ink-500">Only WhatsApp-approved templates can be triggered automatically.</p>
          {templatesLoading ? (
            <InlineSpinner />
          ) : templatesError ? (
            <p className="text-sm text-coral-600">{templatesError}</p>
          ) : !templates.length ? (
            <EmptyState title="No templates found" subtitle="Nothing has been created on this WhatsApp Business Account yet." />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                  <span className="text-sm font-medium text-ink-900">{t.name}</span>
                  <StatusBadge value={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
