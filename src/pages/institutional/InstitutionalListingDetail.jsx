import { useState } from "react";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { titleCase } from "../../lib/format";

// Full view of an institutional listing for staff / the lister: what the
// public sees vs the confidential record, valuation intelligence (EBITDA-
// linked, asset-based, replacement cost, enrollment trend, exit potential,
// benchmarking) and the due-diligence report with the review items.

const cr = (v) => (v === null || v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`);
const SEV = { high: "bg-red-50 text-red-700", medium: "bg-amber-50 text-amber-700", low: "bg-surface-muted text-ink-600" };

function Box({ title, value, children }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 font-display text-xl font-extrabold text-ink-950">{value}</p>
      <div className="mt-2 space-y-0.5 text-xs text-ink-600">{children}</div>
    </div>
  );
}

export default function InstitutionalListingDetail({ id, staff }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery(`/institutional/listings/${id}`);
  const dd = useApiQuery(staff ? `/institutional/manage/listings/${id}/due-diligence` : null);
  const [note, setNote] = useState({});
  if (!data) return <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  const l = data.listing;
  const v = data.valuation;
  const report = dd.data || data.dueDiligence;

  const review = async (key, status) => {
    try {
      await call(`/institutional/manage/listings/${id}/due-diligence`, { method: "PUT", body: { key, status, note: note[key] || undefined } });
      toast.push("Review recorded.", "success");
      dd.reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const recompute = async () => {
    try {
      await call(`/institutional/manage/listings/${id}/valuation`, { method: "POST" });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-bold text-ink-950">{l.institutionName}</p>
        <p className="text-sm text-ink-600">{l.assetClassLabel}{l.boardAffiliation ? ` · ${l.boardAffiliation}` : ""}{l.yearEstablished ? ` · est. ${l.yearEstablished}` : ""} · {[l.locality, l.city].filter(Boolean).join(", ")}</p>
        <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-600"><b>What the public sees:</b> {l.summary}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {[["Transaction", l.dealTypeLabel], ["Asking", cr(l.askingPriceCr)], ["Revenue", cr(l.annualRevenueCr)], ["EBITDA", cr(l.ebitdaCr)], ["Campus", l.campusAreaAcres ? `${l.campusAreaAcres} acres` : "—"], ["Built-up", l.builtUpAreaSqft ? `${Number(l.builtUpAreaSqft).toLocaleString("en-IN")} sq ft` : "—"], [l.studentEnrollment ? "Students" : titleCase(l.capacityLabel || "Capacity"), l.studentEnrollment || l.capacityUnits || "—"], ["Faculty / staff", l.facultyCount || "—"], ["NOC", titleCase(l.nocStatus.replace(/_/g, " "))], ["Land", titleCase(l.landOwnership.replace(/_/g, " "))], ["Lat / long", l.latitude != null ? `${l.latitude}, ${l.longitude}` : "—"], ["Status", titleCase(String(l.status).replace(/_/g, " "))]].map(([k, val]) => (
          <div key={k}><dt className="text-xs text-ink-500">{k}</dt><dd className="font-semibold text-ink-900">{val}</dd></div>
        ))}
      </dl>
      {l.approvals.length > 0 && <p className="text-xs text-ink-600"><b>Approvals:</b> {l.approvals.map((a) => `${a.name} (${a.status})`).join(" · ")}</p>}

      {v && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold uppercase tracking-wide text-ink-500">Valuation intelligence</h4>
            {staff && <button className="text-xs font-semibold text-red-600 hover:underline" onClick={recompute}>Recompute</button>}
          </div>
          <p className="mt-1 text-sm text-ink-700">
            Indicative range <b>{v.indicativeRange ? `${cr(v.indicativeRange.lowCr)} – ${cr(v.indicativeRange.highCr)}` : "not available"}</b> · asking {cr(v.askingPriceCr)}
            {v.askingPosition ? ` (${v.askingPosition.replace(/_/g, " ")})` : ""}{v.impliedEbitdaMultiple ? ` · ${v.impliedEbitdaMultiple}x EBITDA at asking` : ""}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Box title="EBITDA-linked" value={cr(v.ebitdaLinked.valueCr)}>
              {v.ebitdaLinked.valueCr ? <><p>EBITDA {cr(v.ebitdaLinked.ebitdaCr)} × {v.ebitdaLinked.appliedMultiple}</p><p>Sector multiple {v.ebitdaLinked.sectorMultiple}{v.ebitdaLinked.trendAdjustmentPercent ? `, ${v.ebitdaLinked.trendAdjustmentPercent > 0 ? "+" : ""}${v.ebitdaLinked.trendAdjustmentPercent}% for enrollment trend` : ""}</p></> : <p>{v.ebitdaLinked.note}</p>}
            </Box>
            <Box title="Asset-based" value={cr(v.assetBased.valueCr)}>
              <p>Land {cr(v.assetBased.landValueCr)}{v.assetBased.landRatePerSqft ? ` @ ₹${Number(v.assetBased.landRatePerSqft).toLocaleString("en-IN")}/sq ft` : ""}</p>
              <p>Building {cr(v.assetBased.buildingReplacementCr)} · brand {cr(v.assetBased.brandValueCr)} · approvals {cr(v.assetBased.approvalValueCr)}</p>
              <p className="text-ink-400">{v.assetBased.landRateSource}</p>
              {v.assetBased.note && <p className="text-amber-700">{v.assetBased.note}</p>}
            </Box>
            <Box title="Replacement cost" value={cr(v.replacementCost.valueCr)}>
              {v.replacementCost.valueCr ? <p>Land + building + {v.replacementCost.setupPremiumPercent}% for approvals, time and pre-operative cost</p> : <p>{v.replacementCost.note}</p>}
            </Box>
            <Box title="Enrollment trend" value={titleCase(v.enrollmentTrend.trend)}>
              {v.enrollmentTrend.cagrPercent != null ? <p>{v.enrollmentTrend.cagrPercent}% a year over {v.enrollmentTrend.years} years ({v.enrollmentTrend.series.map((e) => e.count).join(" → ")})</p> : <p>Add enrollment by year to see the trend.</p>}
            </Box>
            <Box title="Exit potential" value={`${v.exitPotential.score}/100 · ${titleCase(v.exitPotential.band)}`}>
              {v.exitPotential.factors.map((x) => <p key={x.label}>{x.label}: {x.points}/{x.max}</p>)}
            </Box>
            <Box title="Benchmarking" value={v.benchmarking.impliedValueCr ? cr(v.benchmarking.impliedValueCr) : "—"}>
              {v.benchmarking.comparables ? <><p>{v.benchmarking.comparables} comparable(s), {v.benchmarking.sameCity} in this city</p>{v.benchmarking.implied.map((i) => <p key={i.basis}>{i.basis}: {cr(i.valueCr)}</p>)}{v.benchmarking.verdict && <p className="font-semibold text-ink-800">{v.benchmarking.verdict}{v.benchmarking.askingVsComparablesPercent != null ? ` (${v.benchmarking.askingVsComparablesPercent > 0 ? "+" : ""}${v.benchmarking.askingVsComparablesPercent}%)` : ""}</p>}</> : <p>{v.benchmarking.note}</p>}
            </Box>
          </div>
          <p className="mt-2 text-[11px] text-ink-400">{v.basis}</p>
        </div>
      )}

      {report && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-ink-500">Due diligence · {titleCase(report.status.replace(/_/g, " "))}</h4>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-ink-600">Regulatory documents in the data room ({report.checklist.length - report.missingCount}/{report.checklist.length})</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {report.checklist.map((c) => <li key={c.type} className={c.present ? "text-emerald-700" : "text-ink-600"}>{c.present ? "✓" : "○"} {c.label}</li>)}
              </ul>
              {staff ? <a href={`/app/deal-room/${id}`} className="mt-1 inline-block text-xs font-semibold text-red-600 hover:underline">Open the data room to upload documents →</a> : <p className="mt-1 text-[11px] text-ink-400">Send documents to your A R Buildwel representative to add them to the data room.</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-600">Risk flags ({report.riskFlags.length})</p>
              <ul className="mt-1 space-y-1">
                {report.riskFlags.map((x, i) => <li key={i} className="text-sm"><span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${SEV[x.severity]}`}>{x.severity}</span>{x.detail}</li>)}
                {report.riskFlags.length === 0 && <li className="text-sm text-emerald-700">No flags.</li>}
              </ul>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {report.review.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.status === "ok" ? "bg-emerald-50 text-emerald-700" : r.status === "issue" ? "bg-red-50 text-red-700" : "bg-surface-muted text-ink-600"}`}>{r.status}</span>
                <span className="min-w-[200px] flex-1 text-sm text-ink-800">{r.label}{r.note ? <span className="block text-xs text-ink-500">{r.note}</span> : null}</span>
                {staff && (
                  <>
                    <div className="w-56"><TextField label="" placeholder="Note" value={note[r.key] || ""} onChange={(e) => setNote((n) => ({ ...n, [r.key]: e.target.value }))} /></div>
                    <button className="btn-outline btn-sm" onClick={() => review(r.key, "ok")}>OK</button>
                    <button className="btn-outline btn-sm" onClick={() => review(r.key, "issue")}>Issue</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-ink-400">{data.disclaimer}</p>
    </div>
  );
}
