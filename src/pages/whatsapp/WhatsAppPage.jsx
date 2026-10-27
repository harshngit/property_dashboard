import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { getSocket } from "../../lib/socket";
import { LuSend, LuCheckCheck, LuPhone, LuSearch, LuClock } from "react-icons/lu";

// Live WhatsApp inbox (whatsapp_conversations, one row per contact) and the
// real approval status of every template on this WABA, straight from Meta.
// Real-time via Socket.IO (see ../../lib/socket.js) - 'whatsapp:inbox' keeps
// the contact list live, 'whatsapp:contact:<key>' delivers new messages
// straight into an open thread. The REST endpoints stay the source of
// truth; sockets only shorten the delay for anyone with the page open.

const AVATAR_COLORS = ["#5C6BB8", "#0E9F6E", "#2B3A67", "#9333EA", "#B45309", "#0F766E"];
const colorFor = (key) => AVATAR_COLORS[Math.abs(String(key || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
const STATUS_FILTERS = ["All", "Approved", "Pending", "Rejected"];
const time = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const day = (v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function timeAgo(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

// Raw digits (any length) read as an Indian mobile: "918104744056" -> "+91 81047 44056".
function formatPhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : "91";
  if (local.length !== 10) return raw;
  return `+${cc} ${local.slice(0, 5)} ${local.slice(5)}`;
}

function ConversationRow({ c, isActive, onSelect }) {
  const key = c.phoneNumber || c.waUserId;
  const isNamed = Boolean(c.name && c.name !== c.phoneNumber);
  const display = isNamed ? c.name : formatPhone(c.phoneNumber) || "Unknown contact";

  return (
    <button
      type="button"
      onClick={() => onSelect(key)}
      className={`flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
        isActive ? "border-indigo-500 bg-indigo-50/60" : "border-transparent hover:bg-surface-muted"
      }`}
    >
      {isNamed ? (
        <Avatar name={c.name} color={colorFor(key)} size={40} />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          <LuPhone className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${isNamed ? "font-semibold text-ink-900" : "font-medium text-ink-700"}`}>{display}</p>
          <span className="shrink-0 text-[11px] text-ink-400">{timeAgo(c.lastMessageAt)}</span>
        </div>
        {isNamed && <p className="truncate text-[11px] text-ink-400">{formatPhone(c.phoneNumber)}</p>}
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
          {c.lastDirection === "outbound" && <LuCheckCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          <span className="truncate">{c.lastMessage || "—"}</span>
        </p>
      </div>
      {c.unread && (
        <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <LuClock className="h-3 w-3" /> Reply
        </span>
      )}
    </button>
  );
}

// One contact's full history + composer - joins that contact's socket room
// while open so a reply (from here or from the customer's phone) appears
// instantly, no re-fetch needed.
function Thread({ contact }) {
  const call = useApiCall();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const key = contact.phoneNumber || contact.waUserId;

  useEffect(() => {
    let live = true;
    setItems([]);
    setLoading(true);
    setError(null);
    call(`/whatsapp/thread${buildQuery({ phoneNumber: contact.phoneNumber, waUserId: contact.waUserId })}`)
      .then((r) => live && setItems(r.data))
      .catch((err) => live && setError(err.message))
      .finally(() => live && setLoading(false));

    const socket = getSocket();
    socket.emit("whatsapp:open", { phoneNumber: contact.phoneNumber, waUserId: contact.waUserId });
    const onMessage = (m) => {
      if (!live) return;
      setItems((cur) => [...cur, m]);
    };
    socket.on("whatsapp:message", onMessage);

    return () => {
      live = false;
      socket.emit("whatsapp:close", { phoneNumber: contact.phoneNumber, waUserId: contact.waUserId });
      socket.off("whatsapp:message", onMessage);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [items.length]);

  async function sendReply() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await call("/whatsapp/inbox/reply", {
        method: "POST",
        body: { phoneNumber: contact.phoneNumber || undefined, waUserId: contact.waUserId || undefined, body: draft.trim() },
      });
      setDraft("");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSending(false);
    }
  }

  const isNamed = Boolean(contact.name && contact.name !== contact.phoneNumber);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        {isNamed ? (
          <Avatar name={contact.name} color={colorFor(key)} size={36} />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-400">
            <LuPhone className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">{isNamed ? contact.name : formatPhone(contact.phoneNumber) || "Unknown contact"}</p>
          {isNamed && <p className="truncate text-[11px] text-ink-400">{formatPhone(contact.phoneNumber)}</p>}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface-muted/40 p-4">
        {loading ? (
          <div className="flex justify-center py-10"><InlineSpinner /></div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-coral-600">{error}</p>
        ) : !items.length ? (
          <p className="py-10 text-center text-sm text-ink-500">No messages yet.</p>
        ) : (
          items.map((m, i) => {
            const mine = m.direction === "outbound";
            const prevDay = i > 0 ? day(items[i - 1].created_at) : null;
            const thisDay = day(m.created_at);
            return (
              <div key={m.id || `${m.created_at}-${i}`}>
                {thisDay !== prevDay && <p className="mb-2 text-center text-[11px] text-ink-400">{thisDay}</p>}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? "bg-indigo-600 text-white" : "border border-line bg-white text-ink-900"}`}>
                    {m.template_name && <p className={`mb-0.5 text-[11px] font-bold ${mine ? "text-white/80" : "text-ink-500"}`}>Template · {m.template_name}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.message_body || (m.message_type === "image" ? "📷 Photo" : "—")}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-ink-400"}`}>
                      {time(m.created_at)} {mine && m.status === "failed" && <span className="text-coral-200">· failed</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
          placeholder={`Reply to ${isNamed ? contact.name : formatPhone(contact.phoneNumber)}...`}
          disabled={sending}
          className="field-input flex-1"
        />
        <button className="btn-primary btn-sm shrink-0" disabled={!draft.trim() || sending} onClick={sendReply}>
          <LuSend className="h-3.5 w-3.5" /> Send
        </button>
      </div>
    </div>
  );
}

export default function WhatsAppPage() {
  const [active, setActive] = useState(null);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState("All");

  const { data: inboxData, loading: inboxLoading, error: inboxError, reload } = useApiQuery(`/whatsapp/inbox${buildQuery({ limit: 30 })}`);
  const { data: templatesData, loading: templatesLoading, error: templatesError } = useApiQuery("/whatsapp/templates");

  const conversations = useMemo(() => inboxData || [], [inboxData]);
  const templates = useMemo(() => templatesData || [], [templatesData]);
  const current = active ? conversations.find((c) => (c.phoneNumber || c.waUserId) === active) : conversations[0];

  // Keep the contact list live even while a different (or no) thread is open.
  useEffect(() => {
    const socket = getSocket();
    socket.emit("whatsapp:join");
    const onNewMessage = () => reload();
    socket.on("whatsapp:new_message", onNewMessage);
    return () => socket.off("whatsapp:new_message", onNewMessage);
  }, [reload]);

  const templateCounts = useMemo(() => {
    const counts = { Approved: 0, Pending: 0, Rejected: 0 };
    for (const t of templates) {
      const s = String(t.status || "").toUpperCase();
      if (s === "APPROVED") counts.Approved += 1;
      else if (s === "REJECTED") counts.Rejected += 1;
      else counts.Pending += 1;
    }
    return counts;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    return templates.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (templateFilter === "All") return true;
      const s = String(t.status || "").toUpperCase();
      if (templateFilter === "Approved") return s === "APPROVED";
      if (templateFilter === "Rejected") return s === "REJECTED";
      return s !== "APPROVED" && s !== "REJECTED";
    });
  }, [templates, templateQuery, templateFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp Integration"
        title="WhatsApp"
        subtitle="Live conversations from the business number, and the real approval status of every template."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="card flex h-[640px] flex-col lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-base font-bold text-ink-950">Conversations</h3>
            {conversations.length > 0 && <span className="text-xs text-ink-400">{conversations.length}</span>}
          </div>
          {inboxLoading ? (
            <div className="p-6"><InlineSpinner /></div>
          ) : inboxError ? (
            <div className="p-6 text-sm text-coral-600">{inboxError}</div>
          ) : !conversations.length ? (
            <EmptyState title="No conversations yet" subtitle="Inbound and outbound WhatsApp messages will show up here." />
          ) : (
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {conversations.map((c) => {
                const key = c.phoneNumber || c.waUserId;
                const isActive = current && (current.phoneNumber || current.waUserId) === key;
                return <ConversationRow key={key} c={c} isActive={isActive} onSelect={setActive} />;
              })}
            </div>
          )}
        </div>

        <div className="card h-[640px] lg:col-span-5">
          {current ? (
            <Thread key={current.phoneNumber || current.waUserId} contact={current} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="Select a conversation" subtitle="Pick a contact on the left to see the full message history." />
            </div>
          )}
        </div>

        <div className="card flex h-[640px] flex-col p-5 lg:col-span-4">
          <h3 className="font-display text-base font-bold text-ink-950">Approved templates</h3>
          <p className="mb-3 text-xs text-ink-500">Only WhatsApp-approved templates can be triggered automatically.</p>

          {!templatesLoading && templates.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => {
                  const count = f === "All" ? templates.length : templateCounts[f];
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTemplateFilter(f)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        templateFilter === f ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-line text-ink-500 hover:bg-surface-muted"
                      }`}
                    >
                      {f} <span className="text-ink-400">({count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative mb-3 shrink-0">
                <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="field-input w-full pl-8 text-sm"
                />
              </div>
            </>
          )}

          {templatesLoading ? (
            <InlineSpinner />
          ) : templatesError ? (
            <p className="text-sm text-coral-600">{templatesError}</p>
          ) : !templates.length ? (
            <EmptyState title="No templates found" subtitle="Nothing has been created on this WhatsApp Business Account yet." />
          ) : !filteredTemplates.length ? (
            <p className="py-6 text-center text-xs text-ink-400">No templates match.</p>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredTemplates.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12.5px] font-medium text-ink-900">{t.name}</p>
                    {t.category && <p className="text-[10px] uppercase tracking-wide text-ink-400">{t.category.toLowerCase()}</p>}
                  </div>
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
