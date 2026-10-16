import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuBell, LuBuilding2, LuCalendar, LuCircleAlert, LuClock, LuFileText, LuInfo, LuNewspaper, LuZap } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";

// Module 43 - Notification Centre: everything this person was told, filtered
// by type group, read state and date. The two red alerts (a mandate one day
// from expiry, an overdue invoice) stay at the top until their cause is settled.

const ROUTES = {
  lead: (id) => `/app/leads/${id}`,
  property: (id) => `/app/properties/${id}`,
  deal: (id) => `/app/deals/${id}`,
  invoice: () => "/app/invoices",
  mandate: () => "/app/mandates",
  task: () => "/app/tasks",
  bd_lead: () => "/app/business-leads",
  opportunity_interest: () => "/app/opportunities",
  investor_profile: () => "/app/investors",
  nri_service_request: () => "/app/investors",
  market_digest: () => "/app/market-digest",
  wfh_assignment: () => "/app/field-network",
};
const ICON = { match: LuZap, deal: LuCalendar, mandate: LuClock, invoice: LuFileText, market: LuNewspaper, system: LuInfo };
const TONE = { critical: "text-red-600 bg-red-50", high: "text-amber-600 bg-amber-50", normal: "text-ink-600 bg-surface-sunk", low: "text-ink-400 bg-surface-sunk" };

function timeAgo(value) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default function NotificationCentrePage() {
  const call = useApiCall();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ category: "", isRead: "", from: "", to: "", page: 1 });
  const list = useApiQuery(`/notifications${buildQuery({ ...f, limit: 25 })}`);
  const summary = useApiQuery("/notifications/summary");
  const alerts = useApiQuery("/notifications/alerts");
  const set = (patch) => setF((cur) => ({ ...cur, page: 1, ...patch }));
  const items = list.data?.items || [];
  const pages = list.data?.pagination?.totalPages || 1;

  const open = (n) => {
    if (!n.is_read) call(`/notifications/${n.id}/read`, { method: "PUT" }).then(() => { list.reload(); summary.reload(); }).catch(() => {});
    const route = ROUTES[n.related_entity_type];
    if (route) navigate(route(n.related_entity_id));
  };
  const markAll = () => call("/notifications/mark-all-read", { method: "PUT" }).then(() => { list.reload(); summary.reload(); toast.push("All marked as read.", "success"); }).catch((e) => toast.push(e.message, "error"));
  const chip = (active) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-red-600 bg-red-600 text-white" : "border-line bg-white text-ink-700 hover:bg-surface-muted"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Notifications"
        title="Notification Centre"
        subtitle="Everything you have been told, newest first. Choose how and when you are told in your preferences."
        actions={
          <div className="flex gap-2">
            <Link to="/app/settings?tab=notifications" className="btn-outline btn-sm">Preferences</Link>
            <button className="btn-primary btn-sm" disabled={!summary.data?.unread} onClick={markAll}>Mark all read</button>
          </div>
        }
      />

      {alerts.data?.total > 0 && (
        <div className="space-y-2">
          {alerts.data.items.slice(0, 5).map((n) => (
            <button key={n.id} onClick={() => open(n)} className="flex w-full items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left">
              <LuCircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-red-800" data-no-translate>{n.title}</span>
                {n.message && <span className="block text-xs text-red-700" data-no-translate>{n.message}</span>}
                <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-red-600">{n.related_entity_type === "mandate" ? "Stays here until the mandate is renewed or ends" : "Stays here until the invoice is paid"}</span>
              </span>
            </button>
          ))}
          {alerts.data.total > 5 && <p className="text-xs font-semibold text-red-700">and {alerts.data.total - 5} more alerts that need action</p>}
        </div>
      )}

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <button className={chip(!f.category && f.isRead === "")} onClick={() => set({ category: "", isRead: "" })}>All</button>
          <button className={chip(f.isRead === "false")} onClick={() => set({ isRead: f.isRead === "false" ? "" : "false" })}>Unread{summary.data?.unread ? ` (${summary.data.unread})` : ""}</button>
          {(summary.data?.categories || []).map((c) => (
            <button key={c.key} className={chip(f.category === c.key)} onClick={() => set({ category: f.category === c.key ? "" : c.key })}>
              {c.label}{c.unread ? ` (${c.unread})` : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-ink-600">From<input id="nc-from" type="date" className="field-input mt-1" value={f.from} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-ink-600">To<input id="nc-to" type="date" className="field-input mt-1" value={f.to} onChange={(e) => set({ to: e.target.value })} /></label>
          {(f.from || f.to) && <button className="btn-outline btn-sm" onClick={() => set({ from: "", to: "" })}>Clear dates</button>}
        </div>
      </div>

      {list.loading && !list.data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : !items.length ? (
        <div className="card"><EmptyState icon={LuBell} title="No notifications yet" subtitle="Post a property or requirement to start receiving matches and updates." /></div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((n) => {
            const Icon = n.type?.startsWith("institutional") ? LuBuilding2 : ICON[n.category] || LuInfo;
            return (
              <button key={n.id} onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted ${n.is_read ? "" : "bg-red-50/40"}`}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[n.priority] || TONE.normal}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.is_read ? "text-ink-700" : "font-bold text-ink-950"}`} data-no-translate>{n.title}</span>
                  {n.message && <span className="block text-xs text-ink-500 line-clamp-2" data-no-translate>{n.message}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-ink-400" title={new Date(n.created_at).toLocaleString("en-IN")}>{timeAgo(n.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <button className="btn-outline btn-sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>Newer</button>
          <span className="text-ink-500">Page {f.page} of {pages}</span>
          <button className="btn-outline btn-sm" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })}>Older</button>
        </div>
      )}
    </div>
  );
}
