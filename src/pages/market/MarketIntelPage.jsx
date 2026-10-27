import { useState } from "react";
import { Link } from "react-router-dom";
import { LuTrendingUp, LuTrendingDown, LuMinus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// Engine 6 market intelligence (rule-based, non-advisory): every area of a city
// with its price trend, growth score, investment potential and recommendation;
// the buyers most likely to transact soon; and each broker's forecast of
// closures from their open pipeline.

const th = "px-4 py-3";
const TREND = {
  rising: [LuTrendingUp, "text-emerald-700", "Rising"],
  stable: [LuMinus, "text-ink-600", "Stable"],
  declining: [LuTrendingDown, "text-coral-600", "Declining"],
  unknown: [LuMinus, "text-ink-400", "Not enough data"],
};
const BAND = { likely: "bg-emerald-50 text-emerald-700", possible: "bg-amber-50 text-amber-700", unlikely: "bg-slate-100 text-slate-600", strong: "bg-emerald-50 text-emerald-700", steady: "bg-slate-100 text-slate-700", needs_support: "bg-coral-50 text-coral-700" };
const ADMIN = ["admin", "super_admin"];

function ScoreBar({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-ink-400">—</span>;
  const tone = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-slate-400";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted"><span className={`block h-full ${tone}`} style={{ width: `${value}%` }} /></span>
      <span className="text-xs font-semibold text-ink-800">{value}</span>
    </span>
  );
}

export default function MarketIntelPage() {
  const [tab, setTab] = useState("areas");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Insights" title="Market intelligence" subtitle="Area trends and investment scores from platform and public market data, the buyers most likely to transact, and expected closures by broker. Indicative guidance - not financial advice." />
      <div className="flex gap-2">
        {[["areas", "Areas"], ["intent", "Buyer intent"], ["brokers", "Broker forecast"]].map(([k, l]) => (
          <button key={k} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "areas" && <Areas />}
      {tab === "intent" && <Intent />}
      {tab === "brokers" && <Brokers />}
    </div>
  );
}

function Areas() {
  const { role } = useAuth();
  const call = useApiCall();
  const toast = useToast();
  const [input, setInput] = useState("");
  const [city, setCity] = useState("");
  const rec = useApiQuery(`/market-intel/recommended${buildQuery({ limit: 8 })}`);
  const rep = useApiQuery(city ? `/market-intel/areas${buildQuery({ city })}` : null);
  const snapshot = async () => {
    try {
      const r = await call("/market-intel/snapshots", { method: "POST" });
      toast.push(`Snapshot taken: ${r.data.areas} areas in ${r.data.cities} cities.`, "success");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Recommended investment areas</p>
        {rec.loading && !rec.data ? <InlineSpinner /> : !rec.data?.areas?.length ? <p className="text-sm text-ink-500">No area has enough data to recommend yet.</p> : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {rec.data.areas.map((a) => (
              <button key={`${a.city}-${a.locality}`} className="rounded-lg border border-line p-3 text-left hover:bg-surface-muted" onClick={() => { setInput(a.city); setCity(a.city); }}>
                <p className="text-sm font-bold text-ink-900" data-no-translate>{a.locality}, {a.city}</p>
                <p className="mt-0.5 text-xs text-ink-600">{a.summary}</p>
                <p className="mt-1"><ScoreBar value={a.potentialScore} /></p>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="field-label">City<input className="field-input mt-1 w-64" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setCity(input.trim())} placeholder="e.g. Gurugram" /></label>
        <button className="btn-primary" disabled={input.trim().length < 2} onClick={() => setCity(input.trim())}>Show areas</button>
        {ADMIN.includes(role) && <button className="btn-secondary ml-auto" onClick={snapshot}>Take this month's snapshot</button>}
      </div>
      {city && (rep.loading && !rep.data ? <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div> : !rep.data?.areas?.length ? (
        <div className="card"><EmptyState title="Not enough data in this city yet" description="An area is scored once it has a few live listings or public market data." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <p className="px-5 pt-4 text-xs text-ink-500">City median {rep.data.cityMedianPricePerSqft ? `Rs ${rep.data.cityMedianPricePerSqft.toLocaleString("en-IN")} / sq ft` : "—"}{rep.data.indexYoyPercent !== null ? ` · price index ${rep.data.indexYoyPercent}% a year` : ""}</p>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Area</th><th className={th}>Price trend</th><th className={th}>Rs / sq ft</th><th className={th}>Buyers / listing</th><th className={th}>Yield</th><th className={th}>Growth</th><th className={th}>Investment potential</th><th className={th}>Outlook</th></tr>
            </thead>
            <tbody>
              {rep.data.areas.map((a) => {
                const [Icon, tone, label] = TREND[a.trend] || TREND.unknown;
                return (
                  <tr key={a.locality} className="border-b border-line align-top last:border-0">
                    <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{a.locality}</span><span className="block text-[11px] text-ink-500">{a.liveListings} live · {a.buyerRequirements} requirements · {a.enquiries} enquiries</span></td>
                    <td className={`${th} ${tone}`}><span className="inline-flex items-center gap-1 font-semibold"><Icon className="h-4 w-4" />{label}</span>{a.trendPercent !== null && <span className="block text-[11px]">{a.trendPercent > 0 ? "+" : ""}{a.trendPercent}% a year</span>}</td>
                    <td className={th}>{a.medianPricePerSqft ? a.medianPricePerSqft.toLocaleString("en-IN") : "—"}</td>
                    <td className={th}>{a.demandSupplyRatio ?? "—"}{a.demandGrowthPercent !== null && <span className={`block text-[11px] ${a.demandGrowthPercent >= 0 ? "text-emerald-700" : "text-coral-600"}`}>{a.demandGrowthPercent >= 0 ? "+" : ""}{a.demandGrowthPercent}% demand</span>}</td>
                    <td className={th}>{a.rentalYieldPercent !== null ? `${a.rentalYieldPercent}%` : "—"}<span className="block text-[11px] text-ink-500">{a.liquidity ? `${a.liquidity} liquidity` : ""}</span></td>
                    <td className={th}><ScoreBar value={a.growthScore} /></td>
                    <td className={th}><ScoreBar value={a.potentialScore} /></td>
                    <td className={`${th} max-w-xs text-xs`}><span className="font-semibold text-ink-900">{a.recommendation}</span><span className="block text-ink-500">{a.reasons.join(" · ")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-5 pb-4 text-[11px] italic text-ink-500">{rep.data.disclaimer}</p>
        </div>
      ))}
    </div>
  );
}

function Intent() {
  const { data, loading } = useApiQuery("/market-intel/buyer-intent?limit=100");
  if (loading && !data) return <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div>;
  if (!data?.items?.length) return <div className="card"><EmptyState title="No scored buyers yet" description="Buyers appear here as their activity is scored." /></div>;
  return (
    <div className="card overflow-x-auto">
      <p className="px-5 pt-4 text-xs text-ink-500">{data.note}</p>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Buyer</th><th className={th}>Likelihood</th><th className={th}>Lead score</th><th className={th}>Why</th><th className={th}>Last active</th></tr></thead>
        <tbody>
          {data.items.map((b) => (
            <tr key={b.customerId} className="border-b border-line align-top last:border-0">
              <td className={th} data-no-translate>{b.leadId ? <Link to={`/app/leads/${b.leadId}`} className="font-semibold text-ink-900 hover:underline">{b.name}</Link> : b.name}</td>
              <td className={th}><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BAND[b.band]}`}>{b.band}</span> <span className="ml-1 text-xs font-semibold">{b.intentScore}</span></td>
              <td className={`${th} text-xs`}>{b.leadScore} · {b.leadCategory}</td>
              <td className={`${th} text-xs text-ink-600`}>{b.reasons.join(" · ")}</td>
              <td className={`${th} text-xs text-ink-500`}>{b.lastActiveAt ? formatDate(b.lastActiveAt, true) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Brokers() {
  const [horizon, setHorizon] = useState("90");
  const { data, loading } = useApiQuery(`/market-intel/broker-forecast?horizonDays=${horizon}`);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["30", "60", "90"].map((h) => <button key={h} className={`rounded-lg px-3 py-1 text-xs font-semibold ${horizon === h ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`} onClick={() => setHorizon(h)}>Next {h} days</button>)}
      </div>
      {loading && !data ? <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div> : !data?.brokers?.length ? (
        <div className="card"><EmptyState title="No open pipeline to forecast" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <p className="px-5 pt-4 text-xs text-ink-500">{data.note}</p>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Broker</th><th className={th}>Outlook</th><th className={th}>Expected closures</th><th className={th}>Expected value</th><th className={th}>Open deals</th><th className={th}>Why</th></tr></thead>
            <tbody>
              {data.brokers.map((b) => (
                <tr key={b.brokerId} className="border-b border-line align-top last:border-0">
                  <td className={`${th} font-semibold text-ink-900`} data-no-translate>{b.name}</td>
                  <td className={th}><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BAND[b.band]}`}>{b.band.replace("_", " ")}</span></td>
                  <td className={`${th} font-semibold`}>{b.expectedClosures}</td>
                  <td className={th}>{b.expectedValue ? formatINR(b.expectedValue) : "—"}</td>
                  <td className={th}>{b.openDeals}</td>
                  <td className={`${th} text-xs text-ink-600`}>{b.reasons.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 pb-4 text-[11px] text-ink-500">Chance of closing by stage: {data.stageOdds.map((o) => `${o.stage.replace(/_/g, " ")} ${o.closeChancePercent}%`).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}
