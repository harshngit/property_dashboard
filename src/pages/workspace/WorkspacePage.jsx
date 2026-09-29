import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LuLock, LuClock, LuCircleAlert, LuCircleCheck, LuExternalLink, LuStar, LuTrash2, LuBell, LuBellOff,
  LuArrowRightLeft, LuMousePointerClick, LuLockKeyhole, LuMegaphone,
} from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Investor CRM workspace (Annexure A sec. 13.2 / 13.2A): the Full CRM a
// customer gets inside this app - HNI investors from joining, NRIs and
// other customers once they reach the usage threshold. Pipeline (Kanban)
// with SLA per stage, activity log, scored deal flow, saved searches,
// portfolio and analytics - all scoped to the signed-in investor. Deal
// stages are moved by the A R Buildwel relationship manager.

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || "https://propertyserch.com";
const STAGE_LABELS = {
  lead: "Lead",
  deal_interest: "Deal Interest",
  due_diligence: "Due Diligence",
  negotiation: "Negotiation",
  closure: "Closure",
  dropped: "Dropped",
};
const CATEGORY_LABELS = { auction: "Bank auction", special_situation: "Special situation", institutional: "Institutional" };
const SLA_STYLE = {
  on_track: { cls: "bg-emerald-50 text-emerald-700", label: "On track", icon: LuCircleCheck },
  due_soon: { cls: "bg-amber-50 text-amber-700", label: "Due soon", icon: LuClock },
  overdue: { cls: "bg-red-50 text-red-700", label: "Overdue", icon: LuCircleAlert },
};
// Sections - navigated from the sidebar (config/navigation.js).
const TABS = [
  ["", "Overview"],
  ["pipeline", "Pipeline"],
  ["deals", "Deal flow"],
  ["activity", "Activity"],
  ["saved", "Saved searches"],
  ["portfolio", "Portfolio"],
];

const dealUrl = (id) => `${WEBSITE_URL}/deals/${id}`;

