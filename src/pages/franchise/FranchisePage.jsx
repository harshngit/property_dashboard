import { useState } from "react";
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
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Sec. 14 Franchise desk (A R Buildwel staff).
//   Franchisees  organisation code, Franchisee Admin, Franchisee Manager, status, domain
//   Territories  pincode grants: exclusive / open / reserved for expansion
//   Commission   pool and split per closed territory deal; release after collection
//   Invoices     dues from franchisees and the 3-level suspension
//   Conflicts    Territory Conflict Check queue
//   Support      tickets raised by franchisees

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const money = (v) => formatINR(v, { compact: false });
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const LEVEL = { active: "Active", level_1: "Level 1 - Overdue", level_2: "Level 2 - No new leads", level_3: "Level 3 - Suspended" };
const LEVEL_TONE = { active: "bg-emerald-100 text-emerald-800", level_1: "bg-amber-100 text-amber-800", level_2: "bg-orange-100 text-orange-800", level_3: "bg-red-100 text-red-700" };
const GRANT = { exclusive: "Exclusive", open: "Open / non-exclusive", reserved: "Reserved for expansion" };
export const LevelPill = ({ level }) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_TONE[level] || LEVEL_TONE.active}`}>{LEVEL[level] || level}</span>;

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
      return res?.data;
    } catch (err) {
      toast.push(err.message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { act, busy };
}

// ------------------------------------------------------------ franchisees

const EMPTY = { legalName: "", slug: "", adminName: "", adminEmail: "", adminPassword: "", adminMobile: "", gstin: "", pan: "", managerUserId: "", deploymentTier: "shared", agreementStart: "", agreementEnd: "" };

function FranchiseeForm({ open, onClose, onSaved, staff }) {
  const [f, setF] = useState(EMPTY);
  const { act, busy } = useAct();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = () =>
    act("/franchise", {
      body: { ...f, managerUserId: f.managerUserId || null, agreementStart: f.agreementStart || null, agreementEnd: f.agreementEnd || null },
      msg: "Franchisee created. Share the login with the Franchisee Admin.",
      after: () => { setF(EMPTY); onSaved(); },
    });
  return (
    <Modal open={open} onClose={onClose} title="New franchisee" description="Creates the organisation, its permanent FR code and the Franchisee Admin login.">
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <TextField label="Registered firm name (internal only)" value={f.legalName} onChange={set("legalName")} />
        <TextField label="Organisation short name (used in the FR code)" placeholder="property-india" value={f.slug} onChange={set("slug")} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Franchisee Admin name" value={f.adminName} onChange={set("adminName")} />
          <TextField label="Admin mobile" value={f.adminMobile} onChange={set("adminMobile")} />
          <TextField label="Admin login email" type="email" value={f.adminEmail} onChange={set("adminEmail")} />
          <TextField label="Initial password (min 8)" type="password" value={f.adminPassword} onChange={set("adminPassword")} />
          <TextField label="GSTIN (optional)" value={f.gstin} onChange={set("gstin")} />
          <TextField label="PAN (optional)" value={f.pan} onChange={set("pan")} />
          <TextField label="Agreement start" type="date" value={f.agreementStart} onChange={set("agreementStart")} />
          <TextField label="Agreement end" type="date" value={f.agreementEnd} onChange={set("agreementEnd")} />
        </div>
        <div>
          <label className="field-label">Franchisee Manager (A R Buildwel staff)</label>
          <select className="field-select" value={f.managerUserId} onChange={set("managerUserId")}>
            <option value="">Not assigned yet</option>
            {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Deployment tier</label>
          <select className="field-select" value={f.deploymentTier} onChange={set("deploymentTier")}>
            <option value="shared">Shared (default)</option><option value="dedicated">Dedicated (premium)</option><option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy || !f.legalName || !f.adminEmail || f.adminPassword.length < 8} onClick={save}>Create franchisee</button>
      </div>
    </Modal>
  );
}

const DOMAIN = { none: "No domain", pending_dns: "Waiting for DNS", dns_ok: "DNS correct", ssl_pending: "DNS correct - certificate pending", live: "Live and secure", error: "Problem" };

// DNS record and live certificate of the franchisee's domain, and the branded email sender.
function DomainStatus({ id }) {
  const call = useApiCall();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sender, setSender] = useState({ fromAddress: "", replyTo: "" });
  const check = async () => {
    setBusy(true);
    try {
      setS((await call(`/franchise/${id}/domain/check`, { method: "POST" })).data);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveSender = () => call(`/franchise/${id}/email-sender`, { method: "PUT", body: sender }).then(() => toast.push("Email sender saved.", "success")).catch((e) => toast.push(e.message, "error"));
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{s ? <><b>{DOMAIN[s.status] || s.status}</b> <span className="text-ink-500">· {s.detail}</span></> : <span className="text-ink-500">Checked automatically every 6 hours.</span>}</span>
        <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={check}>Check DNS and certificate now</button>
      </div>
      {s?.target && <p className="text-xs text-ink-500">Point the domain (CNAME) to <span className="font-mono" data-no-translate>{s.target}</span>. The certificate is issued and renewed automatically by the edge server.</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="field-input" placeholder="Send branded email from (verified domain)" value={sender.fromAddress} onChange={(e) => setSender({ ...sender, fromAddress: e.target.value })} />
        <input className="field-input" placeholder="Reply-to (optional)" value={sender.replyTo} onChange={(e) => setSender({ ...sender, replyTo: e.target.value })} />
        <button type="button" className="btn-outline btn-sm" onClick={saveSender}>Save email sender</button>
      </div>
    </div>
  );
}

function FranchiseeDetail({ id, admin, staff, onClose, onChanged }) {
  const { data: f, loading, reload } = useApiQuery(`/franchise/${id}`);
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [domain, setDomain] = useState(null);
  const [invoice, setInvoice] = useState(null);
  if (loading && !f) return <Modal open onClose={onClose} title="Franchisee"><Spinner /></Modal>;
  if (!f) return null;
  const b = f.branding || {};
  const d = domain || { domainModel: b.domainModel || "subdomain", host: b.host || "", domainActive: !!b.domainActive, brandMode: b.brandMode || "arb_representative" };
  return (
    <Modal open onClose={onClose} title={f.legalName} description={`${f.orgCode} · ${f.orgSerial}`}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={titleCase(f.status)} />
          <LevelPill level={f.suspensionStatus} />
          {!f.brandingCompliant && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Branding not compliant - no routed leads</span>}
          <span className="text-ink-500">Outstanding {money(f.totalOutstanding)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-muted p-3">
          <p><span className="text-ink-500">Franchisee Admin</span><br /><span data-no-translate>{f.admin?.full_name || "—"}</span><br /><span className="text-xs text-ink-500" data-no-translate>{f.admin?.email}</span></p>
          <p><span className="text-ink-500">GSTIN / PAN</span><br /><span data-no-translate>{f.gstin || "—"} / {f.pan || "—"}</span></p>
          <p><span className="text-ink-500">Agreement</span><br />{f.agreementStart ? formatDate(f.agreementStart) : "—"} to {f.agreementEnd ? formatDate(f.agreementEnd) : "—"}</p>
          <p><span className="text-ink-500">Deployment tier</span><br />{titleCase(f.deploymentTier)}</p>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Reach (territory sizing)</p>
          {f.reach?.suggestion ? (
            <p>{f.reach.brokers} active brokers · {f.reach.pincodes} pincodes · {f.reach.leads90d} inquiries in 90 days · SLA {f.reach.slaCompliancePercent ?? "—"}% · closure {f.reach.closureRatePercent ?? "—"}%<br /><span className="font-semibold">{f.reach.suggestion}</span></p>
          ) : <p className="text-ink-500">Calculated by the hourly run.</p>}
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Territories</p>
          {f.territories.length === 0 ? <p className="text-ink-500">No territory granted yet. Grant one under Territories.</p> : f.territories.map((t) => (
            <p key={t.id} className="mb-1"><span className="font-semibold" data-no-translate>{t.name}</span> · {GRANT[t.grantType]} · {titleCase(t.status)}<br /><span className="text-xs text-ink-500" data-no-translate>{t.pincodes.join(", ")}</span></p>
          ))}
        </div>

        {admin && (
          <>
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Franchisee Manager, status and branding compliance</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Franchisee Manager</label>
                  <select className="field-select" value={f.managerUserId || ""} disabled={busy} onChange={(e) => act(`/franchise/${id}`, { method: "PUT", body: { managerUserId: e.target.value || null }, msg: "Franchisee Manager saved." })}>
                    <option value="">Not assigned</option>
                    {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Status</label>
                  <select className="field-select" value={f.status} disabled={busy} onChange={(e) => { if (e.target.value !== "terminated" || window.confirm("Terminate this franchisee? Open inquiries go back to A R Buildwel.")) act(`/franchise/${id}`, { method: "PUT", body: { status: e.target.value }, msg: "Status saved." }); }}>
                    <option value="pending">Pending</option><option value="active">Active</option><option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2">
                <input type="checkbox" checked={f.brandingCompliant} disabled={busy} onChange={(e) => act(`/franchise/${id}`, { method: "PUT", body: { brandingCompliant: e.target.checked }, msg: "Branding compliance saved." })} />
                Presents as A R Buildwel (required to receive territory-routed inquiries)
              </label>
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Domain (held by A R Buildwel)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Model</label>
                  <select className="field-select" value={d.domainModel} onChange={(e) => setDomain({ ...d, domainModel: e.target.value })}>
                    <option value="subdomain">Subdomain of an A R Buildwel domain</option><option value="own_domain">Separate domain held by A R Buildwel</option>
                  </select>
                </div>
                <TextField label="Host" placeholder="propertyindia.propertyserch.com" value={d.host} onChange={(e) => setDomain({ ...d, host: e.target.value })} />
                <div>
                  <label className="field-label">Brand mode</label>
                  <select className="field-select" value={d.brandMode} onChange={(e) => setDomain({ ...d, brandMode: e.target.value })}>
                    <option value="arb_representative">A R Buildwel brand, firm name small</option><option value="white_label">White label - franchisee's own brand</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={d.domainActive} onChange={(e) => setDomain({ ...d, domainActive: e.target.checked })} /> Mapping switched on</label>
              </div>
              <p className="mt-2 text-xs text-ink-500">Create the DNS record first. The franchisee never gets DNS, registrar or hosting access.</p>
              <DomainStatus id={id} />
              <div className="mt-2 flex justify-end"><button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/franchise/${id}/domain`, { method: "PUT", body: d, msg: "Domain saved.", after: () => setDomain(null) })}>Save domain</button></div>
            </div>

            <div className="flex justify-end"><button className="btn-primary btn-sm" onClick={() => setInvoice({ kind: "annual_fee", baseAmount: "", description: "" })}>Raise an invoice</button></div>
          </>
        )}
      </div>

      <Modal open={!!invoice} onClose={() => setInvoice(null)} title="Raise an invoice" description="GST is added. The payment ladder starts from today (Day 0).">
        {invoice && (
          <div className="space-y-3">
            <div>
              <label className="field-label">Kind</label>
              <select className="field-select" value={invoice.kind} onChange={(e) => setInvoice({ ...invoice, kind: e.target.value })}>
                <option value="commission">A R Buildwel commission</option><option value="setup_fee">Setup fee</option><option value="annual_fee">Annual fee</option><option value="domain">Domain cost</option><option value="other">Other</option>
              </select>
            </div>
            <TextField label="Amount before GST (₹)" type="number" min="1" value={invoice.baseAmount} onChange={(e) => setInvoice({ ...invoice, baseAmount: e.target.value })} />
            <TextField label="Description (optional)" value={invoice.description} onChange={(e) => setInvoice({ ...invoice, description: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setInvoice(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !(Number(invoice.baseAmount) > 0)} onClick={() => act(`/franchise/${id}/invoices`, { body: { ...invoice, baseAmount: Number(invoice.baseAmount) }, msg: "Invoice raised.", after: () => setInvoice(null) })}>Raise invoice</button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}

function Franchisees({ admin }) {
  const { data, loading, reload } = useApiQuery("/franchise");
  const reps = useApiQuery("/representatives");
  const staff = (reps.data || []).filter((r) => r.status === "active");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const rows = data || [];
  return (
    <div className="space-y-3">
      {admin && <div className="flex justify-end"><button className="btn-primary" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" /> New franchisee</button></div>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No franchisees yet" subtitle="Create the first franchisee, then grant its territory by pincode." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Franchisee</th><th className={th}>Status</th><th className={th}>Payments</th><th className={th}>Territory</th><th className={th}>Brokers</th><th className={th}>Manager</th><th className={th}>Domain</th></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => setOpen(f.id)}>
                  <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{f.legalName}</span><br /><span className="text-xs text-ink-500" data-no-translate>{f.orgCode} · {f.orgSerial}</span></td>
                  <td className={th}><StatusBadge value={titleCase(f.status)} /></td>
                  <td className={th}><LevelPill level={f.suspensionStatus} />{f.totalOutstanding > 0 && <><br /><span className="text-xs text-ink-500">{money(f.totalOutstanding)} outstanding</span></>}</td>
                  <td className={th}>{f.territories} territories · {f.pincodes} pincodes</td>
                  <td className={th}>{f.brokers}</td>
                  <td className={th} data-no-translate>{f.managerName || "—"}</td>
                  <td className={th}>{f.host ? <span data-no-translate>{f.host}</span> : "—"}{f.host && !f.domainActive && <span className="text-xs text-ink-500"> (off)</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FranchiseeForm open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload(); }} staff={staff} />
      {open && <FranchiseeDetail id={open} admin={admin} staff={staff} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

// ------------------------------------------------------------- territories

function Territories({ admin }) {
  const { data, loading, reload } = useApiQuery("/franchise/territories");
  const fr = useApiQuery("/franchise");
  const { act, busy } = useAct(reload);
  const [form, setForm] = useState(null);
  const [granting, setGranting] = useState(null);
  const franchisees = (fr.data || []).filter((f) => f.status !== "terminated");
  const rows = data || [];
  const save = () => {
    const body = { name: form.name, grantType: form.grantType, pincodes: form.pincodes.split(/[\s,;]+/).filter(Boolean), franchiseeId: form.grantType === "reserved" ? null : form.franchiseeId || null, firstRefusalFranchiseeId: form.grantType === "reserved" ? form.firstRefusalFranchiseeId || null : null, reviewOn: form.reviewOn || null, notes: form.notes || null };
    act(form.id ? `/franchise/territories/${form.id}` : "/franchise/territories", { method: form.id ? "PUT" : "POST", body, msg: "Territory saved.", after: () => setForm(null) });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">Territory is granted by pincode. NRI, HNI and institutional deals are handled centrally whatever the pincode.</p>
        {admin && <button className="btn-primary shrink-0" onClick={() => setForm({ name: "", grantType: "exclusive", pincodes: "", franchiseeId: "", firstRefusalFranchiseeId: "", reviewOn: "", notes: "" })}><LuPlus className="h-4 w-4" /> Grant territory</button>}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No territories yet" subtitle="Grant a territory to a franchisee, or hold one in reserve for expansion." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Territory</th><th className={th}>Type</th><th className={th}>Franchisee</th><th className={th}>Pincodes</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{t.name}</span><br /><span className="text-xs text-ink-500">Granted {formatDate(t.grantedOn)}{t.reviewOn ? ` · review ${formatDate(t.reviewOn)}` : ""}</span></td>
                  <td className={th}>{GRANT[t.grantType]}</td>
                  <td className={th} data-no-translate>{t.orgCode || "—"}</td>
                  <td className={`${th} max-w-xs text-xs`} data-no-translate>{t.pincodes.join(", ")}</td>
                  <td className={th}><StatusBadge value={titleCase(t.status)} /></td>
                  <td className={th}>
                    {admin && t.status === "active" && (
                      <div className="flex justify-end gap-1.5">
                        {t.grantType === "reserved" && <button className="btn-primary btn-sm" onClick={() => setGranting({ id: t.id, franchiseeId: t.firstRefusalFranchiseeId || "", grantType: "exclusive", firstRefusal: t.firstRefusalFranchiseeId, overrideFirstRefusal: false })}>Grant</button>}
                        <button className="btn-outline btn-sm" onClick={() => setForm({ id: t.id, name: t.name, grantType: t.grantType, pincodes: t.pincodes.join(", "), franchiseeId: t.franchiseeId || "", firstRefusalFranchiseeId: t.firstRefusalFranchiseeId || "", reviewOn: t.reviewOn ? String(t.reviewOn).slice(0, 10) : "", notes: t.notes || "" })}>Edit</button>
                        <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason for withdrawing this territory"); if (reason !== null) act(`/franchise/territories/${t.id}/withdraw`, { body: { reason }, msg: "Territory withdrawn." }); }}>Withdraw</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit territory" : "Grant territory"} description="Pincodes must already be in the geographic master data. An exclusive pincode cannot be shared with another franchisee.">
        {form && (
          <div className="space-y-3">
            <TextField label="Territory name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div>
              <label className="field-label">Grant type</label>
              <select className="field-select" value={form.grantType} onChange={(e) => setForm({ ...form, grantType: e.target.value })}>
                <option value="exclusive">Exclusive - no other franchisee, A R Buildwel stays out</option><option value="open">Open / non-exclusive</option><option value="reserved">Reserved for expansion</option>
              </select>
            </div>
            <div>
              <label className="field-label">{form.grantType === "reserved" ? "Right of first refusal (optional)" : "Franchisee"}</label>
              <select className="field-select" value={form.grantType === "reserved" ? form.firstRefusalFranchiseeId : form.franchiseeId} onChange={(e) => setForm({ ...form, [form.grantType === "reserved" ? "firstRefusalFranchiseeId" : "franchiseeId"]: e.target.value })}>
                <option value="">{form.grantType === "reserved" ? "Nobody yet" : "Choose a franchisee"}</option>
                {franchisees.map((f) => <option key={f.id} value={f.id}>{f.orgCode}</option>)}
              </select>
            </div>
            <TextareaField label="Pincodes (comma or space separated)" rows={3} value={form.pincodes} onChange={(e) => setForm({ ...form, pincodes: e.target.value })} />
            <TextField label="Review on (optional)" type="date" value={form.reviewOn} onChange={(e) => setForm({ ...form, reviewOn: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !form.name || !form.pincodes.trim() || (form.grantType !== "reserved" && !form.franchiseeId)} onClick={save}>Save territory</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!granting} onClose={() => setGranting(null)} title="Grant reserved territory" description="The franchisee holding right of first refusal is offered it first.">
        {granting && (
          <div className="space-y-3">
            <div>
              <label className="field-label">Franchisee</label>
              <select className="field-select" value={granting.franchiseeId} onChange={(e) => setGranting({ ...granting, franchiseeId: e.target.value })}>
                <option value="">Choose a franchisee</option>
                {franchisees.map((f) => <option key={f.id} value={f.id}>{f.orgCode}{f.id === granting.firstRefusal ? " (first refusal)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Grant as</label>
              <select className="field-select" value={granting.grantType} onChange={(e) => setGranting({ ...granting, grantType: e.target.value })}><option value="exclusive">Exclusive</option><option value="open">Open / non-exclusive</option></select>
            </div>
            {granting.firstRefusal && granting.franchiseeId && granting.franchiseeId !== granting.firstRefusal && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={granting.overrideFirstRefusal} onChange={(e) => setGranting({ ...granting, overrideFirstRefusal: e.target.checked })} /> The franchisee with first refusal has declined</label>
            )}
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setGranting(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !granting.franchiseeId} onClick={() => act(`/franchise/territories/${granting.id}/grant`, { body: granting, msg: "Territory granted.", after: () => setGranting(null) })}>Grant</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// -------------------------------------------------------------- commission

export function ShareTable({ shares }) {
  return (
    <table className="mt-2 w-full text-left text-xs">
      <thead className="text-ink-500"><tr><th className="py-1">Party</th><th>Role on this deal</th><th>Share</th><th className="text-right">Base</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
      <tbody>
        {shares.map((s, i) => (
          <tr key={i} className="border-t border-line">
            <td className="py-1 font-semibold" data-no-translate>{s.name}</td><td>{s.roles.join(" + ")}</td><td>{Math.round(s.fraction * 1000) / 10}%</td>
            <td className="text-right">{money(s.base)}</td><td className="text-right">{s.gstRegistered ? money(s.gst) : "Not registered"}</td><td className="text-right font-semibold">{money(s.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
const SCENARIO = { no_broker: "No broker - franchisee handled it directly", with_broker: "Broker involved - shares stack by role", own_business: "Franchisee's own business - no split" };
const COMM = { calculated: "Waiting for client payment", releasable: "Ready to release", released: "Released" };

// Before paying: invoices still missing, and each person's gross, TDS and net.
function ReleasePlan({ id }) {
  const { data } = useApiQuery(`/franchise/commissions/${id}/release-plan`);
  if (!data) return <Spinner />;
  return (
    <div className="mb-4 space-y-2 text-sm">
      {data.missingInvoices.length > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Waiting for an approved GST invoice from {data.missingInvoices.join(", ")}. Review them under GST invoices.</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="py-1.5">Paid to</th><th>Base</th><th>GST</th><th>TDS</th><th>Net</th></tr></thead>
        <tbody className="divide-y divide-line">
          {data.lines.map((l) => (
            <tr key={l.userId}>
              <td className="py-1.5" data-no-translate>{l.payeeName}<span className="block text-[11px] text-ink-500">{l.panLast4 ? `PAN ••••${l.panLast4}` : "No PAN on file - higher TDS rate"}</span></td>
              <td>{money(l.base)}</td><td>{money(l.gst)}</td><td>{l.tds ? `${money(l.tds)} (${l.tdsRate}%)` : "—"}</td><td className="font-semibold">{money(l.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-ink-500">TDS is on the amount before GST, at the statutory rate in force, once the person's payouts this year (all channels, by PAN) cross the threshold.</p>
    </div>
  );
}

// GST invoices the franchisee and brokers raise to A R Buildwel for their shares.
function GstInvoices({ admin }) {
  const [status, setStatus] = useState("submitted");
  const { data, loading, reload } = useApiQuery(`/franchise/commission-invoices?status=${status}`);
  const { act, busy } = useAct(reload);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">{[["submitted", "To review"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === k ? "bg-ink-900 text-white" : "bg-surface-sunk text-ink-700"}`}>{l}</button>)}</div>
      {loading && !data ? <Spinner /> : !(data || []).length ? <EmptyState title="Nothing here" subtitle="Franchisees and brokers upload their GST invoice for a share from their own screens." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="px-4 py-3">From</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Taxable / GST / total</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3" data-no-translate>{i.payeeName}<span className="block text-xs text-ink-500">{i.party === "franchisee" ? "Franchisee" : "Broker"}</span></td>
                  <td className="px-4 py-3" data-no-translate>{i.invoiceNumber}<span className="block text-xs text-ink-500">{formatDate(i.invoiceDate)}</span>{i.fileUrl && <a className="text-xs font-semibold text-red-600" href={i.fileUrl} target="_blank" rel="noreferrer">Open file</a>}</td>
                  <td className="px-4 py-3">{money(i.taxableAmount)} / {money(i.gstAmount)} / <b>{money(i.totalAmount)}</b></td>
                  <td className="px-4 py-3 font-mono text-xs" data-no-translate>{i.supplierGstin}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {admin && i.status === "submitted" && <>
                      <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(`/franchise/commission-invoices/${i.id}/review`, { body: { decision: "approve" }, msg: "Invoice approved." })}>Approve</button>{" "}
                      <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const note = window.prompt("Why is the invoice not accepted? (sent to them)"); if (note) act(`/franchise/commission-invoices/${i.id}/review`, { body: { decision: "reject", note }, msg: "Invoice rejected." }); }}>Reject</button>
                    </>}
                    {i.reviewNote && <p className="text-xs text-ink-500" data-no-translate>{i.reviewNote}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Commissions({ admin, superAdmin }) {
  const { data, loading, reload } = useApiQuery("/franchise/commissions");
  const { act, busy } = useAct(reload);
  const [releasing, setReleasing] = useState(null);
  const [ref, setRef] = useState("");
  const rows = data || [];
  if (loading && !data) return <Spinner />;
  if (!rows.length) return <EmptyState title="No commission calculations yet" subtitle="One is created when a deal in a franchisee's territory is closed." />;
  return (
    <div className="space-y-3">
      {rows.map((c) => (
        <div key={c.id} className="card p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink-900"><span data-no-translate>{c.orgCode}</span> · pool {money(c.pool)} <StatusBadge value={COMM[c.status]} /></p>
              <p className="text-xs text-ink-500">Deal value {money(c.dealValue)} (registered value) · buyer side {money(c.buyerFee)} + seller side {money(c.sellerFee)} · {SCENARIO[c.scenario]} · {formatDate(c.createdAt)}</p>
            </div>
            <div className="flex gap-1.5">
              {admin && c.status === "releasable" && <button className="btn-primary btn-sm" onClick={() => { setRef(""); setReleasing(c); }}>Release</button>}
              {superAdmin && <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason for deleting this calculation (kept in the audit log)"); if (reason) act(`/franchise/commissions/${c.id}`, { method: "DELETE", body: { reason }, msg: "Calculation deleted." }); }}>Delete</button>}
            </div>
          </div>
          <ShareTable shares={c.shares} />
          {c.payoutReference && <p className="mt-2 text-xs text-ink-500">Paid {formatDate(c.releasedAt)} · reference <span data-no-translate>{c.payoutReference}</span></p>}
        </div>
      ))}
      <Modal open={!!releasing} onClose={() => setReleasing(null)} title="Release commission" description="Only after A R Buildwel has collected the client invoices for this deal." maxWidth="max-w-2xl">
        {releasing && <ReleasePlan id={releasing.id} />}
        <TextField label="Payout reference (UTR)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setReleasing(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || ref.trim().length < 3} onClick={() => act(`/franchise/commissions/${releasing.id}/release`, { body: { payoutReference: ref.trim() }, msg: "Commission released.", after: () => setReleasing(null) })}>Release</button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- invoices

function Invoices({ admin }) {
  const [status, setStatus] = useState("");
  const { data, loading, reload } = useApiQuery(`/franchise/invoices${buildQuery({ status })}`);
  const { act, busy } = useAct(reload);
  const [paying, setPaying] = useState(null);
  const [ref, setRef] = useState("");
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select className="field-select h-9 w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All invoices</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="written_off">Written off</option>
        </select>
        {admin && <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("/franchise/jobs/sweep", { msg: "Payment ladder run." })}>Run payment ladder now</button>}
      </div>
      <p className="text-xs text-ink-500">Day 1-5 grace · Day 6 reminder · Day 8 formal notice · Day 10 Level 1 · Day 15 Level 2 (no new leads, late fee) · Day 30 Level 3 (suspended). Payment restores access at once. Raise an invoice from a franchisee's detail.</p>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No invoices here" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Invoice</th><th className={th}>Franchisee</th><th className={th}>Amount</th><th className={th}>Due</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{i.invoiceNumber}</span><br /><span className="text-xs text-ink-500">{titleCase(i.kind)}{i.description ? ` · ${i.description}` : ""}</span></td>
                  <td className={th} data-no-translate>{i.orgCode}</td>
                  <td className={th}>{money(i.amount)}{i.lateFee > 0 && <><br /><span className="text-xs text-red-600">+ {money(i.lateFee)} late fee</span></>}</td>
                  <td className={th}>{formatDate(i.dueDate)}{i.daysOverdue > 0 && <><br /><span className="text-xs text-red-600">{i.daysOverdue} days overdue</span></>}</td>
                  <td className={th}><StatusBadge value={titleCase(i.status)} /> {i.suspensionStatus !== "active" && <LevelPill level={i.suspensionStatus} />}{i.paymentClaimedAt && i.status !== "paid" && <><br /><span className="text-xs text-amber-700">Payment reported: <span data-no-translate>{i.paymentReference}</span></span></>}</td>
                  <td className={th}>
                    {admin && ["pending", "overdue"].includes(i.status) && (
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-primary btn-sm" onClick={() => { setRef(i.paymentReference || ""); setPaying(i); }}>Record payment</button>
                        <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason for writing this invoice off"); if (reason) act(`/franchise/invoices/${i.id}/write-off`, { body: { reason }, msg: "Invoice written off." }); }}>Write off</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Record payment" description="Suspension resets and the franchisee's access is restored at once.">
        <TextField label="Payment reference (UTR / cheque no.)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setPaying(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || ref.trim().length < 3} onClick={() => act(`/franchise/invoices/${paying.id}/payment`, { body: { reference: ref.trim() }, msg: "Payment recorded - access restored.", after: () => setPaying(null) })}>Record payment</button>
        </div>
      </Modal>
    </div>
  );
}

// --------------------------------------------------------------- conflicts

const CONFLICT = { cross_territory_listing: "Listing in another franchisee's exclusive territory", cross_territory_lead: "Inquiry in another franchisee's exclusive territory", overlapping_grant: "Overlapping grant", boundary: "Boundary case" };

function Conflicts({ admin }) {
  const [status, setStatus] = useState("open");
  const { data, loading, reload } = useApiQuery(`/franchise/conflicts${buildQuery({ status })}`);
  const { act, busy } = useAct(reload);
  const rows = data || [];
  return (
    <div className="space-y-3">
      <select className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All</option></select>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No territory conflicts" subtitle="Cross-territory listings and inquiries are flagged here - never blocked." /> : rows.map((c) => (
        <div key={c.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">{CONFLICT[c.kind] || c.kind} <StatusBadge value={titleCase(c.status)} /></p>
            <p className="mt-1 text-xs text-ink-500">Pincode <span data-no-translate>{c.pincode || "—"}</span> · territory of <span data-no-translate>{c.ownerCode || "—"}</span>{c.otherCode ? <> · activity by <span data-no-translate>{c.otherCode}</span></> : null}{c.actorName ? <> (<span data-no-translate>{c.actorName}</span>)</> : null} · {formatDate(c.createdAt, true)}</p>
            {c.propertyTitle && <p className="mt-1 text-xs">Listing: <span data-no-translate>{c.propertyTitle}</span></p>}
            {c.resolution && <p className="mt-1 text-xs text-ink-600">Resolution: {c.resolution}</p>}
          </div>
          {admin && c.status === "open" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const resolution = window.prompt("How was this resolved?"); if (resolution) act(`/franchise/conflicts/${c.id}/resolve`, { method: "PUT", body: { resolution }, msg: "Conflict resolved." }); }}>Resolve</button>}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- support

export function TicketThread({ base, id, staff, onClose, onChanged }) {
  const { data: t, loading, reload } = useApiQuery(`${base}/${id}`);
  const { act, busy } = useAct(() => { reload(); onChanged?.(); });
  const [body, setBody] = useState("");
  return (
    <Modal open onClose={onClose} title={t ? `${t.ticketNumber} · ${t.subject}` : "Ticket"} description={t ? `${titleCase(t.category)} · ${titleCase(t.status)}` : ""}>
      {loading && !t ? <Spinner /> : t && (
        <div className="space-y-3 text-sm">
          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {t.messages.map((m) => (
              <div key={m.id} className={`rounded-xl p-3 ${m.fromStaff ? "bg-indigo-50" : "bg-surface-muted"}`}>
                <p className="text-xs font-semibold text-ink-600"><span data-no-translate>{m.author}</span> · {formatDate(m.createdAt, true)}</p>
                <p className="mt-1 whitespace-pre-line text-ink-900" data-no-translate>{m.body}</p>
              </div>
            ))}
          </div>
          {t.status !== "closed" && <TextareaField label="Reply" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />}
          <div className="flex flex-wrap justify-end gap-2">
            {staff && t.status !== "resolved" && <button className="btn-outline" disabled={busy} onClick={() => act(`${base}/${id}/reply`, { body: { body: body.trim() || undefined, status: "resolved" }, msg: "Ticket resolved.", after: () => setBody("") })}>Reply and resolve</button>}
            {!staff && t.status !== "closed" && <button className="btn-outline" disabled={busy} onClick={() => act(`${base}/${id}/reply`, { body: { status: "closed" }, msg: "Ticket closed." })}>Close ticket</button>}
            {t.status !== "closed" && <button className="btn-primary" disabled={busy || body.trim().length < 2} onClick={() => act(`${base}/${id}/reply`, { body: { body: body.trim() }, msg: "Reply posted.", after: () => setBody("") })}>Send reply</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Support() {
  const { data, loading, reload } = useApiQuery("/franchise/tickets");
  const [open, setOpen] = useState(null);
  const rows = data || [];
  if (loading && !data) return <Spinner />;
  return (
    <div className="space-y-2">
      {rows.length === 0 ? <EmptyState title="No support tickets" subtitle="Tickets raised by franchisees appear here." /> : rows.map((t) => (
        <button key={t.id} type="button" className="card flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left text-sm hover:bg-surface-muted" onClick={() => setOpen(t.id)}>
          <span><span className="font-semibold text-ink-900" data-no-translate>{t.ticketNumber} · {t.subject}</span><br /><span className="text-xs text-ink-500"><span data-no-translate>{t.orgCode}</span> · {titleCase(t.category)} · updated {formatDate(t.updatedAt, true)}</span></span>
          <StatusBadge value={titleCase(t.status)} />
        </button>
      ))}
      {open && <TicketThread base="/franchise/tickets" id={open} staff onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

export default function FranchisePage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const [tab, setTab] = useState("franchisees");
  const tabs = [["franchisees", "Franchisees"], ["territories", "Territories"], ["commission", "Commission"], ["gst", "GST invoices"], ["invoices", "Invoices & suspension"], ["conflicts", "Territory conflicts"], ...(admin ? [["support", "Support"]] : [])];
  return (
    <div>
      <PageHeader eyebrow="White-label franchise" title="Franchise" subtitle="Franchisee organisations, pincode territories, commission split, dues and the 3-level suspension." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>{label}</button>
        ))}
      </div>
      {tab === "franchisees" && <Franchisees admin={admin} />}
      {tab === "territories" && <Territories admin={admin} />}
      {tab === "commission" && <Commissions admin={admin} superAdmin={role === "super_admin"} />}
      {tab === "invoices" && <Invoices admin={admin} />}
      {tab === "gst" && <GstInvoices admin={admin} />}
      {tab === "conflicts" && <Conflicts admin={admin} />}
      {tab === "support" && admin && <Support />}
    </div>
  );
}
