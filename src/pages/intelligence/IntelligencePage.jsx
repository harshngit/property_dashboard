import { useState } from "react";
import { Link } from "react-router-dom";
import { LuLightbulb, LuTrendingUp, LuTrendingDown, LuTriangleAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useApiQuery } from "../../hooks/useApi";
import { formatINR, titleCase } from "../../lib/format";

// Deal Intelligence Dashboard (Engine 5): conversion by city / locality /
// property type / broker, stage funnel with drop-off and days per stage,
// demand trends vs supply per locality, deals at risk (Module 40 health
// score) and recommended next actions.

const LABEL = { inquiry: "Enquiry", site_visit: "Site visit", negotiation: "Negotiation", booking: "Booking", documentation: "Documentation", payment: "Payment", closed_won: "Closed" };
const BAND = { at_risk: "bg-amber-50 text-amber-700", critical: "bg-red-50 text-red-700" };
const PRIORITY = { high: "border-red-200 bg-red-50/50", medium: "border-amber-200 bg-amber-50/40", low: "border-line bg-white" };

function Stat({ label, value, tone = "text-ink-950" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function Spark({ values }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-8 items-end gap-0.5">
      {values.map((v, i) => (
        <span key={i} className="w-2 rounded-sm bg-red-400" style={{ height: `${Math.max(4, (v / max) * 100)}%` }} title={String(v)} />
      ))}
    </div>
  );
}

function ConversionTable({ rows, label }) {
  if (!rows.length) return <p className="text-sm text-ink-500">No deals in this period.</p>;
  const max = Math.max(...rows.map((r) => r.deals));
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
        <tr><th className="py-2">{label}</th><th>Deals</th><th>Won</th><th>Conv.</th><th className="text-right">Won value</th></tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-2">
              <p className="font-semibold text-ink-900">{titleCase(String(r.key))}</p>
              <div className="mt-1 h-1.5 rounded-full bg-surface-muted"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${(r.deals / max) * 100}%` }} /></div>
            </td>
            <td>{r.deals}</td>
            <td>{r.won}</td>
            <td className="font-semibold">{r.conversion == null ? "—" : `${r.conversion}%`}</td>
            <td className="text-right">{formatINR(r.won_value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function IntelligencePage() {
  const [months, setMonths] = useState(6);
  const [dim, setDim] = useState("byCity");
  const { data: d, loading, error } = useApiQuery(`/orchestration/intelligence?months=${months}`);

  if (loading && !d) return <div className="flex justify-center py-24 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  if (error || !d) return <EmptyState title="Could not load deal intelligence" subtitle={error} />;
  const s = d.summary;
  const dims = [["byCity", "City"], ["byLocality", "Locality"], ["byType", "Property type"], ...(d.scope === "all" ? [["byBroker", "Broker"]] : [])];
  const maxReached = Math.max(1, ...d.funnel.map((f) => f.reached));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deal Intelligence"
        actions={
          <select className="field-select h-9 w-40 text-sm" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[3, 6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
          </select>
        }
      />
      <p className="-mt-4 text-sm text-ink-500">{d.scope === "all" ? "All deals on the platform." : "Your deals."}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open deals" value={s.open} />
        <Stat label="Pipeline value" value={formatINR(s.pipeline_value)} />
        <Stat label="Conversion (won / closed)" value={s.conversion == null ? "—" : `${s.conversion}%`} tone="text-emerald-700" />
        <Stat label="At risk / critical" value={`${s.at_risk} / ${s.critical}`} tone={s.critical ? "text-red-600" : "text-amber-600"} />
      </div>

      {d.recommendations.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500"><LuLightbulb className="h-4 w-4" /> Recommended actions</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {d.recommendations.map((r, i) => (
              <li key={i} className={`rounded-lg border p-3 text-sm text-ink-800 ${PRIORITY[r.priority]}`}>
                {r.dealId ? <Link to={`/app/deals/${r.dealId}`} className="hover:underline">{r.text}</Link> : r.kind === "match" ? <Link to="/app/matching" className="hover:underline">{r.text}</Link> : r.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Stage funnel</h3>
          <ul className="space-y-2">
            {d.funnel.map((f) => (
              <li key={f.stage}>
                <div className="flex justify-between text-xs text-ink-600">
                  <span className="font-semibold text-ink-900">{LABEL[f.stage]}</span>
                  <span>
                    {f.reached} deals{f.dropOffPercent != null ? ` · ${f.dropOffPercent}% drop` : ""}{f.avgDays != null ? ` · avg ${f.avgDays} d` : ""}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-muted"><div className={`h-2 rounded-full ${f.dropOffPercent >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(f.reached / maxReached) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-500">Won {s.won} · lost {s.lost}{s.avg_cycle_days != null ? ` · average ${s.avg_cycle_days} days enquiry to close` : ""}.</p>
        </div>

        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Conversion</h3>
            <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
              {dims.map(([k, l]) => (
                <button key={k} onClick={() => setDim(k)} className={`rounded-md px-3 py-1 text-xs font-semibold ${dim === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
              ))}
            </div>
          </div>
          <ConversionTable rows={d.conversion[dim] || []} label={dims.find(([k]) => k === dim)?.[1]} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Demand trends (buyer requirements)</h3>
          {d.demandTrends.length === 0 ? (
            <p className="text-sm text-ink-500">No buyer requirements in this period.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.demandTrends.map((t) => (
                <li key={t.locality} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{t.locality}</p>
                    <p className="text-xs text-ink-500">
                      {t.requirements} requirements · {t.listings} live listings{t.demandSupplyRatio != null ? ` · ${t.demandSupplyRatio}x demand/supply` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Spark values={t.series} />
                    <span className={`inline-flex w-16 items-center justify-end gap-0.5 text-xs font-bold ${t.growthPercent >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {t.growthPercent >= 0 ? <LuTrendingUp className="h-3.5 w-3.5" /> : <LuTrendingDown className="h-3.5 w-3.5" />} {t.growthPercent}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500"><LuTriangleAlert className="h-4 w-4" /> Deals at risk</h3>
          {d.atRisk.length === 0 ? (
            <p className="text-sm text-emerald-700">No deals at risk.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.atRisk.map((x) => (
                <li key={x.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/app/deals/${x.id}`} className="truncate text-sm font-semibold text-ink-900 hover:text-red-600">
                      {x.property_title || "Deal"}{x.customer_name ? ` · ${x.customer_name}` : ""}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${BAND[x.health_band]}`}>{x.health_score} · {titleCase(x.health_band)}</span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {LABEL[x.stage] || titleCase(x.stage)}{x.broker_name ? ` · ${x.broker_name}` : ""} · {(x.health_factors || []).map((f) => f.label).join("; ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
