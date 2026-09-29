import { useMemo, useState } from "react";
import { LuFlame, LuStar, LuShare2, LuSend, LuPlay, LuCheck, LuX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import MatchBadge from "../../components/common/MatchBadge";
import StatusBadge from "../../components/common/StatusBadge";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Engine 5 Requirement Marketplace + sec. 7 Matching Engine controls.
//   Marketplace - buyer-first: active requirements (identity masked), Hot
//     and Priority (Exclusive Mandate) tagged, each with its best match
//     against the broker's own listings; send a listing into the buyer's
//     matches or share the requirement with a partner broker
//     (mandate-verification routing).
//   Shares - requirements shared with / by me; accept or decline.
//   Engine (admin) - live weights (configured vs learned), thresholds,
//     matches by tier, behaviour events, A/B test and job controls.

const ADMIN = ["admin", "super_admin"];
const COMPONENT_LABELS = { location: "Location", budget: "Budget", type: "Type", area: "Area / size", amenities: "Amenities" };

function Tag({ tone, icon: Icon, children }) {
  const cls = { red: "bg-red-50 text-red-700", indigo: "bg-indigo-50 text-indigo-700", green: "bg-emerald-50 text-emerald-700" }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {Icon && <Icon className="h-3 w-3" />} {children}
    </span>
  );
}

