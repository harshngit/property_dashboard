import { useState } from "react";
import { useSelector } from "react-redux";
import { LuDownload, LuSettings2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, formatINR } from "../../lib/format";

// Employee incentives (contract sec. 33 / 34). Points come from what the
// platform records: inquiries attended or missed in the assignment cascade,
// response SLA breaches, site visits completed and deals closed won on the
// employee's deals. Related-party transactions never count for the related
// employee. The Super Admin sets the rules, approves each finished month and
// exports it for payroll - employees earn incentives (salary), never
// commissions. EM codes are internal and appear only on staff screens.

const th = "px-3 py-2.5";
const KINDS = [["cascade_attended", "Attended"], ["cascade_missed", "Missed"], ["sla_breached", "SLA breached"], ["site_visit_done", "Visits"], ["deal_closed", "Deals"], ["adjustment", "Adjust."]];
const thisMonth = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);
const pts = (n) => (n > 0 ? `+${n}` : String(n));

function Scorecard({ userId, period, onClose }) {
  const { data } = useApiQuery(`/incentives/employees/${userId}?period=${period}`);
  return (
    <Modal open onClose={onClose} title={data ? `${data.name} · ${data.emCode}` : "Scorecard"} description={data ? `${period}: ${data.points} points${data.amountInr ? ` · ${formatINR(data.amountInr, { compact: false })}` : ""}` : ""} maxWidth="max-w-2xl">
      {!data ? <InlineSpinner className="h-5 w-5" /> : !data.events.length ? <p className="text-sm text-ink-500">Nothing scored this month yet.</p> : (
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto text-sm">
          {data.events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2">
              <div>
                <p className="font-semibold text-ink-900">{e.label}{e.late && <span className="ml-1 text-[11px] font-normal text-ink-500">(from an approved month)</span>}</p>
                <p className="text-xs text-ink-500">{formatDate(e.at, true)}{e.note ? ` · ${e.note}` : ""}{e.excluded ? ` · ${e.excludeReason}` : ""}</p>
              </div>
              <span className={`shrink-0 font-mono font-semibold ${e.excluded ? "text-ink-400 line-through" : e.points < 0 ? "text-red-600" : "text-emerald-700"}`}>{pts(e.points)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function RulesLoader({ onClose, onDone }) {
  const { data } = useApiQuery("/incentives/rules");
  return data ? <RulesForm rules={data} onClose={onClose} onDone={onDone} /> : null;
}

function RulesForm({ rules, onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ ...rules, points: { ...rules.points }, monthlyCapInr: rules.monthlyCapInr ?? "" });
  const num = (v) => (v === "" ? 0 : Number(v));
  const save = async () => {
    try {
      await call("/incentives/rules", {
        method: "PUT",
        body: {
          points: Object.fromEntries(Object.entries(f.points).map(([k, v]) => [k, num(v)])),
          dealPointsPerLakh: num(f.dealPointsPerLakh), dealPointsCap: num(f.dealPointsCap), rupeesPerPoint: num(f.rupeesPerPoint), minPointsForPayout: num(f.minPointsForPayout),
          monthlyCapInr: f.monthlyCapInr === "" ? null : Number(f.monthlyCapInr),
        },
      });
      toast.push("Rules saved. New facts score with them; a month is paid with the rules in force when it is approved.", "success");
      onDone();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const box = (label, value, onChange, props = {}) => (
    <label className="field-label">{label}<input type="number" className="field-input mt-1" value={value} onChange={(e) => onChange(e.target.value)} {...props} /></label>
  );
  return (
    <Modal open onClose={onClose} title="Incentive rules" description="Points for each fact, and how points become rupees in payroll." maxWidth="max-w-xl">
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.filter(([k]) => k !== "adjustment").map(([k, label]) => box(`${label} (points each)`, f.points[k], (v) => setF((x) => ({ ...x, points: { ...x.points, [k]: v } }))))}
        {box("Extra points per lakh of deal value", f.dealPointsPerLakh, (v) => setF((x) => ({ ...x, dealPointsPerLakh: v })), { min: 0 })}
        {box("Most extra points per deal", f.dealPointsCap, (v) => setF((x) => ({ ...x, dealPointsCap: v })), { min: 0 })}
        {box("Rupees per point", f.rupeesPerPoint, (v) => setF((x) => ({ ...x, rupeesPerPoint: v })), { min: 0, step: "0.01" })}
        {box("Minimum points for any incentive", f.minPointsForPayout, (v) => setF((x) => ({ ...x, minPointsForPayout: v })), { min: 0 })}
        {box("Monthly cap per employee (Rs, empty = none)", f.monthlyCapInr, (v) => setF((x) => ({ ...x, monthlyCapInr: v })), { min: 0 })}
      </div>
      <div className="mt-4 flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save rules</button></div>
    </Modal>
  );
}

function Codes({ onClose }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/incentives/codes");
  const exit = async (c) => {
    const reason = window.prompt(`Record the exit of ${c.name} (${c.emCode})? The code is retired for good and never reissued; the account is switched off and open inquiries move to others. Reason:`);
    if (!reason) return;
    try {
      await call(`/incentives/employees/${c.userId}/exit`, { method: "POST", body: { reason } });
      toast.push(`${c.emCode} retired.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <Modal open onClose={onClose} title="Employee codes" description="EM-[designation]-[serial]. The serial stays for the whole tenure; only the designation changes on promotion. Retired codes are kept and never reissued." maxWidth="max-w-2xl">
      {!data ? <InlineSpinner className="h-5 w-5" /> : (
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto text-sm">
          {data.map((c) => (
            <li key={c.userId} className="flex items-center justify-between gap-3 py-2">
              <div><p><span className="font-mono font-semibold">{c.emCode}</span> · {c.name}</p><p className="text-xs text-ink-500">Issued {formatDate(c.issuedAt)}{c.status === "terminated" ? ` · retired ${formatDate(c.terminatedAt)} - ${c.exitReason}` : ""}</p></div>
              {c.status === "active" ? <button className="btn-outline btn-sm" onClick={() => exit(c)}>Record exit</button> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Retired</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function IncentivesPage() {
  const { role, user } = useAuth();
  const token = useSelector((s) => s.auth.accessToken);
  const superAdmin = role === "super_admin";
  const call = useApiCall();
  const toast = useToast();
  const [period, setPeriod] = useState(thisMonth());
  const { data, reload } = useApiQuery(`/incentives?period=${period}`);
  const [card, setCard] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);

  const adjust = async (row) => {
    const points = window.prompt(`Points to add for ${row.name} in ${period} (negative to take away):`);
    if (!points) return;
    const note = window.prompt("Why?");
    if (!note) return;
    try {
      await call("/incentives/adjustments", { method: "POST", body: { userId: row.userId, period, points: Number(points), note } });
      toast.push("Adjustment added.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const approve = async () => {
    if (!window.confirm(`Approve ${period}? The statements are frozen with the current rules; facts that arrive later count in the current month.`)) return;
    try {
      const r = await call(`/incentives/periods/${period}/approve`, { method: "POST" });
      toast.push(`${period} approved - ${r.data.employees} employees, ${formatINR(r.data.totalInr, { compact: false })}.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/incentives/periods/${period}/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Could not export");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `incentives-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const past = period < thisMonth();
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Team"
        title="Incentives"
        subtitle="Scored from the work recorded on the platform: inquiries attended and missed, response times, site visits and deals closed. Related-party transactions never count. Paid through payroll."
        actions={
          <>
            <input type="month" className="field-input w-40" value={period} max={thisMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)} />
            {superAdmin && <button className="btn-outline" onClick={() => setRulesOpen(true)}><LuSettings2 className="h-4 w-4" /> Rules</button>}
            {superAdmin && <button className="btn-outline" onClick={() => setCodesOpen(true)}>Employee codes</button>}
          </>
        }
      />
      {!data ? <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              {data.status === "open" ? (past ? "This month is over and waiting for approval." : "This month is still running - scores update every hour.") : `Approved ${formatDate(data.approvedAt)}${data.exportedAt ? ` · sent to payroll ${formatDate(data.exportedAt)}` : ""}.`}
              {Number(data.rules?.rupeesPerPoint) ? ` Rs ${data.rules.rupeesPerPoint} a point.` : " The rupee rate per point is not set yet."}
            </p>
            {superAdmin && (
              <div className="flex gap-2">
                {data.status === "open" && past && <button className="btn-primary" onClick={approve}>Approve {period}</button>}
                {data.status !== "open" && <button className="btn-outline" onClick={exportCsv}><LuDownload className="h-4 w-4" /> Payroll CSV</button>}
              </div>
            )}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr><th className={th}>Employee</th>{KINDS.map(([k, l]) => <th key={k} className={`${th} text-right`}>{l}</th>)}<th className={`${th} text-right`}>Points</th><th className={`${th} text-right`}>Incentive</th><th className={th} /></tr>
              </thead>
              <tbody>
                {!data.rows.length && <tr><td colSpan={KINDS.length + 4} className="px-3 py-8 text-center text-ink-500">Nothing scored for {period} yet.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.userId} className={`border-b border-line last:border-0 ${r.userId === user?.id ? "bg-red-50/40" : ""}`}>
                    <td className={th}><button className="text-left font-semibold text-ink-900 hover:text-red-600" onClick={() => setCard(r.userId)}>{r.name}</button><span className="block font-mono text-[11px] text-ink-500">{r.emCode}{r.active === false ? " · left" : ""}</span></td>
                    {KINDS.map(([k]) => {
                      const b = r.breakdown?.[k];
                      return <td key={k} className={`${th} text-right tabular-nums`}>{b ? <><span>{b.count}</span><span className="block text-[11px] text-ink-500">{pts(b.points)}</span></> : <span className="text-ink-300">—</span>}</td>;
                    })}
                    <td className={`${th} text-right font-bold tabular-nums`}>{r.points}</td>
                    <td className={`${th} text-right tabular-nums`}>{r.amountInr ? formatINR(r.amountInr, { compact: false }) : "—"}</td>
                    <td className={`${th} text-right`}>{superAdmin && data.status === "open" && <button className="btn-outline btn-sm" onClick={() => adjust(r)}>Adjust</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {card && <Scorecard userId={card} period={period} onClose={() => setCard(null)} />}
      {rulesOpen && <RulesLoader onClose={() => setRulesOpen(false)} onDone={reload} />}
      {codesOpen && <Codes onClose={() => setCodesOpen(false)} />}
    </div>
  );
}
