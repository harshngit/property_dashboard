import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { LuRefreshCw, LuShieldAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";

// Module 32 - Compliance & Risk Alerts, and the staff side of Module 33.
//   Alerts         what is out of line right now (RERA, KYC, fraud, GST
//                  invoices, mandates, disputes, response SLA, DPDP, data
//                  sources). They open and close by themselves as records
//                  change; staff acknowledge or (admin) dismiss with a reason.
//   Data requests  DPDP export / deletion requests and their 30-day clock.
//   Rules          switch a check on or off, change its severity or threshold.

const ADMIN = ["admin", "super_admin"];
const SEV = { critical: "bg-red-600 text-white", high: "bg-orange-100 text-orange-800", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-700" };
const Sev = ({ v }) => <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${SEV[v]}`}>{v}</span>;
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const th = "px-4 py-3";
const PARAM_LABEL = { min_listings: "Live listings at least", grace_days: "Days of grace after the due date", grace_hours: "Hours of grace after the deadline", warn_days: "Warn this many days before the limit" };

function Alerts({ admin, summary, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState("active");
  const [severity, setSeverity] = useState("");
  const [rule, setRule] = useState("");
  const { data, loading, reload } = useApiQuery(`/compliance/alerts${buildQuery({ status, severity, rule })}`);
  const [dismiss, setDismiss] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (a, action, n) => {
    setBusy(true);
    try {
      await call(`/compliance/alerts/${a.id}`, { method: "POST", body: { action, note: n || undefined } });
      setDismiss(null);
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select id="ca-status" className="field-select h-9 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Needs attention</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="dismissed">Dismissed</option><option value="resolved">Resolved</option><option value="all">All</option>
        </select>
        <select id="ca-severity" className="field-select h-9 w-36" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">Any severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select id="ca-rule" className="field-select h-9 w-72" value={rule} onChange={(e) => setRule(e.target.value)}>
          <option value="">Every check</option>
          {(summary?.rules || []).map((r) => <option key={r.ruleKey} value={r.ruleKey}>{r.label}</option>)}
        </select>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title={status === "active" ? "Nothing needs attention" : "No alerts here"} subtitle="Alerts open by themselves when a record breaks a rule and close when it is put right." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Severity</th><th className={th}>Alert</th><th className={th}>Responsible</th><th className={th}>Open for</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={th}><Sev v={a.severity} /></td>
                  <td className={`${th} max-w-[420px]`}>
                    <p className="font-semibold text-ink-900" data-no-translate>{a.title}</p>
                    <p className="text-xs text-ink-600">{a.detail}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">{a.ruleLabel}{a.city ? ` · ${a.city}` : ""}</p>
                    {a.note && <p className="mt-1 rounded bg-surface-muted px-2 py-1 text-[11px] text-ink-600">{a.note}{a.handledByName ? ` — ${a.handledByName}` : ""}</p>}
                  </td>
                  <td className={`${th} text-xs`} data-no-translate>{a.ownerName || "—"}</td>
                  <td className={`${th} text-xs`}>{a.status === "resolved" ? formatDate(a.resolvedAt) : a.ageDays === 0 ? "today" : `${a.ageDays} day${a.ageDays === 1 ? "" : "s"}`}</td>
                  <td className={th}><StatusBadge value={titleCase(a.status)} />{a.autoResolved && <p className="mt-0.5 text-[11px] text-ink-400">put right</p>}</td>
                  <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                    {a.link && <button className="mr-3 text-red-600 hover:underline" onClick={() => navigate(a.link)}>Open</button>}
                    {a.status === "open" && <button className="mr-3 text-ink-700 hover:underline" disabled={busy} onClick={() => act(a, "acknowledge")}>Acknowledge</button>}
                    {admin && ["open", "acknowledged"].includes(a.status) && <button className="text-ink-500 hover:underline" onClick={() => { setNote(""); setDismiss(a); }}>Dismiss</button>}
                    {["acknowledged", "dismissed"].includes(a.status) && <button className="ml-3 text-ink-500 hover:underline" disabled={busy} onClick={() => act(a, "reopen")}>Reopen</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!dismiss} onClose={() => setDismiss(null)} title="Dismiss alert" description={dismiss?.title}>
        <div className="space-y-3">
          <p className="text-sm text-ink-600">Dismiss only when this is a known, accepted exception. It stays quiet while the same condition lasts, and the reason is kept on record.</p>
          <TextareaField label="Reason" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setDismiss(null)}>Cancel</button><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => act(dismiss, "dismiss", note)}>Dismiss</button></div>
        </div>
      </Modal>
    </div>
  );
}

function DataRequests({ admin, superAdmin }) {
  const call = useApiCall();
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const [status, setStatus] = useState("open");
  const { data, loading, reload } = useApiQuery(`/compliance/data-requests${buildQuery({ status })}`);
  const [reject, setReject] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = async (r, action, n) => {
    setBusy(true);
    try {
      const res = await call(`/compliance/data-requests/${r.id}`, { method: "POST", body: { action, note: n || undefined } });
      toast.push(res.data.status === "completed" ? "Personal data anonymised." : res.data.status === "on_hold" ? "On legal hold - it will go ahead when the hold clears." : "Request updated.", "success");
      setReject(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const download = async (r) => {
    try {
      const res = await fetch(`${API_BASE_URL}/compliance/users/${r.userId}/data?format=csv`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not export this person's data");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = `${r.requestNumber}-data.csv`;
      a.click();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const t = data?.totals;
  const rows = data?.items || [];
  return (
    <div className="space-y-3">
      {t && (
        <div className="grid gap-3 sm:grid-cols-5">
          {[["Awaiting notice period", t.pending], ["On legal hold", t.on_hold], ["Past 30 days", t.overdue, t.overdue ? "text-red-600" : ""], ["Exports (30 days)", t.exports_30d], ["Accounts anonymised", t.anonymised]].map(([l, v, tone]) => (
            <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className={`mt-1 font-display text-2xl font-extrabold ${tone || "text-ink-950"}`}>{v}</p></div>
          ))}
        </div>
      )}
      <select id="dr-status" className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="open">Open requests</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="rejected">Rejected</option><option value="">All</option>
      </select>
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No data requests here" subtitle="People ask for a copy of their data or for deletion from Profile > Privacy on the website, or Settings in the CRM." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Request</th><th className={th}>Person</th><th className={th}>Type</th><th className={th}>Due</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={th}><p className="font-mono text-xs font-bold">{r.requestNumber}</p><p className="text-xs text-ink-500">{formatDate(r.requestedAt)}</p></td>
                  <td className={th} data-no-translate><p className="font-semibold text-ink-900">{r.userName || "—"}</p><p className="text-xs text-ink-500">{r.userEmail || r.userMobile || ""}{r.role ? ` · ${r.role}` : ""}</p></td>
                  <td className={th}>{{ export: "Copy of data", deletion: "Deletion", inactivity: "Inactive account" }[r.kind]}{r.reason && <p className="max-w-[220px] text-xs text-ink-500">{r.reason}</p>}</td>
                  <td className={`${th} text-xs`}>{formatDate(r.dueAt)}{["pending", "on_hold"].includes(r.status) && <p className={r.daysLeft < 0 ? "font-semibold text-red-600" : "text-ink-500"}>{r.daysLeft < 0 ? `${-r.daysLeft} days over` : `${r.daysLeft} days left`}</p>}</td>
                  <td className={th}><StatusBadge value={titleCase(r.status.replace("_", " "))} />{(r.holdReasons || []).map((h) => <p key={h.code} className="mt-0.5 text-[11px] text-amber-700">{h.detail}</p>)}{r.decisionNote && <p className="mt-0.5 max-w-[200px] text-[11px] text-ink-500">{r.decisionNote}</p>}</td>
                  <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                    {superAdmin && r.userId && r.status !== "completed" && <button className="mr-3 text-ink-700 hover:underline" onClick={() => download(r)}>Export data</button>}
                    {admin && ["pending", "on_hold"].includes(r.status) && r.kind !== "export" && (
                      <>
                        <button className="mr-3 text-red-600 hover:underline disabled:opacity-40" disabled={busy || (r.daysLeft > 0 && !superAdmin)} title={r.daysLeft > 0 && !superAdmin ? "The 30-day notice has not ended" : ""} onClick={() => decide(r, "process")}>Anonymise now</button>
                        <button className="text-ink-500 hover:underline" onClick={() => { setNote(""); setReject(r); }}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-500">Deletion means anonymisation: the person's name, contact details and sign-in are removed and their listings leave public view. Invoices, fee consents, deal records and the audit log are kept as the law requires. A request waits on legal hold while a deal is open, an invoice is unpaid, a mandate is active or a dispute is open.</p>
      <Modal open={!!reject} onClose={() => setReject(null)} title="Reject deletion request" description={reject?.requestNumber}>
        <div className="space-y-3">
          <TextareaField label="Reason (shown to the person)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setReject(null)}>Cancel</button><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => decide(reject, "reject", note)}>Reject</button></div>
        </div>
      </Modal>
    </div>
  );
}

function Rules({ admin, summary, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (r, body) => {
    setBusy(true);
    try {
      await call(`/compliance/rules/${r.ruleKey}`, { method: "PUT", body });
      toast.push("Rule saved and checks re-run.", "success");
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Check</th><th className={th}>Severity</th><th className={th}>Threshold</th><th className={th}>Open</th><th className={th}>Fixed (30 days)</th><th className={th}>On</th></tr></thead>
        <tbody className="divide-y divide-line">
          {(summary?.rules || []).map((r) => (
            <tr key={r.ruleKey} className={r.isActive ? "" : "opacity-60"}>
              <td className={`${th} max-w-[360px]`}><p className="font-semibold text-ink-900">{r.label}</p><p className="text-xs text-ink-500">{r.description}</p></td>
              <td className={th}>{admin ? <select aria-label="Severity" className="field-select h-9 w-28" value={r.severity} disabled={busy} onChange={(e) => save(r, { severity: e.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select> : <Sev v={r.severity} />}</td>
              <td className={th}>{Object.entries(r.params || {}).length === 0 ? <span className="text-ink-400">—</span> : Object.entries(r.params).map(([k, v]) => (
                <label key={k} className="block text-xs text-ink-600">{PARAM_LABEL[k] || k}
                  {admin ? <input type="number" min="0" className="field-input mt-0.5 h-8 w-20" defaultValue={v} onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== v && save(r, { params: { [k]: Number(e.target.value) } })} /> : <b className="ml-1">{v}</b>}
                </label>
              ))}</td>
              <td className={`${th} font-semibold`}>{r.open + r.acknowledged}</td>
              <td className={th}>{r.resolved30d}</td>
              <td className={th}><input type="checkbox" aria-label={`${r.label} on`} checked={r.isActive} disabled={!admin || busy} onChange={(e) => save(r, { isActive: e.target.checked })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompliancePage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const call = useApiCall();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "alerts";
  const setTab = (k) => setParams(k === "alerts" ? {} : { tab: k }, { replace: true });
  const summary = useApiQuery("/compliance/summary");
  const [running, setRunning] = useState(false);
  const [nonce, setNonce] = useState(0);
  const run = async () => {
    setRunning(true);
    try {
      const r = await call("/compliance/run", { method: "POST" });
      toast.push(`Checked: ${r.data.opened} new, ${r.data.resolved} put right.`, "success");
      summary.reload();
      setNonce((n) => n + 1);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setRunning(false);
    }
  };
  const t = summary.data?.totals;
  return (
    <div className="space-y-5">
      <PageHeader title="Compliance & Risk" />
      <div className="flex flex-wrap items-center gap-3">
        {t && [["Critical", t.critical, "text-red-600"], ["High", t.high, "text-orange-700"], ["Medium", t.medium, "text-amber-700"], ["Low", t.low, "text-ink-700"]].map(([l, v, tone]) => (
          <div key={l} className="card min-w-[120px] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className={`mt-1 font-display text-2xl font-extrabold ${v ? tone : "text-ink-950"}`}>{v}</p></div>
        ))}
        <div className="ml-auto text-right">
          <button className="btn-outline btn-sm" disabled={running} onClick={run}><LuRefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Check now</button>
          <p className="mt-1 text-[11px] text-ink-500">{summary.data?.lastCheckedAt ? `Last checked ${formatDate(summary.data.lastCheckedAt, true)}` : "Checks run every hour"}</p>
        </div>
      </div>
      {t && t.critical > 0 && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><LuShieldAlert className="h-4 w-4 shrink-0" />{t.critical} critical alert{t.critical === 1 ? "" : "s"} need{t.critical === 1 ? "s" : ""} action.</p>}
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[["alerts", `Alerts${t?.active ? ` (${t.active})` : ""}`], ["privacy", "Data requests"], ["rules", "Checks"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
      </div>
      {tab === "alerts" && <Alerts key={nonce} admin={admin} summary={summary.data} onChanged={summary.reload} />}
      {tab === "privacy" && <DataRequests key={nonce} admin={admin} superAdmin={role === "super_admin"} />}
      {tab === "rules" && <Rules admin={admin} summary={summary.data} onChanged={() => { summary.reload(); setNonce((n) => n + 1); }} />}
    </div>
  );
}