function Marketplace() {
  const toast = useToast();
  const call = useApiCall();
  const [filters, setFilters] = useState({ city: "", purpose: "", hotOnly: false, priorityOnly: false, sharedOnly: false });
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, String(v)));
    return p.toString();
  }, [filters]);
  const { data, loading, error, reload } = useApiQuery(`/matching/marketplace?${qs}`);
  const [sharing, setSharing] = useState(null);
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState("");
  const partners = useApiQuery(sharing ? "/matching/partners" : null);
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold text-ink-600">
          City
          <input className="field-input mt-1 w-44" value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))} placeholder="Any" />
        </label>
        <label className="text-xs font-semibold text-ink-600">
          Purpose
          <select className="field-input mt-1 w-32" value={filters.purpose} onChange={(e) => setFilters((f) => ({ ...f, purpose: e.target.value }))}>
            <option value="">Any</option>
            <option value="buy">Buy</option>
            <option value="rent">Rent</option>
          </select>
        </label>
        {[
          ["hotOnly", "Hot only"],
          ["priorityOnly", "Priority only"],
          ["sharedOnly", "Shared with me"],
        ].map(([k, l]) => (
          <label key={k} className="flex items-center gap-2 pb-2 text-sm text-ink-700">
            <input type="checkbox" checked={filters[k]} onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.checked }))} /> {l}
          </label>
        ))}
      </div>

      {loading ? (
        <InlineSpinner />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !rows.length ? (
        <div className="card p-8 text-center text-sm text-ink-500">No active requirements match these filters.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Best match with my listings</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">
                      {r.purpose === "rent" ? "Rent" : "Buy"} · {titleCase(r.propertyType) || "Any property"} · {[...(r.localities || []), r.city].join(", ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.hot && <Tag tone="red" icon={LuFlame}>Hot requirement</Tag>}
                      {r.priority && <Tag tone="indigo" icon={LuStar}>Priority buyer</Tag>}
                      {r.sharedWithMe && <Tag tone="green">Shared with you · {r.sharedWithMe}</Tag>}
                      <span className="text-xs text-ink-500">posted {formatDate(r.postedAt)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.budgetDisplay}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {r.bedrooms ? `${r.bedrooms}+ BHK` : ""}
                    {r.areaMinSqft || r.areaMaxSqft ? ` ${r.areaMinSqft || "?"}-${r.areaMaxSqft || "?"} sq.ft` : ""}
                    {!r.bedrooms && !r.areaMinSqft && !r.areaMaxSqft ? "Any" : ""}
                  </td>
                  <td className="px-4 py-3">
                    {r.bestMatchWithMyListings ? (
                      <div className="space-y-1">
                        <MatchBadge score={r.bestMatchWithMyListings.score} tier={r.bestMatchWithMyListings.tier} breakdown={r.bestMatchWithMyListings.breakdown} />
                        <p className="max-w-[220px] truncate text-xs text-ink-500">{r.bestMatchWithMyListings.title}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-500">No listing of yours</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">{r.expiresAt ? formatDate(r.expiresAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {r.bestMatchWithMyListings && r.bestMatchWithMyListings.score >= 60 && (
                        <button
                          className="btn-outline btn-sm"
                          disabled={busy === r.id}
                          title="Send your best-matching listing to this buyer"
                          onClick={() =>
                            run(r.id, () => call(`/matching/requirements/${r.id}/send`, { method: "POST", body: { propertyId: r.bestMatchWithMyListings.propertyId } }), "Listing sent to the buyer.")
                          }
                        >
                          <LuSend className="h-3.5 w-3.5" /> Send
                        </button>
                      )}
                      <button className="btn-outline btn-sm" title="Share with a partner broker" onClick={() => { setSharing(r); setPartner(""); setNote(""); }}>
                        <LuShare2 className="h-3.5 w-3.5" /> Share
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!sharing} onClose={() => setSharing(null)} title="Share requirement" description="Mandate-verification routing - the partner broker sees this requirement in their marketplace.">
        <div className="space-y-4">
          <SelectField
            label="Partner broker"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder={partners.loading ? "Loading…" : "Choose a broker"}
            options={(partners.data || []).map((p) => ({ value: p.id, label: p.full_name }))}
          />
          <TextareaField label="Note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setSharing(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!partner || busy === "share"}
              onClick={() =>
                run("share", () => call(`/matching/requirements/${sharing.id}/share`, { method: "POST", body: { brokerId: partner, note: note || undefined } }), "Requirement shared.").then((ok) => ok && setSharing(null))
              }
            >
              Share
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Shares() {
  const toast = useToast();
  const call = useApiCall();
  const { user } = useAuth();
  const { data, loading, reload } = useApiQuery("/matching/shares");
  const respond = async (id, action) => {
    try {
      await call(`/matching/shares/${id}`, { method: "PUT", body: { action } });
      toast.push(action === "accept" ? "Accepted." : "Declined.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (loading) return <InlineSpinner />;
  const rows = data || [];
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No requirements shared yet.</div>;
  return (
    <div className="card divide-y divide-line">
      {rows.map((s) => {
        const incoming = s.shared_with === user?.id;
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold text-ink-900">
                {s.purpose === "rent" ? "Rental" : "Purchase"} requirement · {s.city}{s.budget_max ? ` · up to ${formatINR(s.budget_max)}` : ""}
              </p>
              <p className="text-xs text-ink-500">
                {incoming ? `From ${s.shared_by_name}` : `To ${s.shared_with_name}`} · {formatDate(s.created_at)}{s.note ? ` · "${s.note}"` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={titleCase(s.status)} />
              {incoming && s.status === "pending" && (
                <>
                  <button className="btn-outline btn-sm" onClick={() => respond(s.id, "accept")}><LuCheck className="h-3.5 w-3.5" /> Accept</button>
                  <button className="btn-outline btn-sm" onClick={() => respond(s.id, "decline")}><LuX className="h-3.5 w-3.5" /> Decline</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeightBars({ title, weights, compare }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
      <ul className="space-y-2 text-sm">
        {Object.entries(weights || {}).map(([k, v]) => (
          <li key={k}>
            <div className="flex justify-between">
              <span className="text-ink-700">{COMPONENT_LABELS[k] || k}</span>
              <span className="font-semibold text-ink-900">
                {Math.round(v * 10) / 10}%{compare && compare[k] != null && Math.abs(compare[k] - v) >= 0.1 ? ` (was ${compare[k]}%)` : ""}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-muted"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, v * 2)}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Engine() {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const overview = useApiQuery("/matching/overview");
  const ab = useApiQuery("/matching/ab-report?days=30");
  const [busy, setBusy] = useState(null);
  const job = async (name) => {
    setBusy(name);
    try {
      const res = await call(`/matching/jobs/${name}`, { method: "POST" });
      toast.push(res.message || "Done.", "success");
      overview.reload();
      ab.reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };
  const promote = async () => {
    if (!window.confirm("Make variant B's weights the live weights and end the test?")) return;
    setBusy("promote");
    try {
      await call("/matching/ab/promote", { method: "POST" });
      toast.push("Variant B promoted.", "success");
      overview.reload();
      ab.reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };
  if (overview.loading) return <InlineSpinner />;
  const o = overview.data;
  if (!o) return <p className="text-sm text-red-600">{overview.error}</p>;
  const run = o.lastNightlyRun;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Active requirements", o.requirements?.active],
          ["Hot requirements", o.requirements?.hot],
          ["Priority buyers", o.requirements?.priority],
          ["Hot matches", o.matchesByTier?.hot || 0],
          ["Warm / Lukewarm", `${o.matchesByTier?.warm || 0} / ${o.matchesByTier?.lukewarm || 0}`],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs text-ink-500">{l}</p>
            <p className="mt-1 text-xl font-bold text-ink-950">{v ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <WeightBars title={o.learned ? "Live weights (AI-learned)" : "Live weights (binding)"} weights={o.weights} compare={o.learned ? o.baseWeights : null} />
          {o.learned && <p className="mt-3 text-xs text-ink-500">Learned {formatDate(o.learned.learnedAt, true)} from {o.learned.positives} engagements / {o.learned.shown} impressions.</p>}
          <p className="mt-3 text-xs text-ink-500">
            Thresholds: Hot {o.thresholds.hot} · Warm {o.thresholds.warm} · Lukewarm {o.thresholds.lukewarm}. Radius {o.radiusKm} km. Boosts: mandate +{o.boosts.mandate}, price-compatible +{o.boosts.priceCompatible}, {o.boosts.patterns} learned patterns.
            Edit in Admin Panel → Configuration (matching.*).
          </p>
        </div>
        <div className="card p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Behaviour (30 days)</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {["shown", "clicked", "enquired", "visited", "converted", "sent"].map((k) => (
              <div key={k}><dt className="text-xs text-ink-500">{titleCase(k)}</dt><dd className="font-semibold text-ink-900">{o.events30d?.[k] || 0}</dd></div>
            ))}
          </dl>
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-ink-500">Nightly run</p>
          {run ? (
            <p className="text-xs text-ink-600">
              {formatDate(run.at, true)} · {run.requirements} requirements, {run.matched} matches, {run.hot} hot · expiry: {run.expiry?.warned} warned / {run.expiry?.expired} expired · learning:{" "}
              {run.learning?.learned ? "updated" : run.learning?.reason || "skipped"}
            </p>
          ) : (
            <p className="text-xs text-ink-500">Not run yet.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["nightly", "Re-match all"],
              ["learn", "Learn weights"],
              ["digest", "Send Warm digest"],
              ["expiry", "Process expiry"],
            ].map(([k, l]) => (
              <button key={k} className="btn-outline btn-sm" disabled={!!busy} onClick={() => job(k)}>
                <LuPlay className="h-3.5 w-3.5" /> {busy === k ? "Running…" : l}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">A/B test {ab.data?.enabled ? `(on, ${ab.data.splitPercent}% in B)` : "(off)"}</p>
          {ab.data ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-500">
                <tr><th className="py-1">Variant</th><th className="py-1">Shown</th><th className="py-1">Click</th><th className="py-1">Enquiry</th><th className="py-1">Conv.</th></tr>
              </thead>
              <tbody>
                {["A", "B"].map((v) => {
                  const r = ab.data.variants[v];
                  return (
                    <tr key={v} className="border-t border-line">
                      <td className="py-1.5 font-semibold">{v}</td>
                      <td className="py-1.5">{r.shown}</td>
                      <td className="py-1.5">{r.clickRate}%</td>
                      <td className="py-1.5">{r.enquiryRate}%</td>
                      <td className="py-1.5">{r.conversionRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <InlineSpinner />
          )}
          <p className="mt-3 text-xs text-ink-500">Turn the test on and set variant B's weights in matching.ab_test. Promote B when it converts better.</p>
          {role === "super_admin" && (
            <button className="btn-outline btn-sm mt-3" disabled={busy === "promote"} onClick={promote}>Promote variant B</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatchingPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState("marketplace");
  const tabs = [["marketplace", "Marketplace"], ["shares", "Shared requirements"], ...(ADMIN.includes(role) ? [["engine", "Matching engine"]] : [])];
  return (
    <div>
      <PageHeader
        eyebrow="Engine 5"
        title="Requirement Marketplace"
        subtitle="Buyer-first: live buyer requirements matched to your listings. Buyer identity stays with the A R representative."
      />
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "marketplace" && <Marketplace />}
      {tab === "shares" && <Shares />}
      {tab === "engine" && <Engine />}
    </div>
  );
}
