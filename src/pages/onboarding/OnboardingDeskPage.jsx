import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Module 34 - Onboarding desk (A R staff): who is onboarding, what each one
// is stuck on, who is helping them, and partner enquiries waiting to become
// accounts.

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const STATE = { not_started: "Not started", in_progress: "In progress", stalled: "Stalled", completed: "Completed" };
const ROLE = { broker: "Broker", agency_admin: "Agency", builder: "Builder" };
const NOTE = { note: "Note", call: "Call", visit: "Visit", nudge: "Reminder", help_request: "Help request", system: "System" };
const csv = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

function useAct(reload) {
  const call = useApiCall();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (path, { method = "POST", body, msg, after } = {}) => {
    setBusy(true);
    try {
      const res = await call(path, { method, body });
      if (msg) toast.push(msg, "success");
      reload?.();
      after?.(res?.data);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return { act, busy };
}

function PartnerDetail({ userId, admin, staff, onClose, onChanged }) {
  const { data: p, loading, reload } = useApiQuery(`/onboarding/partners/${userId}`);
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [note, setNote] = useState({ kind: "call", body: "" });
  const [edit, setEdit] = useState(null);
  if (loading && !p) return <Modal open onClose={onClose} title="Onboarding"><Spinner /></Modal>;
  if (!p) return null;
  const builder = p.role === "builder";
  return (
    <Modal open onClose={onClose} title={p.name} description={`${ROLE[p.role]} · ${p.progressPercent}% complete · joined ${formatDate(p.joinedAt)}`}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        {p.helpRequestedAt && !p.complete && <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Asked for help on {formatDate(p.helpRequestedAt, true)}. Log a call or visit once you have spoken to them.</p>}
        <div className="rounded-xl bg-surface-muted p-3">
          <p data-no-translate>{p.email || "—"}{p.mobile ? ` · ${p.mobile}` : ""}</p>
          <p className="text-xs text-ink-500">Account {titleCase(p.accountStatus)} · last signed in {p.lastLoginAt ? formatDate(p.lastLoginAt, true) : "never"} · last progress {formatDate(p.lastProgressAt)} · {p.nudgeCount} reminders sent</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Checklist</p>
          {p.steps.map((s) => <p key={s.key} className="flex justify-between border-b border-line py-1 last:border-0"><span>{s.label}{!s.required ? " (recommended)" : ""}</span><span className={`text-xs font-semibold ${s.state === "done" ? "text-emerald-700" : s.state === "in_review" ? "text-amber-700" : "text-ink-500"}`}>{s.state === "done" ? "Done" : s.state === "in_review" ? "Being checked" : "To do"}</span></p>)}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-ink-500">Details</p><button className="btn-outline btn-sm" onClick={() => setEdit({ firmName: p.details.firmName || "", reraNumber: p.details.reraNumber || "", cities: (p.details.cities || []).join(", "), areas: (p.details.areas || []).join(", ") })}>Fill in for them</button></div>
          <p data-no-translate>{p.details.firmName || "No firm name yet"}</p>
          <p className="text-xs text-ink-500">{builder ? "Cities" : "Areas"}: <span data-no-translate>{(builder ? p.details.cities : p.details.areas).join(", ") || "—"}</span>{p.details.reraNumber ? <> · RERA <span data-no-translate>{p.details.reraNumber}</span></> : null}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">Assisted by</label>
            <select className="field-select" value={p.assistedBy || ""} disabled={busy || !admin} onChange={(e) => act(`/onboarding/partners/${userId}/assistant`, { method: "PUT", body: { staffId: e.target.value || null }, msg: "Assistant saved." })}>
              <option value="">Nobody yet</option>
              {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
            </select>
            {!admin && <p className="mt-1 text-xs text-ink-500">Admins assign the assistant.</p>}
          </div>
          <div className="flex items-end"><button className="btn-outline w-full" disabled={busy || p.complete} onClick={() => act(`/onboarding/partners/${userId}/nudge`, { msg: "Reminder sent." })}>Send a reminder now</button></div>
        </div>
        <div className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Log an assist</p>
          <div className="flex gap-2">
            <select className="field-select w-32" value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })}><option value="call">Call</option><option value="visit">Visit</option><option value="note">Note</option></select>
            <input className="field-input flex-1" placeholder="What was done" value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} />
            <button className="btn-primary btn-sm" disabled={busy || note.body.trim().length < 3} onClick={() => act(`/onboarding/partners/${userId}/notes`, { body: { kind: note.kind, body: note.body.trim() }, msg: "Logged.", after: () => setNote({ ...note, body: "" }) })}>Log</button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">History</p>
          {p.notes.length === 0 ? <p className="text-ink-500">Nothing logged yet.</p> : p.notes.map((n) => <p key={n.id} className="border-b border-line py-1.5 text-xs last:border-0"><span className="font-semibold">{NOTE[n.kind] || n.kind}</span> · {formatDate(n.at, true)}{n.by ? <> · <span data-no-translate>{n.by}</span></> : null}<br /><span className="text-ink-700" data-no-translate>{n.body}</span></p>)}
        </div>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Fill in details for them" description="Recorded on their history as filled in by you.">
        {edit && (
          <div className="space-y-3">
            <TextField label={builder ? "Company name" : "Firm name"} value={edit.firmName} onChange={(e) => setEdit({ ...edit, firmName: e.target.value })} />
            <TextField label="RERA number" value={edit.reraNumber} onChange={(e) => setEdit({ ...edit, reraNumber: e.target.value })} />
            <TextField label="Cities (comma separated)" value={edit.cities} onChange={(e) => setEdit({ ...edit, cities: e.target.value })} />
            {!builder && <TextField label="Areas they work in (comma separated)" value={edit.areas} onChange={(e) => setEdit({ ...edit, areas: e.target.value })} />}
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy || edit.firmName.trim().length < 2} onClick={() => act(`/onboarding/partners/${userId}/details`, { method: "PUT", body: { firmName: edit.firmName, reraNumber: edit.reraNumber || null, cities: csv(edit.cities), ...(builder ? {} : { areas: csv(edit.areas) }) }, msg: "Details saved.", after: () => setEdit(null) })}>Save</button></div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}

export default function OnboardingDeskPage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const [state, setState] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApiQuery(`/onboarding/partners${buildQuery({ state, role: kind, q })}`);
  const leads = useApiQuery("/onboarding/leads");
  const reps = useApiQuery("/representatives");
  const staff = (reps.data || []).filter((r) => r.status === "active");
  const { act, busy } = useAct(() => { reload(); leads.reload(); });
  const [open, setOpen] = useState(null);
  const [convert, setConvert] = useState(null);
  const rows = data?.partners || [];
  const st = data?.stats || {};
  return (
    <div>
      <PageHeader eyebrow="Onboarding Assist" title="Onboarding desk" subtitle="Brokers, agencies and builders getting set up: where each one is stuck, who is helping them, and partner enquiries waiting for an account." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        {[["Asked for help", st.needsHelp], ["Stalled", st.stalled], ["Not started", st.notStarted], ["In progress", st.inProgress], ["No assistant yet", st.unassigned], ["Completed", st.completed]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v ?? 0}</p></div>)}
      </div>

      {(leads.data || []).length > 0 && (
        <div className="card mb-4 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Partner enquiries waiting for an account ({leads.data.length})</p>
          <div className="space-y-2">
            {leads.data.slice(0, 8).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span><span className="font-semibold" data-no-translate>{l.name}</span> · {titleCase(l.category)}{l.businessName ? <> · <span data-no-translate>{l.businessName}</span></> : null}{l.city ? <> · <span data-no-translate>{[l.area, l.city].filter(Boolean).join(", ")}</span></> : null}<br /><span className="text-xs text-ink-500">{titleCase(l.status)} · {formatDate(l.createdAt)}{l.assignedName ? <> · with <span data-no-translate>{l.assignedName}</span></> : null}</span></span>
                {admin ? <button className="btn-outline btn-sm" onClick={() => setConvert({ id: l.id, name: l.name, category: l.category, email: "", password: "", role: "broker" })}>Create account</button> : <span className="text-xs text-ink-500">An admin creates the account</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="field-select h-9 w-48" value={state} onChange={(e) => setState(e.target.value)}><option value="">Everyone</option><option value="needs_help">Asked for help</option>{Object.entries(STATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="field-select h-9 w-40" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All kinds</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search name, email or firm" value={q} onChange={(e) => setQ(e.target.value)} />
        {admin && <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("/onboarding/jobs/sweep", { msg: "Stall check run." })}>Run stall check now</button>}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="Nobody here" subtitle="Brokers and builders appear as they register or when a partner enquiry is turned into an account." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Partner</th><th className={th}>Progress</th><th className={th}>Stuck on</th><th className={th}>Assisted by</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.userId} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => setOpen(p.userId)}>
                  <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{p.name}</span> <span className="text-xs text-ink-500">{ROLE[p.role]}</span><br /><span className="text-xs text-ink-500" data-no-translate>{p.firmName || p.email}</span></td>
                  <td className={th}><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-emerald-500" style={{ width: `${p.progressPercent}%` }} /></div><span className="text-xs">{p.progressPercent}%</span></div></td>
                  <td className={th}>{p.state === "completed" ? "—" : p.stuckOn}{p.waiting && <><br /><span className="text-xs text-amber-700">Waiting on our check</span></>}</td>
                  <td className={th} data-no-translate>{p.assistantName || "—"}</td>
                  <td className={th}><StatusBadge value={STATE[p.state]} />{p.helpRequestedAt && <><br /><span className="text-xs font-semibold text-amber-700">Asked for help</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && st.total > rows.length && !state && !kind && !q && <p className="mt-2 text-xs text-ink-500">Showing the {rows.length} that most need attention out of {st.total}. Use the filters or search to see the rest.</p>}
      {open && <PartnerDetail userId={open} admin={admin} staff={staff} onClose={() => setOpen(null)} onChanged={reload} />}
      <Modal open={!!convert} onClose={() => setConvert(null)} title={convert ? `Create an account for ${convert.name}` : ""} description="What they told us in the enquiry is filled in. Share the login with them.">
        {convert && (
          <div className="space-y-3">
            <TextField label="Login email" type="email" value={convert.email} onChange={(e) => setConvert({ ...convert, email: e.target.value })} />
            <TextField label="Initial password (min 8)" type="password" value={convert.password} onChange={(e) => setConvert({ ...convert, password: e.target.value })} />
            {convert.category === "broker" && <div><label className="field-label">Account type</label><select className="field-select" value={convert.role} onChange={(e) => setConvert({ ...convert, role: e.target.value })}><option value="broker">Broker</option><option value="agency_admin">Agency</option></select></div>}
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setConvert(null)}>Cancel</button><button className="btn-primary" disabled={busy || !convert.email || convert.password.length < 8} onClick={() => act(`/onboarding/leads/${convert.id}/convert`, { body: { email: convert.email, password: convert.password, role: convert.role }, msg: "Account created.", after: (p) => { setConvert(null); setOpen(p.userId); } })}>Create account</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