function Card({ title, children, action }) {
  return (
    <div className="card p-5">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function Locked({ access }) {
  const t = access?.tier;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted">
        <LuLock className="h-5 w-5 text-ink-500" />
      </div>
      <h2 className="mt-4 font-display text-xl font-bold text-ink-950">Your Full CRM workspace isn't unlocked yet</h2>
      <p className="mt-2 text-sm text-ink-500">{access?.reason}</p>
      {t && (
        <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
          {[
            ["Completed deals", t.closedDeals, t.dealThreshold],
            ["Referred sign-ups", t.referredUsers, t.referralThreshold],
          ].map(([label, n, of]) => (
            <div key={label} className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-500">{label}</p>
              <p className="mt-1 font-semibold text-ink-900">{n} / {of}</p>
              <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
                <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, (n / of) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <a href={`${WEBSITE_URL}/dashboard`} className="btn-primary mt-6 inline-flex">
        Open my dashboard on the website <LuExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

function Overview() {
  const { data, loading, error } = useApiQuery("/workspace/summary");
  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  const p = data.pipeline;
  const inv = data.access.investor;
  const maxStage = Math.max(1, ...Object.values(p.byStage).map((s) => s.count));
  const t = data.portfolio?.totals;
  return (
    <div className="space-y-4">
      {inv && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <p className="text-ink-700">
            {[inv.isNri && "NRI", inv.isHni && "HNI"].filter(Boolean).join(" + ")} investor · Relationship manager:{" "}
            <b className="text-ink-900">{inv.managerName || "being assigned"}</b>
          </p>
          <StatusBadge value={titleCase(inv.verificationStatus)} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active deals" value={p.active} hint={`${p.total} in total`} />
        <Stat label="Pipeline value" value={p.activeValueDisplay} hint="active deals, bid / reserve" />
        <Stat label="Closed" value={p.closed} hint={`${p.conversionPercent}% conversion`} />
        <Stat label="Deal rooms" value={data.dealRooms.approved || 0} hint={`${data.dealRooms.pending_approval || 0} awaiting approval`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Pipeline by stage">
          <ul className="space-y-2.5 text-sm">
            {Object.entries(p.byStage).map(([stage, s]) => (
              <li key={stage}>
                <div className="flex items-center justify-between">
                  <span className="text-ink-700">{STAGE_LABELS[stage]}</span>
                  <span className="font-semibold text-ink-900">{s.count}{s.value ? ` · ${formatINR(s.value)}` : ""}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-muted">
                  <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Last 30 days">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Deals viewed", data.engagement30d.viewed || 0],
              ["Shortlisted", data.engagement30d.shortlisted || 0],
              ["Interests expressed", data.engagement30d.interest_expressed || 0],
              ["Documents requested", data.engagement30d.document_requested || 0],
              ["Deal alerts received", data.alerts30d?.sent || 0],
              ["Priority alerts", data.alerts30d?.priority || 0],
              ["Saved searches", data.savedSearches],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-500">{k}</dt>
                <dd className="font-semibold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {t && (
          <Card title="Portfolio" action={<Link to="/app/workspace/portfolio" className="text-xs font-semibold text-red-600">Details</Link>}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-ink-500">Invested</dt><dd className="font-semibold text-ink-900">{t.investedDisplay || formatINR(t.invested) || "₹0"}</dd></div>
              <div><dt className="text-xs text-ink-500">Current value</dt><dd className="font-semibold text-ink-900">{t.currentValueDisplay || formatINR(t.currentValue) || "₹0"}</dd></div>
              <div><dt className="text-xs text-ink-500">Unrealised gain</dt><dd className="font-semibold text-ink-900">{t.unrealisedGainPercent != null ? `${t.unrealisedGainPercent}%` : "—"}</dd></div>
              <div><dt className="text-xs text-ink-500">Net rental yield</dt><dd className="font-semibold text-ink-900">{t.netYieldPercent != null ? `${t.netYieldPercent}%` : "—"}</dd></div>
            </dl>
          </Card>
        )}
        {data.nri && (
          <Card title="NRI services" action={<a href={`${WEBSITE_URL}/dashboard/nri`} className="text-xs font-semibold text-red-600">Open</a>}>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-ink-500">Properties managed</dt><dd className="font-semibold text-ink-900">{data.nri.properties}</dd></div>
              <div><dt className="text-xs text-ink-500">Open service requests</dt><dd className="font-semibold text-ink-900">{data.nri.open_requests}</dd></div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}

function SlaBadge({ sla }) {
  const s = SLA_STYLE[sla?.status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function Pipeline() {
  const { data, loading, error } = useApiQuery("/workspace/pipeline");
  const [open, setOpen] = useState(null);
  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500">
        Stages are moved by your A R Buildwel relationship manager. SLA shows how long a deal has been in its stage against the expected time
        {data.overdue ? ` · ${data.overdue} overdue` : ""}.
      </p>
      {data.total === 0 ? (
        <div className="card">
          <EmptyState
            title="No deals in your pipeline yet"
            subtitle="Express interest in a deal and it appears here, then moves through Deal Interest, Due Diligence, Negotiation and Closure."
            action={<Link to="/app/workspace/deals" className="btn-primary">Browse deal flow</Link>}
          />
        </div>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {data.columns.map((col) => (
            <div key={col.stage} className="w-[260px] shrink-0 rounded-xl bg-surface-muted p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-700">{STAGE_LABELS[col.stage]}</p>
                <span className="rounded-full bg-white px-2 text-xs font-semibold text-ink-700">{col.items.length}</span>
              </div>
              <div className="space-y-2">
                {col.items.map((d) => (
                  <button key={d.id} type="button" onClick={() => setOpen(d)} className="card block w-full p-3 text-left hover:border-red-200">
                    <p className="line-clamp-2 text-sm font-semibold text-ink-900">{d.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{CATEGORY_LABELS[d.listing_category] || titleCase(d.listing_category)} · {d.city}</p>
                    <p className="mt-1 text-xs text-ink-700">{d.intended_bid_amount ? `Bid ${formatINR(d.intended_bid_amount)}` : d.ticket_display}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SlaBadge sla={d.sla} />
                      <span className="text-[11px] text-ink-500">{d.days_in_stage}d in stage</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title} description={open ? `${STAGE_LABELS[open.stage]} · ${open.city}` : ""} maxWidth="max-w-lg">
        {open && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-ink-500">Reserve / ask</dt><dd className="font-semibold text-ink-900">{open.ticket_display || "—"}</dd></div>
              <div><dt className="text-xs text-ink-500">Your intended bid</dt><dd className="font-semibold text-ink-900">{formatINR(open.intended_bid_amount) || "—"}</dd></div>
              <div><dt className="text-xs text-ink-500">Investment score</dt><dd className="font-semibold text-ink-900">{open.investment_score ?? "—"}</dd></div>
              <div><dt className="text-xs text-ink-500">Relationship manager</dt><dd className="font-semibold text-ink-900">{open.manager_name || "Being assigned"}</dd></div>
              <div><dt className="text-xs text-ink-500">In stage</dt><dd className="font-semibold text-ink-900">{open.days_in_stage} days{open.sla?.limitDays ? ` (SLA ${open.sla.limitDays})` : ""}</dd></div>
              {open.auction_date && <div><dt className="text-xs text-ink-500">Auction</dt><dd className="font-semibold text-ink-900">{formatDate(open.auction_date)}</dd></div>}
            </dl>
            {open.dropped_reason && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Dropped: {open.dropped_reason}</p>}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Stage history</p>
              <ol className="space-y-2 border-l border-line pl-4">
                <li className="text-xs text-ink-700">Interest registered · {formatDate(open.created_at, true)}</li>
                {open.history.map((h, i) => (
                  <li key={i} className="text-xs text-ink-700">
                    {STAGE_LABELS[h.from_stage] || "—"} → <b>{STAGE_LABELS[h.to_stage]}</b> · {formatDate(h.created_at, true)}
                    {h.notes ? <span className="block text-ink-500">{h.notes}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
            <a href={dealUrl(open.property_id)} target="_blank" rel="noreferrer" className="btn-outline inline-flex">
              Open deal & deal room <LuExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DealFlow({ isHni }) {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, error, reload } = useApiQuery(isHni ? "/hni/deals?limit=30" : "/opportunities?sort=score&limit=30");
  if (loading) return <InlineSpinner />;
  if (error) return <div className="card p-5 text-sm text-ink-700">{error}</div>;
  const items = data?.items || [];
  const track = async (deal, action) => {
    try {
      await call(`/hni/deals/${deal.id}/track`, { method: "POST", body: { action } });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-3">
      {data?.access && !data.access.full && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.access.reason}</p>
      )}
      {!items.length ? (
        <div className="card"><EmptyState title="No matching deals right now" subtitle="Update your investor profile's cities, deal types and ticket size to widen the net." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Deal</th>
                {isHni && <th className="px-4 py-3">Match</th>}
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Liquidity</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{d.title}</p>
                    <p className="text-xs text-ink-500">
                      {CATEGORY_LABELS[d.listing_category] || titleCase(d.listing_category)} · {[d.locality, d.city].filter(Boolean).join(", ")}
                      {d.auction_date ? ` · auction ${formatDate(d.auction_date)}` : ""}
                    </p>
                    {d.match_reasons?.length > 0 && <p className="text-xs text-ink-500">{d.match_reasons.join(" · ")}</p>}
                  </td>
                  {isHni && <td className="px-4 py-3 font-bold text-ink-900">{d.match_score != null ? `${d.match_score}%` : "—"}</td>}
                  <td className="px-4 py-3">{d.investment_score ?? "—"}</td>
                  <td className="px-4 py-3">{formatINR(d.reserve_price ?? d.price_value) || d.price || "—"}</td>
                  <td className="px-4 py-3">{d.discount_percent != null ? `${Math.round(d.discount_percent)}%` : "—"}</td>
                  <td className="px-4 py-3">{titleCase(d.liquidity_band) || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isHni && (
                        <button
                          type="button"
                          title={d.is_shortlisted ? "Remove from shortlist" : "Shortlist"}
                          onClick={() => track(d, d.is_shortlisted ? "unshortlisted" : "shortlisted")}
                          className={d.is_shortlisted ? "text-red-600" : "text-ink-400 hover:text-red-600"}
                        >
                          <LuStar className="h-4 w-4" fill={d.is_shortlisted ? "currentColor" : "none"} />
                        </button>
                      )}
                      <a href={dealUrl(d.id)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-red-600">Open</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(data?.disclaimers || []).map((d) => (
        <p key={d.key} className="text-[11px] leading-4 text-ink-500">
          <b>{d.title}:</b> {d.content_html}
        </p>
      ))}
    </div>
  );
}

const ACTIVITY = {
  stage_change: { icon: LuArrowRightLeft, label: (a) => {
    const [from, to] = a.detail.split(">");
    return `Moved ${from ? `from ${STAGE_LABELS[from]} ` : ""}to ${STAGE_LABELS[to]}`;
  } },
  deal_action: { icon: LuMousePointerClick, label: (a) => titleCase(a.detail) },
  deal_room: { icon: LuLockKeyhole, label: (a) => `Deal room: ${titleCase(a.detail)}` },
  alert: { icon: LuMegaphone, label: (a) => (a.detail.includes("priority") ? "Priority deal alert received" : "Deal alert received") },
};

function Activity() {
  const { data, loading, error } = useApiQuery("/workspace/activity?limit=150");
  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data.length) return <div className="card"><EmptyState title="No activity yet" subtitle="Deal views, shortlists, interests, stage changes, deal-room access and alerts appear here." /></div>;
  return (
    <div className="card divide-y divide-line">
      {data.map((a, i) => {
        const def = ACTIVITY[a.kind] || ACTIVITY.deal_action;
        const Icon = def.icon;
        return (
          <div key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted"><Icon className="h-4 w-4 text-ink-700" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-ink-900">{def.label(a)}</p>
              <a href={dealUrl(a.property_id)} target="_blank" rel="noreferrer" className="truncate text-xs text-ink-500 hover:underline">{a.title}</a>
              {a.kind === "stage_change" && a.notes && <p className="text-xs text-ink-500">{a.notes}</p>}
            </div>
            <span className="shrink-0 text-xs text-ink-500">{formatDate(a.at, true)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SavedSearches() {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, error, reload } = useApiQuery("/me/saved-searches");
  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  const run = async (fn, msg) => {
    try {
      await fn();
      toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (!data?.length) {
    return (
      <div className="card">
        <EmptyState
          title="No saved searches"
          subtitle="Save a search on the website and new matching listings are sent to you."
          action={<a href={`${WEBSITE_URL}/properties`} className="btn-primary">Search properties</a>}
        />
      </div>
    );
  }
  return (
    <div className="card divide-y divide-line">
      {data.map((s) => {
        const qs = new URLSearchParams(Object.entries(s.filters || {}).filter(([, v]) => v != null && v !== "")).toString();
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{s.name}</p>
              <p className="text-xs text-ink-500">
                {Object.entries(s.filters || {}).map(([k, v]) => `${titleCase(k)}: ${v}`).join(" · ") || "All properties"} · saved {formatDate(s.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`${WEBSITE_URL}/properties${qs ? `?${qs}` : ""}`} target="_blank" rel="noreferrer" className="btn-outline">Run</a>
              <button
                type="button"
                className="btn-outline"
                title={s.alerts_enabled ? "Turn alerts off" : "Turn alerts on"}
                onClick={() => run(() => call(`/me/saved-searches/${s.id}`, { method: "PUT", body: { alertsEnabled: !s.alerts_enabled } }), s.alerts_enabled ? "Alerts off." : "Alerts on.")}
              >
                {s.alerts_enabled ? <LuBell className="h-4 w-4" /> : <LuBellOff className="h-4 w-4" />}
              </button>
              <button type="button" className="btn-outline" title="Delete" onClick={() => run(() => call(`/me/saved-searches/${s.id}`, { method: "DELETE" }), "Deleted.")}>
                <LuTrash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Portfolio({ investor }) {
  const { data, loading, error } = useApiQuery(investor?.isHni ? "/hni/portfolio" : null);
  const nri = useApiQuery(investor?.isNri ? "/nri/properties" : null);
  const nriReq = useApiQuery(investor?.isNri ? "/nri/service-requests?limit=20" : null);
  if (!investor?.isHni && !investor?.isNri) {
    return <div className="card"><EmptyState title="No investments tracked" subtitle="Portfolio tracking is part of the NRI / HNI investor profile." /></div>;
  }
  return (
    <div className="space-y-4">
      {investor.isHni && (
        <Card title="HNI portfolio" action={<a href={`${WEBSITE_URL}/dashboard/hni`} className="text-xs font-semibold text-red-600">Add / edit on website</a>}>
          {loading ? <InlineSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> : !(data?.items || []).length ? (
            <p className="text-sm text-ink-500">No investments added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="py-2 pr-3">Investment</th><th className="py-2 pr-3">Cost</th><th className="py-2 pr-3">Value</th>
                    <th className="py-2 pr-3">Return</th><th className="py-2 pr-3">Net yield</th><th className="py-2 pr-3">Liquidity</th><th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3"><p className="font-semibold text-ink-900">{i.title}</p><p className="text-xs text-ink-500">{[i.locality, i.city].filter(Boolean).join(", ")}</p></td>
                      <td className="py-2 pr-3">{formatINR(i.metrics?.total_cost)}</td>
                      <td className="py-2 pr-3">{formatINR(i.metrics?.current_value)}</td>
                      <td className="py-2 pr-3">{i.metrics?.absolute_return_percent != null ? `${i.metrics.absolute_return_percent}%` : "—"}</td>
                      <td className="py-2 pr-3">{i.metrics?.net_rental_yield_percent != null ? `${i.metrics.net_rental_yield_percent}%` : "—"}</td>
                      <td className="py-2 pr-3">{i.liquidity ? `${i.liquidity.score} · ${titleCase(i.liquidity.band)}` : "—"}</td>
                      <td className="py-2"><StatusBadge value={titleCase(i.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(data?.disclaimers || []).map((d) => <p key={d.key} className="mt-3 text-[11px] text-ink-500"><b>{d.title}:</b> {d.content_html}</p>)}
        </Card>
      )}
      {investor.isNri && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Properties under management" action={<a href={`${WEBSITE_URL}/dashboard/nri`} className="text-xs font-semibold text-red-600">Manage on website</a>}>
            {nri.loading ? <InlineSpinner /> : !(nri.data || []).length ? <p className="text-sm text-ink-500">No properties added yet.</p> : (
              <ul className="divide-y divide-line text-sm">
                {nri.data.map((p) => (
                  <li key={p.id} className="py-2">
                    <p className="font-semibold text-ink-900">{p.title} <span className="font-normal text-ink-500">· {p.city}</span></p>
                    <p className="text-xs text-ink-500">
                      {titleCase(p.occupancy_status)} · {titleCase(p.management_status)}
                      {Number(p.rent_outstanding) > 0 ? ` · ${formatINR(p.rent_outstanding)} rent outstanding` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Service requests">
            {nriReq.loading ? <InlineSpinner /> : !(nriReq.data?.items || nriReq.data || []).length ? <p className="text-sm text-ink-500">No requests yet.</p> : (
              <ul className="divide-y divide-line text-sm">
                {(nriReq.data?.items || nriReq.data).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">{r.title}</p>
                      <p className="text-xs text-ink-500">{titleCase(r.request_type)} · {formatDate(r.created_at)}</p>
                    </div>
                    <StatusBadge value={titleCase(r.status)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { tab = "" } = useParams();
  const { data: access, loading, error } = useApiQuery("/workspace/access");

  return (
    <div>
      <PageHeader
        eyebrow="Investor workspace"
        title={TABS.find(([k]) => k === tab)?.[1] || "Overview"}
        subtitle="Your deals, pipeline, activity and portfolio - handled with your A R Buildwel relationship manager."
      />
      {loading ? (
        <InlineSpinner />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !access?.eligible ? (
        <Locked access={access} />
      ) : (
        <>
          {tab === "" && <Overview />}
          {tab === "pipeline" && <Pipeline />}
          {tab === "deals" && <DealFlow isHni={!!access.investor?.isHni} />}
          {tab === "activity" && <Activity />}
          {tab === "saved" && <SavedSearches />}
          {tab === "portfolio" && <Portfolio investor={access.investor} />}
        </>
      )}
    </div>
  );
}
