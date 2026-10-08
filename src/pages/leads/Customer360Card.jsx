import { useState } from "react";
import { useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Customer 360 (Module 48) + lead score (Module 49) on the lead and
// customer pages: the score with what earned it, what the person has done
// on the website, where they came from (first / last campaign touch), and
// the full event timeline.

const CATEGORY = { hot: "bg-red-50 text-red-700", warm: "bg-amber-50 text-amber-700", nurture: "bg-blue-50 text-blue-700", cold: "bg-surface-muted text-ink-600" };
const EVENT_LABEL = {
  page_view: "Viewed a page", property_view: "Viewed a property", search_performed: "Searched", lead_created: "Enquiry created", property_enquiry: "Enquired on a property",
  site_visit_requested: "Requested a site visit", site_visit_completed: "Completed a site visit", lead_status_changed: "Status changed", login: "Signed in",
  registration_completed: "Registered", user_registered: "Registered", shortlist_added: "Saved a property", whatsapp_click: "Tapped WhatsApp", call_click: "Tapped call",
  deal_closure: "Deal closed", payment_event: "Payment", requirement_posted: "Posted a requirement", offer_made: "Made an offer", crm_activity_logged: "CRM activity",
};

function describe(e) {
  const p = e.properties_json || {};
  if (e.event_type === "lead_status_changed") return `${titleCase(p.from || "")} → ${titleCase(p.to || "")}`;
  if (e.event_type === "search_performed") return [p.query, p.filters?.city, p.result_count != null ? `${p.result_count} results` : null].filter(Boolean).join(" · ");
  if (e.event_type === "page_view") return p.url || p.title || "";
  return p.title || p.source || p.url || "";
}

export default function Customer360Card({ leadId, customerId }) {
  const path = leadId ? `/c360/leads/${leadId}` : `/c360/customers/${customerId}`;
  const { data: c, error } = useApiQuery(path);
  const [showTimeline, setShowTimeline] = useState(false);
  const cid = c?.customerId || customerId;
  const timeline = useApiQuery(showTimeline && cid ? `/c360/customers/${cid}/timeline?limit=40` : null);
  if (error || !c) return null;
  const s = c.leadScore || {};
  const b = c.behaviour || {};
  const t = c.transactions || {};
  const first = c.attribution?.first_touch;
  const last = c.attribution?.last_touch;
  const touch = (x) => [x.source, x.medium, x.campaign].filter(Boolean).join(" / ") || "direct";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Customer 360</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${CATEGORY[s.category] || CATEGORY.cold}`}>Lead score {s.score ?? 0} · {s.category || "cold"}</span>
      </div>

      {(s.breakdown || []).length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {s.breakdown.map((f) => (
            <li key={f.factor} className="flex justify-between gap-3 text-ink-700"><span>{f.label}</span><span className={`font-semibold ${f.points < 0 ? "text-red-600" : "text-emerald-700"}`}>{f.points > 0 ? "+" : ""}{f.points}</span></li>
          ))}
        </ul>
      )}
      {s.thresholds && <p className="mt-2 text-[11px] text-ink-400">Hot {s.thresholds.hot}+ · Warm {s.thresholds.warm}+ · Nurture {s.thresholds.nurture}+</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm sm:grid-cols-4">
        {[["Properties viewed", b.unique_properties_viewed], ["Searches", b.searches_performed], ["Enquiries", t.enquiries], ["Site visits done", t.site_visits_completed], ["Saved", t.properties_shortlisted], ["Deals closed", t.deals_closed], ["Minutes on site", b.total_platform_time_minutes], ["Engagement", c.engagementScore]].map(([l, v]) => (
          <div key={l}><p className="text-xs text-ink-500">{l}</p><p className="font-bold text-ink-950">{v ?? 0}</p></div>
        ))}
      </div>
      {t.lifetime_revenue_generated > 0 && <p className="mt-2 text-xs text-ink-600">Fees paid to date: <b>{formatINR(t.lifetime_revenue_generated)}</b></p>}

      {(b.localities_viewed || []).length > 0 && (
        <p className="mt-3 text-xs text-ink-600"><b>Looking in:</b> {b.localities_viewed.slice(0, 6).map((l) => l.name).join(", ")}</p>
      )}
      {(first || last) && (
        <p className="mt-2 text-xs text-ink-600">
          <b>Came from:</b> {first ? touch(first) : "—"}{last && first && touch(last) !== touch(first) ? ` · latest: ${touch(last)}` : ""}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-500">Last active {c.lastActiveAt ? formatDate(c.lastActiveAt, true) : "—"}</p>

      <button className="mt-3 text-xs font-semibold text-red-600 hover:underline" onClick={() => setShowTimeline((v) => !v)}>{showTimeline ? "Hide activity timeline" : "Show activity timeline"}</button>
      {showTimeline && (
        <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto border-l-2 border-red-100 pl-3">
          {(timeline.data?.items || []).map((e) => (
            <li key={e.event_id}>
              <p className="text-sm font-semibold text-ink-900">{EVENT_LABEL[e.event_type] || titleCase(e.event_type.replace(/_/g, " "))}</p>
              <p className="text-xs text-ink-500">{[describe(e), formatDate(e.event_timestamp, true), e.source_track === "browser" ? "website" : null].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
          {timeline.data && timeline.data.items.length === 0 && <li className="text-xs text-ink-500">No activity recorded yet.</li>}
        </ol>
      )}
    </div>
  );
}
