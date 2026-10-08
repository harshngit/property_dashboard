import { useState } from "react";
import { useSelector } from "react-redux";
import { LuPlus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Module 47 - Work From Home field network (A R staff).
//   To confirm     buyer visits waiting for their representative, and photo
//                  / report tasks waiting for a quality review
//   Tasks          create tasks, see who has each one
//   Field partners KYC, performance, suspend
//   Payouts        monthly run with TDS, record the bank UTR, payout slips
//   Settings       the amount per task type and the programme rules

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const money = (v) => formatINR(v, { compact: false });
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const TYPE_OPTIONS = [["buyer_visit", "Buyer site visit"], ["seller_photo", "Seller photo permission"], ["requirement_collect", "Requirement collection"], ["listing_assist", "Seller listing assist"], ["condition_report", "Property condition report"], ["auction_check", "Auction property field check"], ["area_survey", "Area demand mini-survey"]];

function Submissions({ onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const [queue, setQueue] = useState("pending");
  const { data, loading, reload } = useApiQuery(`/wfh/manage/submissions${buildQuery({ queue })}`);
  const [open, setOpen] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (path, body, msg) => {
    setBusy(true);
    try {
      await call(path, { method: "POST", body });
      toast.push(msg, "success");
      setOpen(null);
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const rows = data || [];
  const s = open;
  const otpPending = s && s.otpRequired && !s.otpConfirmed;
  return (
    <div className="space-y-3">
      <select id="wfh-queue" className="field-select h-9 w-56" value={queue} onChange={(e) => setQueue(e.target.value)}>
        <option value="pending">Waiting for a decision</option><option value="mine">Assigned to me</option><option value="flagged">Flagged</option><option value="passed">Verified</option><option value="failed">Rejected</option>
      </select>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="Nothing here" subtitle="Submitted tasks appear here once the field partner has entered the buyer's or owner's OTP." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Task</th><th className={th}>Field partner</th><th className={th}>Evidence</th><th className={th}>Submitted</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={th}><p className="font-semibold text-ink-900" data-no-translate>{r.title}</p><p className="text-xs text-ink-500">{r.taskTypeLabel} · {money(r.paymentAmount)}</p></td>
                  <td className={th} data-no-translate>{r.workerName}</td>
                  <td className={`${th} text-xs text-ink-600`}>{r.gpsDistanceM !== null && r.gpsDistanceM !== undefined ? `Checked in ${r.gpsDistanceM} m away` : ""}{r.photos.length ? ` ${r.photos.length} photos` : ""}{r.partyName ? <p data-no-translate>{r.partyName} ••••{r.partyPhoneLast4} {r.otpConfirmed ? "· OTP ✓" : "· OTP pending"}</p> : null}{(r.fraudFlags || []).map((f) => <p key={f.rule} className="font-semibold text-red-600">{f.detail}</p>)}</td>
                  <td className={`${th} text-xs`}>{r.submittedAt ? formatDate(r.submittedAt, true) : "—"}{r.repDueAt && r.verificationStatus === "pending" && <p className={new Date(r.repDueAt) < new Date() ? "font-semibold text-red-600" : "text-ink-500"}>confirm by {formatDate(r.repDueAt, true)}</p>}</td>
                  <td className={th}><StatusBadge value={r.verificationStatus === "pending" ? "Pending" : titleCase(r.verificationStatus)} />{r.rejectionReason && <p className="mt-0.5 max-w-[200px] text-[11px] text-ink-500">{r.rejectionReason}</p>}</td>
                  <td className={`${th} text-right`}><button className="btn-outline btn-sm" onClick={() => { setReason(""); setOpen(r); }}>{r.verificationStatus === "pending" ? "Decide" : "View"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!s} onClose={() => setOpen(null)} title={s?.taskTypeLabel} description={s ? `${s.workerName} · ${s.title}` : ""} maxWidth="max-w-3xl">
        {s && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 text-sm">
            {s.property && <p className="text-ink-700" data-no-translate>Property: <b>{s.property.title}</b></p>}
            {s.gpsDistanceM !== null && s.gpsDistanceM !== undefined && <p className="text-ink-700">GPS check-in: <b>{s.gpsDistanceM} m</b> from the property</p>}
            {s.partyName && <p className="text-ink-700" data-no-translate>{s.partyName}, mobile ending {s.partyPhoneLast4} - OTP {s.otpConfirmed ? "confirmed" : "not confirmed yet"}</p>}
            {Object.keys(s.evidence || {}).length > 0 && <div className="rounded-lg bg-surface-muted p-3 text-xs">{Object.entries(s.evidence).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => <p key={k}><b>{titleCase(k.replace(/([A-Z])/g, " $1"))}:</b> <span data-no-translate>{String(v)}</span></p>)}</div>}
            {s.photos.length > 0 && <div className="grid grid-cols-3 gap-2">{s.photos.map((p, i) => <div key={i} className="rounded-lg border border-line p-1 text-[11px] text-ink-600">{p.url ? <img src={p.url} alt="" className="h-28 w-full rounded object-cover" /> : <div className="flex h-28 items-center justify-center rounded bg-surface-muted">Photo {i + 1}</div>}<p className="mt-1">{p.distanceM} m away{p.takenAt ? ` · ${formatDate(p.takenAt, true)}` : ""}</p></div>)}</div>}
            {(s.fraudFlags || []).length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{s.fraudFlags.map((f) => <p key={f.rule}>{f.detail}</p>)}</div>}
            {s.verificationStatus === "pending" && (
              otpPending ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Waiting for the field partner to enter the OTP. Nothing can be decided before that.</p> : (
                <>
                  <TextareaField label="Reason (needed to reject; the field partner is told)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    {s.confirmation === "rep" ? (
                      <>
                        <button className="btn-outline" disabled={busy || reason.trim().length < 5} onClick={() => act(`/wfh/manage/submissions/${s.id}/rep`, { happened: false, reason }, "Marked as did not happen.")}>Did not happen</button>
                        <button className="btn-primary" disabled={busy} onClick={() => act(`/wfh/manage/submissions/${s.id}/rep`, { happened: true }, "Visit confirmed - earning credited.")}>Visit happened</button>
                      </>
                    ) : s.confirmation === "listing" ? <p className="text-xs text-ink-500">Paid automatically when the listing passes verification and goes live.</p> : (
                      <>
                        <button className="btn-outline" disabled={busy || reason.trim().length < 5} onClick={() => act(`/wfh/manage/submissions/${s.id}/review`, { decision: "reject", reason }, "Rejected.")}>Reject</button>
                        <button className="btn-primary" disabled={busy} onClick={() => act(`/wfh/manage/submissions/${s.id}/review`, { decision: "approve" }, "Approved - earning credited.")}>Approve</button>
                      </>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Tasks({ onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const [status, setStatus] = useState("open");
  const { data, loading, reload } = useApiQuery(`/wfh/manage/tasks${buildQuery({ status })}`);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const needsProperty = form && ["buyer_visit", "condition_report", "auction_check"].includes(form.taskType);
  const save = async () => {
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      const m = String(form.propertyId || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (m) body.propertyId = m[0]; else delete body.propertyId;
      const res = await call("/wfh/manage/tasks", { method: "POST", body });
      toast.push(`${res.data.length} task${res.data.length === 1 ? "" : "s"} on the board at ${money(res.data[0].paymentAmount)} each.`, "success");
      setForm(null);
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (t) => {
    try {
      await call(`/wfh/manage/tasks/${t.id}/cancel`, { method: "POST" });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select id="wfh-task-status" className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">On the board</option><option value="locked">Reserved</option><option value="completed">Submitted</option><option value="verified">Verified</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option><option value="">All</option>
        </select>
        <button className="btn-primary btn-sm ml-auto" onClick={() => setForm({ taskType: "buyer_visit", propertyId: "", latitude: "", longitude: "", city: "", locality: "", instructions: "", count: 1, expiryDays: "" })}><LuPlus className="h-4 w-4" /> New task</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No tasks here" subtitle="Create a task for a listing or an area. The amount comes from Settings and is fixed once the task is live." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Task</th><th className={th}>Where</th><th className={th}>Pays</th><th className={th}>Expires</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className={th}><p className="font-semibold text-ink-900" data-no-translate>{t.title}</p><p className="text-xs text-ink-500">{t.taskTypeLabel}{t.origin !== "admin" ? ` · created automatically (${t.origin === "no_photos" ? "listing without photos" : "buyer requirement with no match"})` : ""}</p></td>
                  <td className={`${th} text-xs`} data-no-translate>{[t.locality, t.city].filter(Boolean).join(", ")}{t.propertyTitle ? <p className="text-ink-500">{t.propertyTitle}</p> : null}</td>
                  <td className={th}>{money(t.paymentAmount)}</td>
                  <td className={`${th} text-xs`}>{formatDate(t.expiryAt)}</td>
                  <td className={th}><StatusBadge value={titleCase(t.status)} />{t.workerName && <p className="mt-0.5 text-[11px] text-ink-500" data-no-translate>{t.workerName}</p>}</td>
                  <td className={`${th} text-right`}>{t.status === "open" && <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => cancel(t)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="New task" description="Appears on the board for field partners within the radius of this location.">
        {form && (
          <div className="space-y-3">
            <label className="block"><span className="field-label">Task type</span><select id="wfh-new-type" className="field-select" value={form.taskType} onChange={set("taskType")}>{TYPE_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <TextField label={`Listing (paste its link or ID)${needsProperty ? "" : " - optional"}`} value={form.propertyId} onChange={set("propertyId")} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Latitude (blank = the listing's)" value={form.latitude} onChange={set("latitude")} />
              <TextField label="Longitude" value={form.longitude} onChange={set("longitude")} />
              <TextField label="City" value={form.city} onChange={set("city")} />
              <TextField label="Locality" value={form.locality} onChange={set("locality")} />
              <TextField label="How many tasks" type="number" min="1" max="50" value={form.count} onChange={set("count")} />
              <TextField label="Days on the board (blank = default)" type="number" min="1" value={form.expiryDays} onChange={set("expiryDays")} />
            </div>
            <TextareaField label="Instructions for the field partner (optional)" rows={2} value={form.instructions} onChange={set("instructions")} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>Create</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Workers({ admin, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const [kyc, setKyc] = useState("");
  const { data, loading, reload } = useApiQuery(`/wfh/manage/workers${buildQuery({ kyc })}`);
  const [act, setAct] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      setAct(null);
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
      <select id="wfh-kyc" className="field-select h-9 w-48" value={kyc} onChange={(e) => setKyc(e.target.value)}><option value="">All field partners</option><option value="pending">KYC to verify</option><option value="verified">KYC verified</option><option value="rejected">KYC rejected</option></select>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No field partners yet" subtitle="People join from the Work From Home section of their dashboard on the website." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Field partner</th><th className={th}>Area</th><th className={th}>KYC</th><th className={th}>Verified tasks</th><th className={th}>Rejection / forfeit</th><th className={th}>Earned / paid</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((w) => (
                <tr key={w.userId}>
                  <td className={th} data-no-translate><p className="font-semibold text-ink-900">{w.name}</p><p className="text-xs text-ink-500">{w.mobile || w.email}</p>{w.sharedDevice && <p className="text-[11px] font-semibold text-red-600">Device shared with another field partner</p>}</td>
                  <td className={`${th} text-xs`} data-no-translate>{[w.locality, w.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className={`${th} text-xs`}><StatusBadge value={titleCase(w.kycStatus)} /><p className="mt-0.5 text-ink-500" data-no-translate>Aadhaar ••••{w.aadhaarLast4} · a/c ••••{w.bankAccountLast4}{w.hasPan ? " · PAN on file" : " · no PAN"}</p></td>
                  <td className={th}>{w.verifiedTasks}</td>
                  <td className={`${th} text-xs`}><span className={w.rejectionRate > 30 ? "font-semibold text-red-600" : ""}>{w.rejectionRate}%</span> / <span className={w.forfeitRate > 30 ? "font-semibold text-red-600" : ""}>{w.forfeitRate}%</span></td>
                  <td className={`${th} text-xs`}>{money(w.totalEarned)} / {money(w.totalPaidOut)}</td>
                  <td className={th}><StatusBadge value={titleCase(w.status)} />{w.statusNote && <p className="mt-0.5 max-w-[160px] text-[11px] text-ink-500">{w.statusNote}</p>}</td>
                  <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                    {admin && w.kycStatus === "pending" && <><button className="mr-3 text-red-600 hover:underline" disabled={busy} onClick={() => run(() => call(`/wfh/manage/workers/${w.userId}/kyc`, { method: "POST", body: { decision: "verify" } }), "KYC verified.")}>Verify KYC</button><button className="mr-3 text-ink-600 hover:underline" onClick={() => { setNote(""); setAct({ w, kind: "kyc" }); }}>Reject</button></>}
                    {admin && (w.status === "active" ? <button className="text-ink-600 hover:underline" onClick={() => { setNote(""); setAct({ w, kind: "suspend" }); }}>Suspend</button> : <button className="text-ink-600 hover:underline" disabled={busy} onClick={() => run(() => call(`/wfh/manage/workers/${w.userId}/status`, { method: "PUT", body: { status: "active" } }), "Reactivated.")}>Reactivate</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.kind === "kyc" ? "Reject KYC" : "Suspend field partner"} description={act?.w.name}>
        <div className="space-y-3">
          <TextareaField label="Reason" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setAct(null)}>Cancel</button><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => run(() => (act.kind === "kyc" ? call(`/wfh/manage/workers/${act.w.userId}/kyc`, { method: "POST", body: { decision: "reject", note } }) : call(`/wfh/manage/workers/${act.w.userId}/status`, { method: "PUT", body: { status: "suspended", note } })), "Saved.")}>Confirm</button></div>
        </div>
      </Modal>
    </div>
  );
}

function Payouts({ admin, summary, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const { data, loading, reload } = useApiQuery("/wfh/manage/payouts");
  const [pay, setPay] = useState(null);
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const start = () => run(async () => {
    const r = await call("/wfh/manage/payouts/run", { method: "POST", body: {} });
    toast.push(r.data.created.length ? `${r.data.created.length} payout${r.data.created.length === 1 ? "" : "s"} prepared for ${r.data.period}.` : "No one has reached the minimum payout yet.", "success");
  });
  const openPay = (p) => run(async () => { setUtr(""); setPay({ ...p, bank: (await call(`/wfh/manage/payouts/${p.id}/bank`)).data }); });
  const slip = async (p) => {
    const res = await fetch(`${API_BASE_URL}/wfh/payouts/${p.id}/slip`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank", "noopener");
  };
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-600">Verified and not yet in a payout: <b>{money(summary?.awaitingPayoutRun || 0)}</b>. The run prepares one payout per field partner who has reached the minimum, with TDS applied; then make the bank transfer and record its UTR.</p>
        {admin && <button className="btn-primary btn-sm ml-auto shrink-0" disabled={busy} onClick={start}>Run monthly payout</button>}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No payouts yet" subtitle="Run the monthly payout once field partners have verified earnings." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Payout</th><th className={th}>Field partner</th><th className={th}>Gross</th><th className={th}>TDS</th><th className={th}>Net</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={th}><p className="font-mono text-xs font-bold" data-no-translate>{p.payoutNumber}</p><p className="text-xs text-ink-500">{p.period}</p></td>
                  <td className={th} data-no-translate><p className="font-semibold text-ink-900">{p.workerName}</p><p className="text-xs text-ink-500">a/c ••••{p.bankAccountLast4} · {p.bankIfsc}</p></td>
                  <td className={th}>{money(p.gross)}</td><td className={th}>{money(p.tds)} <span className="text-xs text-ink-500">({p.tdsRatePercent}%)</span></td><td className={`${th} font-semibold`}>{money(p.net)}</td>
                  <td className={th}><StatusBadge value={titleCase(p.status)} />{p.utr && <p className="mt-0.5 text-[11px] text-ink-500" data-no-translate>UTR {p.utr}</p>}</td>
                  <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}><button className="mr-3 text-ink-700 hover:underline" onClick={() => slip(p)}>Slip</button>{admin && p.status === "pending" && <button className="text-red-600 hover:underline" disabled={busy} onClick={() => openPay(p)}>Pay</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!pay} onClose={() => setPay(null)} title="Record bank transfer" description={pay?.payoutNumber}>
        {pay && (
          <div className="space-y-3">
            <div className="rounded-lg bg-surface-muted p-3 text-sm" data-no-translate>
              <p>Pay <b>{money(pay.bank.net)}</b> to <b>{pay.bank.accountName || pay.workerName}</b></p>
              <p className="font-mono text-xs">A/c {pay.bank.accountNumber} · IFSC {pay.bank.ifsc}</p>
            </div>
            <p className="text-xs text-ink-500">Opening this was recorded in the audit log.</p>
            <TextField label="Bank UTR reference" value={utr} onChange={(e) => setUtr(e.target.value)} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setPay(null)}>Cancel</button><button className="btn-primary" disabled={busy || utr.trim().length < 6} onClick={() => run(async () => { await call(`/wfh/manage/payouts/${pay.id}/paid`, { method: "POST", body: { utr } }); toast.push("Payout recorded.", "success"); setPay(null); })}>Mark as paid</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Settings({ admin }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/wfh/manage/config");
  const [override, setOverride] = useState(null);
  if (loading && !data) return <Spinner />;
  const save = async (key, value) => {
    try {
      await call(`/wfh/manage/config/${key}`, { method: "PUT", body: { value } });
      toast.push("Saved. New tasks use it from now on.", "success");
      setOverride(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const payments = (data?.items || []).filter((i) => i.isPayment);
  const rules = (data?.items || []).filter((i) => !i.isPayment);
  const label = (key) => data.taskTypes.find((t) => key.startsWith(t.key))?.label || key;
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Task type</th><th className={th}>Amount (₹)</th><th className={th}>City / property-type amounts</th></tr></thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.key}>
                <td className={th}><p className="font-semibold text-ink-900">{label(p.key)}</p><p className="text-xs text-ink-500">{p.description}</p></td>
                <td className={th}>{admin ? <input type="number" min="0" className="field-input h-9 w-28" defaultValue={p.value.amount} onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== p.value.amount && save(p.key, { ...p.value, amount: Number(e.target.value) })} /> : money(p.value.amount)}{p.value.amount === 0 && <p className="text-[11px] text-amber-700">Not set</p>}</td>
                <td className={`${th} text-xs`} data-no-translate>{(p.value.overrides || []).map((o, i) => <span key={i} className="mr-2 inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5">{[o.city, o.propertyType].filter(Boolean).join(" · ")}: {money(o.amount)}{admin && <button className="text-red-600" title="Remove" onClick={() => save(p.key, { ...p.value, overrides: p.value.overrides.filter((_, j) => j !== i) })}>×</button>}</span>)}{admin && <button className="font-semibold text-red-600 hover:underline" onClick={() => setOverride({ key: p.key, value: p.value, city: "", propertyType: "", amount: "" })}>+ Add</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card p-5">
        <p className="mb-3 text-sm font-bold text-ink-900">Programme rules</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((r) => (
            <label key={r.key} className="block text-xs text-ink-600">{r.description}
              {typeof r.value === "boolean" ? <select aria-label={r.key} className="field-select mt-1 h-9" disabled={!admin} value={String(r.value)} onChange={(e) => save(r.key, e.target.value === "true")}><option value="true">On</option><option value="false">Off</option></select>
                : <input className="field-input mt-1 h-9" disabled={!admin} type={typeof r.value === "number" ? "number" : "text"} defaultValue={r.value} onBlur={(e) => String(e.target.value) !== String(r.value) && e.target.value !== "" && save(r.key, e.target.value)} />}
            </label>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-500">TDS on payouts: {data.statutory.tdsPercent}% once a field partner's payouts in the financial year pass {money(data.statutory.tdsThreshold)} ({data.statutory.tdsNoPanPercent}% when no PAN is on file). These are statutory settings, changed only by a Super Admin in Admin Panel when the law changes.</p>
      <Modal open={!!override} onClose={() => setOverride(null)} title="Amount for a city or property type">
        {override && (
          <div className="space-y-3">
            <TextField label="City (blank = any)" value={override.city} onChange={(e) => setOverride({ ...override, city: e.target.value })} />
            <TextField label="Property type (blank = any, e.g. apartment)" value={override.propertyType} onChange={(e) => setOverride({ ...override, propertyType: e.target.value })} />
            <TextField label="Amount (₹)" type="number" min="0" value={override.amount} onChange={(e) => setOverride({ ...override, amount: e.target.value })} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setOverride(null)}>Cancel</button><button className="btn-primary" disabled={override.amount === "" || (!override.city.trim() && !override.propertyType.trim())} onClick={() => save(override.key, { ...override.value, overrides: [...(override.value.overrides || []), { city: override.city.trim() || undefined, propertyType: override.propertyType.trim() || undefined, amount: Number(override.amount) }] })}>Add</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function FieldNetworkPage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const [tab, setTab] = useState("submissions");
  const summary = useApiQuery("/wfh/manage/summary");
  const s = summary.data;
  return (
    <div className="space-y-5">
      <PageHeader title="Field Network" />
      {s && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[["To confirm", s.to_review, s.to_review ? "text-red-600" : ""], ["Overdue with rep", s.overdue, s.overdue ? "text-red-600" : ""], ["KYC to verify", s.kyc_pending, s.kyc_pending ? "text-amber-700" : ""], ["Active partners", s.active], ["Tasks on the board", s.tasks.open], ["Earned this month", money(s.earnedThisMonth), "text-emerald-700"]].map(([l, v, tone]) => (
            <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className={`mt-1 font-display text-2xl font-extrabold ${tone || "text-ink-950"}`}>{v}</p></div>
          ))}
        </div>
      )}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[["submissions", `To confirm${s?.to_review ? ` (${s.to_review})` : ""}`], ["tasks", "Tasks"], ["workers", `Field partners${s?.kyc_pending ? ` (${s.kyc_pending})` : ""}`], ["payouts", `Payouts${s?.payoutsPending ? ` (${s.payoutsPending})` : ""}`], ["settings", "Settings"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
      </div>
      {tab === "submissions" && <Submissions onChanged={summary.reload} />}
      {tab === "tasks" && <Tasks onChanged={summary.reload} />}
      {tab === "workers" && <Workers admin={admin} onChanged={summary.reload} />}
      {tab === "payouts" && <Payouts admin={admin} summary={s} onChanged={summary.reload} />}
      {tab === "settings" && <Settings admin={admin} />}
    </div>
  );
}
