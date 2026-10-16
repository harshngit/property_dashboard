import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Section 35: suspended and removed accounts (Super Admin only) - the recorded
// reasons and acting authority, the decisions waiting (frozen commission,
// active deals), and reinstatement. Staff see the requirements waiting for
// their fresh review after a reinstatement.

const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const ACTION = { suspended: "Suspended", removed: "Removed", reinstated: "Reinstated", deal_decision: "Deal decided", commission_decision: "Commission decided", republished: "Requirement republished" };

function Record({ id, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery(`/suspensions/users/${id}`);
  const brokers = useApiQuery("/users?role=broker&limit=100");
  const [clarification, setClarification] = useState("");
  const [busy, setBusy] = useState(false);
  const [reassign, setReassign] = useState({});
  const act = async (path, body, msg) => {
    setBusy(true);
    try {
      await call(path, { method: "POST", body });
      toast.push(msg, "success");
      reload();
      onChanged?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  if (!data) return <Spinner />;
  const suspended = ["suspended", "removed"].includes(data.status);
  const brokerList = brokers.data?.items || brokers.data || [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {data.remark && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-wide text-white">{data.remark}</span>}
        <span className="text-sm text-ink-700" data-no-translate>{data.email || data.mobile} · {titleCase(data.role.replace(/_/g, " "))} · referral code {data.referralCode || "—"}</span>
      </div>

      {data.activeDeals.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-ink-900">Active deals - how should each continue?</p>
          {data.activeDeals.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
              <span className="min-w-0 flex-1" data-no-translate><b>{d.title || "Deal"}</b> · {titleCase(d.stage.replace(/_/g, " "))} · broker {d.brokerName || "—"}{d.decided ? " · decided" : ""}</span>
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/suspensions/users/${id}/deals/${d.id}`, { decision: "continue" }, "Recorded: the deal continues.")}>Continue</button>
              <select className="field-select h-9 w-48" value={reassign[d.id] || ""} onChange={(e) => setReassign({ ...reassign, [d.id]: e.target.value })}>
                <option value="">Reassign to…</option>
                {brokerList.filter((b) => b.id !== id && b.status === "active").map((b) => <option key={b.id} value={b.id}>{b.full_name || b.name}</option>)}
              </select>
              <button className="btn-outline btn-sm" disabled={busy || !reassign[d.id]} onClick={() => act(`/suspensions/users/${id}/deals/${d.id}`, { decision: "reassign", newBrokerId: reassign[d.id] }, "Deal reassigned.")}>Reassign</button>
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => window.confirm("Close this deal as lost?") && act(`/suspensions/users/${id}/deals/${d.id}`, { decision: "close" }, "Deal closed.")}>Close</button>
            </div>
          ))}
        </div>
      )}

      {data.frozenCommissions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-ink-900">Frozen commission</p>
          {data.frozenCommissions.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
              <span className="flex-1">{formatINR(f.amount)} · frozen {formatDate(f.frozenAt)}{f.decision ? ` · ${f.decision === "release" ? "released" : "forfeited"} ${formatDate(f.decidedAt)}` : ""}</span>
              {!f.decision && <>
                <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/suspensions/commissions/${f.id}`, { decision: "release" }, "Share released for payout.")}>Release</button>
                <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const note = window.prompt("Why is the share forfeited?"); if (note) act(`/suspensions/commissions/${f.id}`, { decision: "forfeit", note }, "Share forfeited."); }}>Forfeit</button>
              </>}
            </div>
          ))}
        </div>
      )}

      {suspended && (
        <div className="space-y-2 rounded-xl border border-line p-4">
          <p className="text-sm font-bold text-ink-900">Reinstate</p>
          <p className="text-xs text-ink-500">Record the clarification received. Listings return to the approval queue and requirements wait for review; the referral code is the same one.</p>
          <textarea className="field-input" rows={2} value={clarification} onChange={(e) => setClarification(e.target.value)} placeholder="Clarification received from the person" />
          <button className="btn-primary btn-sm" disabled={busy || clarification.trim().length < 5} onClick={() => act(`/suspensions/users/${id}/reinstate`, { clarification }, "Account reinstated.")}>Reinstate account</button>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-ink-900">Record (cannot be edited)</p>
        <ol className="space-y-2">
          {data.events.map((e) => (
            <li key={e.id} className="rounded-xl bg-surface-muted p-3 text-sm">
              <p><b>{ACTION[e.action] || e.action}</b> · {new Date(e.actedAt).toLocaleString("en-IN")} · by <span data-no-translate>{e.actedBy}</span> ({titleCase(e.actedRole.replace(/_/g, " "))})</p>
              {e.reason && <p className="mt-0.5 text-ink-700" data-no-translate>{e.reason}</p>}
              {e.internalNote && <p className="mt-0.5 text-xs text-ink-500" data-no-translate>Note: {e.internalNote}</p>}
              {["suspended", "removed"].includes(e.action) && <p className="mt-0.5 text-xs text-ink-500">Hidden: {e.snapshot.listings?.length || 0} listing(s), {e.snapshot.requirements?.length || 0} requirement(s), {e.snapshot.shareLinks?.length || 0} share link(s); {e.snapshot.activeDeals?.length || 0} active deal(s); {e.snapshot.frozenCommissions?.length || 0} commission share(s) frozen.</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ReviewQueue() {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/suspensions/review-queue");
  if (!data) return <Spinner />;
  if (!data.length) return <div className="card"><EmptyState title="Nothing to review" subtitle="Requirements of reinstated accounts appear here before they go live again. Their listings go to the normal approval queue." /></div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Requirement</th><th className={th}>Owner</th><th className={th} /></tr></thead>
        <tbody className="divide-y divide-line">
          {data.map((r) => (
            <tr key={r.id}>
              <td className={th}>{titleCase(r.purpose)} · {titleCase(r.property_type || "any")} · <span data-no-translate>{r.city}</span>{r.budget_max ? ` · up to ${formatINR(r.budget_max)}` : ""}</td>
              <td className={th} data-no-translate>{r.owner_name}</td>
              <td className={`${th} text-right`}><button className="btn-primary btn-sm" onClick={() => call(`/suspensions/requirements/${r.id}/republish`, { method: "POST" }).then(() => { toast.push("Requirement is live again.", "success"); reload(); }).catch((e) => toast.push(e.message, "error"))}>Reviewed - republish</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuspensionsPage() {
  const { role } = useAuth();
  const superAdmin = role === "super_admin";
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(superAdmin ? "accounts" : "review");
  const list = useApiQuery(superAdmin ? "/suspensions" : null);
  const open = params.get("user");
  useEffect(() => {
    if (open) setTab("accounts");
  }, [open]);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Section 35" title="Suspended and removed accounts" subtitle="Suspension takes a person out of public view at once. Only the Super Admin sees these accounts, decides frozen commission and active deals, and reinstates." />
      <div className="flex gap-2 border-b border-line">
        {[superAdmin && ["accounts", "Accounts"], ["review", "Requirements to review"]].filter(Boolean).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? "border-red-600 text-red-600" : "border-transparent text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "review" && <ReviewQueue />}
      {tab === "accounts" && superAdmin && (!list.data ? <Spinner /> : !list.data.length ? <div className="card"><EmptyState title="No suspended or removed accounts" /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Account</th><th className={th}>Remark</th><th className={th}>Reason</th><th className={th}>When / by</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-line">
              {list.data.map((u) => (
                <tr key={u.id}>
                  <td className={th} data-no-translate><p className="font-semibold text-ink-900">{u.name}</p><p className="text-xs text-ink-500">{u.email} · {titleCase(u.role.replace(/_/g, " "))}</p></td>
                  <td className={th}><span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">{u.remark}</span>{u.frozenCommissions > 0 && <p className="mt-1 text-xs text-amber-700">{u.frozenCommissions} share(s) frozen</p>}</td>
                  <td className={`${th} max-w-xs text-xs text-ink-700`} data-no-translate>{u.reason || "No reason recorded"}</td>
                  <td className={`${th} text-xs`}>{u.actedAt ? new Date(u.actedAt).toLocaleString("en-IN") : "—"}<p className="text-ink-500" data-no-translate>{u.actedBy}</p></td>
                  <td className={`${th} text-right`}><button className="btn-outline btn-sm" onClick={() => setParams({ user: u.id })}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <Modal open={!!open && superAdmin} onClose={() => setParams({})} title="Suspension record" maxWidth="max-w-3xl">
        {open && <Record id={open} onChanged={list.reload} />}
      </Modal>
    </div>
  );
}
