import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";
import CommissionShares from "./CommissionShares";

// Statutory TDS: the parameters in force (changed only by the Super Admin for a
// change in law), the unified per-PAN ledger by financial year, and - for a
// broker - their own commission shares.

const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-12 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const fyNow = () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, "0")}`; };

function Statutory({ superAdmin }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/tax/statutory");
  const [f, setF] = useState({ key: "tds_commission_percent", value: "", effectiveFrom: new Date().toISOString().slice(0, 10), legalBasis: "" });
  if (!data) return <Spinner />;
  const save = () => call("/tax/statutory", { method: "POST", body: { ...f, value: Number(f.value) } }).then(() => { toast.push("Recorded. It applies from its effective date.", "success"); reload(); setF({ ...f, value: "", legalBasis: "" }); }).catch((e) => toast.push(e.message, "error"));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[["TDS rate", `${data.inForce.rate}%`], ["Yearly threshold per PAN", formatINR(data.inForce.threshold)], ["Rate without PAN", `${data.inForce.noPanRate}%`]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 text-2xl font-extrabold text-ink-950">{v}</p></div>
        ))}
      </div>
      {superAdmin && (
        <div className="card space-y-3 p-5">
          <p className="text-sm font-bold text-ink-900">Record a change in law</p>
          <p className="text-xs text-ink-500">Only to reflect a Finance Act amendment or CBDT notification. It applies from its effective date forward; earlier payouts keep the old figures. Versions are never edited.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field-label">Parameter<select className="field-select mt-1" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })}>{data.keys.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></label>
            <label className="field-label">New value<input type="number" className="field-input mt-1" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></label>
            <label className="field-label">Effective from<input type="date" className="field-input mt-1" value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} /></label>
          </div>
          <label className="field-label">Legal basis<input className="field-input mt-1" placeholder="e.g. Finance (No. 2) Act 2024 - s. 194H rate reduced" value={f.legalBasis} onChange={(e) => setF({ ...f, legalBasis: e.target.value })} /></label>
          <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={f.value === "" || f.legalBasis.trim().length < 10} onClick={save}>Record version</button></div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Parameter</th><th className={th}>Value</th><th className={th}>From</th><th className={th}>Legal basis</th><th className={th}>Recorded by</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.versions.map((v) => (
              <tr key={v.id}><td className={th}>{v.label}</td><td className={th}>{v.key === "tds_annual_threshold" ? formatINR(v.value) : `${v.value}%`}</td><td className={th}>{formatDate(v.effectiveFrom)}</td><td className={`${th} text-xs`} data-no-translate>{v.legalBasis}</td><td className={`${th} text-xs`} data-no-translate>{v.setBy || "Initial setup"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Ledger() {
  const [fy, setFy] = useState(fyNow());
  const [q, setQ] = useState("");
  const { data } = useApiQuery(`/tax/ledger?fy=${fy}${q ? `&q=${encodeURIComponent(q)}` : ""}`);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="field-label">Financial year<input className="field-input mt-1 w-32" value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27" /></label>
        <label className="field-label">Name or PAN last 4<input className="field-input mt-1 w-56" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {data && <p className="text-sm text-ink-700">Paid {formatINR(data.totals.gross)} · TDS {formatINR(data.totals.tds)}</p>}
      </div>
      {!data ? <Spinner /> : !data.payees.length ? <div className="card"><EmptyState title="No payouts in this year" /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Payee</th><th className={th}>PAN</th><th className={th}>Paid (before GST)</th><th className={th}>TDS</th><th className={th}>Payouts</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.payees.map((p, i) => (
                <tr key={i}><td className={th} data-no-translate>{p.payeeName}</td><td className={th}>{p.noPan ? <span className="text-red-600">No PAN</span> : `••••${p.panLast4}`}</td><td className={th}>{formatINR(p.gross)}</td><td className={th}>{formatINR(p.tds)}</td><td className={`${th} text-xs`}>{p.commissionPayouts} commission · {p.wfhPayouts} field partner</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TaxPage() {
  const { role } = useAuth();
  const staff = ["internal_sales", "admin", "super_admin"].includes(role);
  const [tab, setTab] = useState(staff ? "statutory" : "mine");
  const tabs = staff ? [["statutory", "Statutory TDS"], ["ledger", "TDS ledger by PAN"]] : [["mine", "My commission shares"]];
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Tax" title={staff ? "TDS and payouts" : "My commission shares"} subtitle={staff ? "TDS on commission settlements and field-partner payouts, applied as the law prescribes, with one yearly total per PAN across both." : "Your share of franchise-territory deals, the GST invoice you raise to A R Buildwel, and what was paid after TDS."} />
      {tabs.length > 1 && <div className="flex gap-2 border-b border-line">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? "border-red-600 text-red-600" : "border-transparent text-ink-500"}`}>{l}</button>)}</div>}
      {tab === "statutory" && <Statutory superAdmin={role === "super_admin"} />}
      {tab === "ledger" && <Ledger />}
      {tab === "mine" && <CommissionShares base="/tax/commission-shares" showProfile />}
    </div>
  );
}
