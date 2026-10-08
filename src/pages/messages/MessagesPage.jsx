import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LuSend, LuShieldCheck, LuLock } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Module 36 - in-platform messaging. One conversation per enquiry between
// the enquirer, the lister and the assigned A R Buildwel representative.
// Contact details cannot be sent; the API rejects them and says why.
// New messages are picked up every few seconds while a conversation is open.

const STAFF = ["internal_sales", "admin", "super_admin"];
const PARTY_TONE = { enquirer: "bg-sky-50 text-sky-800", lister: "bg-amber-50 text-amber-800", representative: "bg-emerald-50 text-emerald-800", staff: "bg-emerald-50 text-emerald-800" };
const time = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function Conversation({ threadId, staff, onActivity }) {
  const call = useApiCall();
  const toast = useToast();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lastId = useRef(0);
  const bottom = useRef(null);

  useEffect(() => {
    let live = true;
    lastId.current = 0;
    setItems([]);
    setThread(null);
    setError(null);
    const load = async () => {
      try {
        const [t, m] = await Promise.all([call(`/chat/threads/${threadId}`), call(`/chat/threads/${threadId}/messages`)]);
        if (!live) return;
        setThread(t.data);
        setItems(m.data.items);
        lastId.current = m.data.items.at(-1)?.id || 0;
        call(`/chat/threads/${threadId}/read`, { method: "POST" }).then(onActivity).catch(() => {});
      } catch (err) {
        if (live) setError(err.message);
      }
    };
    load();
    const poll = setInterval(async () => {
      if (document.hidden) return;
      try {
        const m = await call(`/chat/threads/${threadId}/messages?after=${lastId.current}`);
        if (!live || !m.data.items.length) return;
        lastId.current = m.data.items.at(-1).id;
        setItems((cur) => [...cur, ...m.data.items.filter((x) => !cur.some((c) => c.id === x.id))]);
        call(`/chat/threads/${threadId}/read`, { method: "POST" }).then(onActivity).catch(() => {});
      } catch {
        /* next tick */
      }
    }, 5000);
    return () => { live = false; clearInterval(poll); };
  }, [threadId, call]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [items.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await call(`/chat/threads/${threadId}/messages`, { method: "POST", body: { body } });
      setItems((cur) => [...cur, res.data]);
      lastId.current = res.data.id;
      setText("");
      onActivity?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const setStatus = async (status) => {
    const reason = status === "closed" ? window.prompt("Reason for closing (shown in the conversation)") : null;
    if (status === "closed" && reason === null) return;
    try {
      setThread((await call(`/chat/threads/${threadId}/status`, { method: "PUT", body: { status, reason: reason || undefined } })).data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!thread) return <div className="flex justify-center py-24 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink-900" data-no-translate>{thread.subject}</p>
          {thread.status === "closed" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">Closed</span>}
          <span className="ml-auto flex gap-3 text-xs font-semibold">
            <button className="text-red-600 hover:underline" onClick={() => navigate(`/app/leads/${thread.leadId}`)}>Open lead</button>
            {staff && <button className="text-ink-600 hover:underline" onClick={() => setStatus(thread.status === "open" ? "closed" : "open")}>{thread.status === "open" ? "Close" : "Reopen"}</button>}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {thread.participants.map((p) => (
            <span key={p.userId} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PARTY_TONE[p.party]}`} data-no-translate>
              {p.name}{p.isMe ? " (you)" : ""} · {p.partyLabel}{p.platformNumber ? ` · ${p.platformNumber}` : ""}
            </span>
          ))}
        </div>
        {!thread.hasRepresentative && <p className="mt-2 text-xs text-amber-700">No A R Buildwel representative is assigned to this enquiry yet.</p>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface-muted/40 p-4">
        {items.length === 0 && <p className="py-10 text-center text-sm text-ink-500">No messages yet. Say hello.</p>}
        {items.map((m) => m.kind === "system" ? (
          <p key={m.id} className="text-center text-[11px] text-ink-500">{m.body} · {formatDate(m.at)}</p>
        ) : (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.mine ? "bg-red-600 text-white" : "bg-white text-ink-900"}`}>
              {!m.mine && <p className="mb-0.5 text-[11px] font-bold text-ink-500" data-no-translate>{m.senderName} · {m.partyLabel}</p>}
              <p className="whitespace-pre-wrap break-words" data-no-translate>{m.body}</p>
              <p className={`mt-1 text-right text-[10px] ${m.mine ? "text-white/70" : "text-ink-400"}`}>{formatDate(m.at)} {time(m.at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="border-t border-line p-3">
        {thread.status === "open" ? (
          <>
            <div className="flex items-end gap-2">
              <textarea id="chat-input" rows={2} className="field-input min-h-0 flex-1 resize-none" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className="btn-primary h-10" disabled={busy || !text.trim()} onClick={send}><LuSend className="h-4 w-4" /> Send</button>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-500"><LuLock className="h-3 w-3" /> {staff ? "You are the contact point: share only the platform number, never a party's own details." : thread.notice}</p>
          </>
        ) : <p className="text-center text-xs text-ink-500">This conversation is closed{thread.closedReason ? `: ${thread.closedReason}` : "."}</p>}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const call = useApiCall();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState("mine");
  const threads = useApiQuery(`/chat/threads${staff && scope === "all" ? "?scope=all" : ""}`);
  const startable = useApiQuery("/chat/startable");
  const active = params.get("thread");
  const open = (id) => setParams({ thread: id }, { replace: true });

  // /app/messages?lead=<id> opens (or creates) that enquiry's conversation.
  const lead = params.get("lead");
  useEffect(() => {
    if (!lead) return;
    call("/chat/threads", { method: "POST", body: { leadId: lead } })
      .then((r) => { setParams({ thread: r.data.id }, { replace: true }); threads.reload(); startable.reload(); })
      .catch((err) => { toast.push(err.message, "error"); setParams({}, { replace: true }); });
  }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = threads.data || [];
  return (
    <div className="space-y-4">
      <PageHeader title="Messages" />
      <div className="card grid min-h-[560px] overflow-hidden lg:h-[calc(100vh-220px)] lg:grid-cols-[320px_1fr]">
        <div className={`min-h-0 flex-col border-line lg:flex lg:border-r ${active ? "hidden" : "flex"}`}>
          {staff && (
            <div className="flex gap-1 border-b border-line p-2">
              {[["mine", "My conversations"], ["all", "All"]].map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${scope === k ? "bg-surface-muted text-ink-950" : "text-ink-500"}`}>{l}</button>)}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.loading && !threads.data ? <div className="flex justify-center py-10 text-ink-500"><InlineSpinner className="h-5 w-5" /></div> : rows.length === 0 ? <p className="p-5 text-sm text-ink-500">No conversations yet.</p> : rows.map((t) => (
              <button key={t.id} onClick={() => open(t.id)} className={`block w-full border-b border-line p-3 text-left hover:bg-surface-muted/60 ${active === t.id ? "bg-red-50" : ""}`}>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900" data-no-translate>{t.subject}</p>
                  {t.unread > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{t.unread}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-500" data-no-translate>{t.last ? `${t.last.mine ? "You: " : ""}${t.last.body}` : "No messages yet"}</p>
                <p className="mt-0.5 text-[10px] text-ink-400">{t.lastMessageAt ? formatDate(t.lastMessageAt) : ""}{t.status === "closed" ? " · closed" : ""}</p>
              </button>
            ))}
            {(startable.data || []).length > 0 && (
              <div className="p-3">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">Start a conversation</p>
                {startable.data.slice(0, 15).map((s) => (
                  <button key={s.leadId} className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50" onClick={() => setParams({ lead: s.leadId }, { replace: true })} data-no-translate>+ {s.subject}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={`min-h-0 flex-col lg:flex ${active ? "flex" : "hidden"}`}>
          {active && <button className="border-b border-line p-2 text-left text-xs font-semibold text-red-600 lg:hidden" onClick={() => setParams({}, { replace: true })}>← All conversations</button>}
          {active ? <Conversation key={active} threadId={active} staff={staff} onActivity={threads.reload} /> : (
            <div className="flex flex-1 items-center justify-center p-8"><EmptyState title="Choose a conversation" subtitle="Messages stay on the platform. Your A R Buildwel representative is part of every conversation, and contact details cannot be shared." /></div>
          )}
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-ink-500"><LuShieldCheck className="h-4 w-4" /> Every message is kept on record and cannot be edited or deleted.</p>
    </div>
  );
}
