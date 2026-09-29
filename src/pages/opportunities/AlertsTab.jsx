import { useState } from "react";
import { LuSend } from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Investor deal alerts (Engine 4 + Module 43): priority deals go out at
// once, the rest wait for each investor's 9:30-10:30 window in their own
// time zone; the daily cap and repeated dismissals suppress extras.

const REASONS = {
  priority: "Priority (high score) - sent immediately",
  window: "Held for the investor's daily window",
  instant_preference: "Investor asked for instant alerts",
  daily_cap: "Daily cap reached (fatigue control)",
  repeatedly_dismissed_similar: "Investor keeps dismissing similar deals",
  deal_no_longer_live: "Deal no longer live",
};

export default function AlertsTab() {
  const call = useApiCall();
  const toast = useToast();
  const { role } = useAuth();
  const [status, setStatus] = useState("");
  const { data, loading, reload } = useApiQuery(`/opportunities/alerts${status ? `?status=${status}` : ""}`);
  const items = data?.items || [];
  const stats = (data?.last30Days || []).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + r.n }), {});

  const dispatch = async () => {
    try {
      const res = await call("/opportunities/alerts/dispatch", { method: "POST" });
      toast.push(`${res.data.sent} sent, ${res.data.capped} held back by the daily cap.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Sent (30 days)", stats.sent], ["Waiting for window", stats.pending], ["Suppressed", stats.suppressed]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 text-2xl font-bold text-ink-950">{v || 0}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All alerts</option>
          <option value="pending">Waiting for window</option>
          <option value="sent">Sent</option>
          <option value="suppressed">Suppressed</option>
        </select>
        {["admin", "super_admin"].includes(role) && (
          <button className="btn-outline btn-sm" onClick={dispatch}><LuSend className="h-4 w-4" /> Send due alerts now</button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr><th className="px-4 py-3">Investor</th><th className="px-4 py-3">Deal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Why</th><th className="px-4 py-3">Scheduled / sent</th><th className="px-4 py-3">Channels</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5 font-semibold text-ink-900">{a.investor_name}</td>
                <td className="px-4 py-2.5"><p className="text-ink-900">{a.property_title}</p><p className="text-xs text-ink-500">{titleCase(a.listing_category)} · {a.city}</p></td>
                <td className="px-4 py-2.5"><StatusBadge value={titleCase(a.status)} />{a.is_priority && <span className="ml-1 text-[10px] font-bold text-red-600">PRIORITY</span>}</td>
                <td className="px-4 py-2.5 text-xs text-ink-600">{REASONS[a.reason] || titleCase(a.reason || "")}</td>
                <td className="px-4 py-2.5 text-xs text-ink-600">{a.sent_at ? `Sent ${formatDate(a.sent_at, true)}` : a.scheduled_for ? formatDate(a.scheduled_for, true) : "—"}</td>
                <td className="px-4 py-2.5 text-xs">{(a.channels || []).join(", ") || "—"}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No alerts yet - alerts go out when an auction or special situation deal is approved.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
