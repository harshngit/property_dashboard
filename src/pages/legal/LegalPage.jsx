import PartnerLoginButton from "../../components/partners/PartnerLoginButton";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { formatDate, titleCase } from "../../lib/format";

// Module 24 - Legal Desk (A R staff).
//   Cases  describe the requirement -> documents auto-linked -> advocate
//          assigned -> status tracked; hand-off pack for the advocate
//   Panel  empanelled advocates and registered valuers. The LP code is issued
//          only after the enrolment check and never carries commission.

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const STATUS = { requested: "To assign", advocate_assigned: "Advocate assigned", in_progress: "In progress", report_ready: "Report ready", completed: "Completed", cancelled: "Cancelled" };
const SPECIALITY = { due_diligence: "Due diligence", title_verification: "Title verification", agreement_drafting: "Agreement drafting", registration_support: "Registration support", litigation: "Litigation", valuation: "Valuation" };
const NEXT = { advocate_assigned: [["in_progress", "Work started"]], in_progress: [["completed", "Mark completed"]], report_ready: [["completed", "Mark completed"]] };

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

function CaseDetail({ id, onClose, onChanged }) {
  const { data: c, loading, reload } = useApiQuery(`/legal/cases/${id}`);
  const panel = useApiQuery("/legal/professionals?status=empanelled");
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [pick, setPick] = useState({ professionalId: "", clientAdvocateName: "" });
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(true);
  const [reportId, setReportId] = useState("");
  const [pack, setPack] = useState(null);
  if (loading && !c) return <Modal open onClose={onClose} title="Legal case"><Spinner /></Modal>;
  if (!c) return null;
  const wantValuer = c.serviceType === "valuation";
  const choices = (panel.data?.professionals || []).filter((p) => (p.kind === "valuer") === wantValuer);
  const open = !["completed", "cancelled"].includes(c.status);
  return (
    <Modal open onClose={onClose} title={`${c.caseNumber} · ${c.serviceLabel}`} description={`${STATUS[c.status]}${c.dueOn ? ` · due ${formatDate(c.dueOn)}` : ""}`}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-xs text-ink-500">Client: <span data-no-translate>{c.customerName || "—"}</span>{c.propertyTitle ? <> · Property: <Link className="font-semibold text-red-600" to={`/app/properties/${c.propertyId}`} data-no-translate>{c.propertyTitle}</Link></> : null}{c.dealId ? <> · <Link className="font-semibold text-red-600" to={`/app/deals/${c.dealId}`}>Open deal</Link></> : null}</p>
          <p className="mt-2 whitespace-pre-line text-ink-900" data-no-translate>{c.requirement}</p>
          {c.overdue && <p className="mt-2 text-xs font-semibold text-red-600">Past its due date</p>}
          {c.initiationLate && <p className="mt-2 text-xs font-semibold text-red-600">Not started with the panel within the allowed time</p>}
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">{wantValuer ? "Valuer" : "Advocate"}</p>
          {c.advocate ? <p><span className="font-semibold" data-no-translate>{c.advocate.name}</span>{c.advocate.firm ? <>, <span data-no-translate>{c.advocate.firm}</span></> : null} {c.advocate.lpCode ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800" data-no-translate>{c.advocate.lpCode}</span> : <span className="text-xs text-ink-500">(client's own advocate)</span>}</p> : <p className="text-ink-500">Not assigned yet.</p>}
          {["requested", "advocate_assigned"].includes(c.status) && (
            <div className="mt-2 space-y-2 rounded-xl border border-line p-3">
              <select className="field-select" value={pick.professionalId} onChange={(e) => setPick({ professionalId: e.target.value, clientAdvocateName: "" })}>
                <option value="">{choices.length ? `Choose an empanelled ${wantValuer ? "valuer" : "advocate"}` : `No empanelled ${wantValuer ? "valuer" : "advocate"} on the panel yet`}</option>
                {choices.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.lpCode}{p.cities?.length ? ` · ${p.cities.join(", ")}` : ""} · {p.openCases} open</option>)}
              </select>
              {!wantValuer && <TextField label="Or the client's own chosen advocate" value={pick.clientAdvocateName} onChange={(e) => setPick({ professionalId: "", clientAdvocateName: e.target.value })} />}
              <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy || (!pick.professionalId && pick.clientAdvocateName.trim().length < 3)} onClick={() => act(`/legal/cases/${id}/assign`, { body: { professionalId: pick.professionalId || null, clientAdvocateName: pick.clientAdvocateName || null }, msg: "Assigned - the client has been told." })}>{c.advocate ? "Change" : "Assign"}</button></div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Linked documents ({c.linkedDocuments.length})</p>
          {c.linkedDocuments.length === 0 ? <p className="text-ink-500">Nothing on file for this client, deal or property yet.</p> : c.linkedDocuments.map((d) => <p key={d.id} className="text-xs"><span data-no-translate>{d.fileName || titleCase(d.type)}</span> · {titleCase(d.type)}{d.autoLinked ? " · linked automatically" : ""}</p>)}
          {c.advocate && <button className="btn-outline btn-sm mt-2" disabled={busy} onClick={() => act(`/legal/cases/${id}/handoff`, { msg: "Hand-off recorded.", after: setPack })}>Hand-off pack for the {wantValuer ? "valuer" : "advocate"}</button>}
        </div>

        {open && c.status !== "requested" && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Update</p>
            <TextareaField label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Show this note to the client</label>
            <TextField label="Report document ID (from Documents, to mark the report ready)" value={reportId} onChange={(e) => setReportId(e.target.value)} />
            <div className="flex flex-wrap justify-end gap-2">
              <button className="btn-outline btn-sm" disabled={busy || note.trim().length < 2} onClick={() => act(`/legal/cases/${id}/status`, { method: "PUT", body: { note: note.trim(), clientVisible: visible }, msg: "Note added.", after: () => setNote("") })}>Add note</button>
              {c.status !== "report_ready" && <button className="btn-outline btn-sm" disabled={busy || !/^[0-9a-f-]{36}$/i.test(reportId.trim())} onClick={() => act(`/legal/cases/${id}/status`, { method: "PUT", body: { status: "report_ready", reportDocumentId: reportId.trim(), note: note.trim() || null }, msg: "Report ready - the client has been told.", after: () => { setNote(""); setReportId(""); } })}>Report ready</button>}
              {(NEXT[c.status] || []).map(([s, label]) => <button key={s} className="btn-primary btn-sm" disabled={busy} onClick={() => act(`/legal/cases/${id}/status`, { method: "PUT", body: { status: s, note: note.trim() || null }, msg: "Case updated.", after: () => setNote("") })}>{label}</button>)}
            </div>
          </div>
        )}
        {open && <div className="flex justify-end"><button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason for cancelling this case"); if (reason) act(`/legal/cases/${id}/status`, { method: "PUT", body: { status: "cancelled", note: reason }, msg: "Case cancelled." }); }}>Cancel case</button></div>}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Timeline</p>
          {c.timeline.map((t, i) => <p key={i} className="border-b border-line py-1.5 text-xs last:border-0"><span className="font-semibold">{STATUS[t.kind] || titleCase(t.kind)}</span> · {formatDate(t.at, true)}{t.by ? <> · <span data-no-translate>{t.by}</span></> : null}{t.clientVisible === false ? " · internal" : ""}{t.note ? <><br /><span className="text-ink-700" data-no-translate>{t.note}</span></> : null}</p>)}
        </div>
        <p className="text-xs text-ink-500">{c.disclaimer}</p>
      </div>

      <Modal open={!!pack} onClose={() => setPack(null)} title="Hand-off pack" description="Pass this to the advocate. Document links expire shortly. The client engages the advocate directly.">
        {pack && (
          <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1 text-sm">
            <p><span className="font-semibold">{pack.caseNumber}</span> · {pack.service}{pack.dueOn ? ` · due ${formatDate(pack.dueOn)}` : ""}</p>
            <p data-no-translate>{pack.advocate.name}{pack.advocate.lpCode ? ` (${pack.advocate.lpCode})` : ""}{pack.advocate.email ? ` · ${pack.advocate.email}` : ""}{pack.advocate.mobile ? ` · ${pack.advocate.mobile}` : ""}</p>
            {pack.property && <p className="text-xs text-ink-600" data-no-translate>{pack.property.title} · {[pack.property.locality, pack.property.city].filter(Boolean).join(", ")}</p>}
            <p className="whitespace-pre-line rounded-xl bg-surface-muted p-3" data-no-translate>{pack.requirement}</p>
            {pack.documents.map((d) => <p key={d.id} className="text-xs">{d.url ? <a className="font-semibold text-red-600" href={d.url} target="_blank" rel="noreferrer" data-no-translate>{d.fileName || titleCase(d.type)}</a> : <span data-no-translate>{d.fileName || titleCase(d.type)}</span>} · {titleCase(d.type)}</p>)}
            <p className="text-xs text-ink-500">{pack.note}</p>
          </div>
        )}
      </Modal>
    </Modal>
  );
}

function Cases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApiQuery(`/legal/cases${buildQuery({ status, q })}`);
  const { act, busy } = useAct(reload);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  // "Open legal case" on a deal lands here with the deal already chosen.
  useEffect(() => {
    const dealId = searchParams.get("dealId");
    if (dealId) {
      setForm({ serviceType: "due_diligence", requirement: "", dealId });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const rows = data?.cases || [];
  const stats = data?.stats || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["To assign", stats.to_assign], ["In progress", stats.in_progress], ["Report ready", stats.report_ready], ["Overdue", stats.overdue], ["Completed", stats.completed]].map(([label, value]) => (
          <div key={label} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select className="field-select h-9 w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All cases</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search case number, client, property or advocate" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setForm({ serviceType: "due_diligence", requirement: "", dealId: "" })}><LuPlus className="h-4 w-4" /> New case</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No legal cases here" subtitle="Cases open when a client asks for legal help, a legal enquiry arrives, or an Exclusive Mandate is activated." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Case</th><th className={th}>Client / property</th><th className={th}>Advocate</th><th className={th}>Due</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => setOpen(c.id)}>
                  <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{c.caseNumber}</span><br /><span className="text-xs text-ink-500">{c.serviceLabel} · {titleCase(c.source)} · {c.documents} documents</span></td>
                  <td className={th}><span data-no-translate>{c.customerName || "—"}</span>{c.propertyTitle && <><br /><span className="text-xs text-ink-500" data-no-translate>{c.propertyTitle}</span></>}</td>
                  <td className={th}>{c.advocate ? <><span data-no-translate>{c.advocate.name}</span>{c.advocate.lpCode && <><br /><span className="text-xs text-ink-500" data-no-translate>{c.advocate.lpCode}</span></>}</> : "—"}</td>
                  <td className={th}>{c.dueOn ? formatDate(c.dueOn) : "—"}{c.overdue && <><br /><span className="text-xs font-semibold text-red-600">Overdue</span></>}{c.initiationLate && <><br /><span className="text-xs font-semibold text-red-600">Start it now</span></>}</td>
                  <td className={th}><StatusBadge value={STATUS[c.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <CaseDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      <Modal open={!!form} onClose={() => setForm(null)} title="New legal case" description="Documents already on file for the deal, property and client are linked automatically.">
        {form && (
          <div className="space-y-3">
            <div>
              <label className="field-label">Service</label>
              <select className="field-select" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>{(data?.services || []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </div>
            <TextField label="Deal ID (from the deal's page address)" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })} />
            <TextareaField label="What is needed" rows={4} value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || form.requirement.trim().length < 10 || !/^[0-9a-f-]{36}$/i.test(form.dealId.trim())} onClick={() => act("/legal/cases", { body: { serviceType: form.serviceType, requirement: form.requirement.trim(), dealId: form.dealId.trim() }, msg: "Legal case opened.", after: (c) => { setForm(null); setOpen(c.id); } })}>Open case</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const EMPTY = { kind: "advocate", fullName: "", firmName: "", enrolmentNumber: "", enrolmentBody: "", email: "", mobile: "", states: "", cities: "", specialities: [] };

function Panel({ admin }) {
  const { data, loading, reload } = useApiQuery("/legal/professionals");
  const { act, busy } = useAct(reload);
  const [form, setForm] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState("");
  const rows = data?.professionals || [];
  const toggle = (s) => setForm((f) => ({ ...f, specialities: f.specialities.includes(s) ? f.specialities.filter((x) => x !== s) : [...f.specialities, s] }));
  const save = () => act(form.id ? `/legal/professionals/${form.id}` : "/legal/professionals", { method: form.id ? "PUT" : "POST", body: { ...form, states: form.states.split(",").map((x) => x.trim()).filter(Boolean), cities: form.cities.split(",").map((x) => x.trim()).filter(Boolean) }, msg: "Saved.", after: () => setForm(null) });
  const verb = { empanel: "Empanel and issue LP code", suspend: "Suspend", reinstate: "Reinstate" };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">An LP code is issued only after the enrolment / empanelment check is recorded. It is for attribution only: no commission or referral fee is ever paid on legal work.</p>
        {admin && <button className="btn-primary shrink-0" onClick={() => setForm(EMPTY)}><LuPlus className="h-4 w-4" /> Add to panel</button>}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="The panel is empty" subtitle="Add your empanelled advocates and registered valuers, then record their enrolment check to issue the LP code." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Name</th><th className={th}>LP code</th><th className={th}>Enrolment</th><th className={th}>Coverage</th><th className={th}>Cases</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{p.fullName}</span> <span className="text-xs text-ink-500">{titleCase(p.kind)}</span><br /><span className="text-xs text-ink-500" data-no-translate>{p.firmName || ""}</span></td>
                  <td className={th} data-no-translate>{p.lpCode || "—"}</td>
                  <td className={th}><span data-no-translate>{p.enrolmentNumber}</span><br /><span className="text-xs text-ink-500" data-no-translate>{p.enrolmentBody || ""}</span></td>
                  <td className={`${th} text-xs`}><span data-no-translate>{[...(p.cities || []), ...(p.states || [])].join(", ") || "—"}</span><br />{(p.specialities || []).map((s) => SPECIALITY[s] || s).join(", ")}</td>
                  <td className={th}>{p.openCases} open · {p.completedCases} done</td>
                  <td className={th}><StatusBadge value={titleCase(p.status)} /></td>
                  <td className={th}>
                    {admin && (
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-outline btn-sm" onClick={() => setForm({ id: p.id, kind: p.kind, fullName: p.fullName, firmName: p.firmName || "", enrolmentNumber: p.enrolmentNumber, enrolmentBody: p.enrolmentBody || "", email: p.email || "", mobile: p.mobile || "", states: (p.states || []).join(", "), cities: (p.cities || []).join(", "), specialities: p.specialities || [] })}>Edit</button>
                        <PartnerLoginButton kind="legal" record={p} active={p.status === "empanelled"} onDone={reload} />
                        <button className={p.status === "empanelled" ? "btn-outline btn-sm" : "btn-primary btn-sm"} onClick={() => { setNote(""); setDeciding({ id: p.id, action: p.status === "pending" ? "empanel" : p.status === "empanelled" ? "suspend" : "reinstate", name: p.fullName }); }}>{p.status === "pending" ? "Empanel" : p.status === "empanelled" ? "Suspend" : "Reinstate"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit panel member" : "Add to the panel"}>
        {form && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div>
              <label className="field-label">Kind</label>
              <select className="field-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="advocate">Advocate</option><option value="valuer">Registered valuer</option></select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <TextField label="Firm (optional)" value={form.firmName} onChange={(e) => setForm({ ...form, firmName: e.target.value })} />
              <TextField label={form.kind === "advocate" ? "Bar Council enrolment number" : "Valuer registration number"} value={form.enrolmentNumber} onChange={(e) => setForm({ ...form, enrolmentNumber: e.target.value })} />
              <TextField label={form.kind === "advocate" ? "Bar Council" : "Registering body"} value={form.enrolmentBody} onChange={(e) => setForm({ ...form, enrolmentBody: e.target.value })} />
              <TextField label="Email (staff only)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Mobile (staff only)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              <TextField label="Cities (comma separated)" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />
              <TextField label="State codes (comma separated)" placeholder="DL, HR" value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Work they take</label>
              <div className="flex flex-wrap gap-2">{(data?.specialities || []).map((s) => <button key={s} type="button" onClick={() => toggle(s)} className={`rounded-full px-3 py-1 text-xs font-semibold ${form.specialities.includes(s) ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`}>{SPECIALITY[s] || s}</button>)}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || form.fullName.trim().length < 2 || form.enrolmentNumber.trim().length < 3} onClick={save}>Save</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!deciding} onClose={() => setDeciding(null)} title={deciding ? `${verb[deciding.action]}: ${deciding.name}` : ""} description={deciding?.action === "empanel" ? "Record what was checked - the enrolment certificate and the empanelment letter. It is kept against the code." : "The reason is kept in the audit log."}>
        <TextareaField label={deciding?.action === "empanel" ? "What was checked" : "Reason"} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setDeciding(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => act(`/legal/professionals/${deciding.id}/decision`, { body: { action: deciding.action, note: note.trim() }, msg: "Recorded.", after: () => setDeciding(null) })}>{deciding ? verb[deciding.action] : ""}</button>
        </div>
      </Modal>
    </div>
  );
}

export default function LegalPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState("cases");
  return (
    <div>
      <PageHeader eyebrow="Legal Integration" title="Legal Desk" subtitle="Legal cases from request to completion, and the panel of empanelled advocates and valuers. A R Buildwel refers and coordinates; the client engages the advocate directly." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["cases", "Cases"], ["panel", "Advocates & valuers"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>{label}</button>
        ))}
      </div>
      {tab === "cases" ? <Cases /> : <Panel admin={ADMIN.includes(role)} />}
    </div>
  );
}
