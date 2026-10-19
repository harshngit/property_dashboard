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
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Modules 25 / 26 - Loan & Insurance Desk (A R staff). Referral only.
//   Loans      applications: eligibility guide, refer to the lender's Loan
//              Officer, lender approval status, disbursement schedule
//   Insurance  requests: pre-filled property, refer to the Insurance
//              Officer, confirm the policy the insurer issued
//   Partners   empanelled banks / NBFCs / insurers and their officers. LO /
//              IO codes are issued after the check and never carry commission.

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const money = (v) => (v === null || v === undefined ? "—" : formatINR(v, { compact: false }));
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const LOAN_STATUS = { started: "Details being collected", submitted: "To refer", referred: "With the lender", sanctioned: "Sanctioned", disbursed: "Disbursed", rejected: "Not approved", withdrawn: "Withdrawn" };
const INS_STATUS = { requested: "To refer", option_selected: "Insurer chosen - to refer", referred: "With the insurer", issued: "Policy issued", declined: "Declined", cancelled: "Cancelled" };
const KIND = { bank: "Bank", nbfc: "NBFC", hfc: "Housing finance company", insurer: "Insurer" };
const LOAN_LABEL = { home_loan: "Home loan", commercial_property_loan: "Commercial property loan", construction_finance: "Construction finance", lap: "Loan against property", nri_mortgage: "NRI mortgage", builder_project_loan: "Builder project loan" };
const COVER_LABEL = { home_structure: "Home structure", home_contents: "Home contents", home_package: "Home package", loan_protection: "Loan protection", commercial_property: "Commercial property" };
const VERDICT = { within_eligibility: "Within the indicative eligibility", above_eligibility: "More than the indicative eligibility", indicative: "Indicative figure", more_details_needed: "More details needed" };

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

function Timeline({ rows, labels }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Timeline</p>
      {rows.map((t, i) => <p key={i} className="border-b border-line py-1.5 text-xs last:border-0"><span className="font-semibold">{labels[t.kind] || titleCase(t.kind)}</span> · {formatDate(t.at, true)}{t.by ? <> · <span data-no-translate>{t.by}</span></> : null}{t.clientVisible === false ? " · internal" : ""}{t.note ? <><br /><span className="text-ink-700" data-no-translate>{t.note}</span></> : null}</p>)}
    </div>
  );
}

function Pack({ pack, onClose, who }) {
  return (
    <Modal open={!!pack} onClose={onClose} title="Hand-off pack" description={`Pass this to the ${who}. Document links expire shortly.`}>
      {pack && (
        <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1 text-sm">
          <p className="font-semibold" data-no-translate>{pack.applicationNumber || pack.requestNumber} · {pack.loanType || pack.cover} · {pack.lender || pack.insurer}</p>
          <p data-no-translate>{pack.officer.name} ({pack.officer.code}){pack.officer.email ? ` · ${pack.officer.email}` : ""}{pack.officer.mobile ? ` · ${pack.officer.mobile}` : ""}</p>
          {pack.figures && <p className="rounded-xl bg-surface-muted p-3 text-xs">Monthly income {money(pack.figures.monthlyIncome)} · existing EMIs {money(pack.figures.existingEmi)} · property value {money(pack.figures.propertyValue)} · loan asked {money(pack.figures.loanAmountRequested)} · {pack.figures.tenureYears || "—"} years{pack.figures.employmentType ? ` · ${titleCase(pack.figures.employmentType)}` : ""}</p>}
          {pack.propertyDetails && <p className="rounded-xl bg-surface-muted p-3 text-xs" data-no-translate>{pack.propertyDetails.title} · {[pack.propertyDetails.locality, pack.propertyDetails.city].filter(Boolean).join(", ")} · {pack.propertyDetails.areaSqft || "—"} sq ft · sum insured {money(pack.sumInsured)}</p>}
          {pack.documents.map((d) => <p key={d.id} className="text-xs">{d.url ? <a className="font-semibold text-red-600" href={d.url} target="_blank" rel="noreferrer" data-no-translate>{d.fileName || titleCase(d.type)}</a> : <span data-no-translate>{d.fileName || titleCase(d.type)}</span>}</p>)}
          <p className="text-xs text-ink-500">{pack.note}</p>
        </div>
      )}
    </Modal>
  );
}

function Refer({ kind, current, onRefer, busy }) {
  const inst = useApiQuery(`/finance/institutions?status=empanelled&kind=${kind}`);
  const [institutionId, setInstitutionId] = useState(current || "");
  const officers = useApiQuery(institutionId ? `/finance/officers?status=verified&institutionId=${institutionId}` : null);
  const [officerId, setOfficerId] = useState("");
  const list = inst.data?.institutions || [];
  const word = kind === "insurer" ? "insurer" : "lender";
  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Refer to the {word}</p>
      <select className="field-select" value={institutionId} onChange={(e) => { setInstitutionId(e.target.value); setOfficerId(""); }}>
        <option value="">{list.length ? `Choose an empanelled ${word}` : `No empanelled ${word} on the panel yet`}</option>
        {list.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
      </select>
      <select className="field-select" value={officerId} disabled={!institutionId} onChange={(e) => setOfficerId(e.target.value)}>
        <option value="">{institutionId ? ((officers.data || []).length ? "Choose a verified officer" : "No verified officer for this institution yet") : "Choose the institution first"}</option>
        {(officers.data || []).map((o) => <option key={o.id} value={o.id}>{o.fullName} · {o.code}</option>)}
      </select>
      <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy || !institutionId || !officerId} onClick={() => onRefer({ institutionId, officerId })}>Refer</button></div>
    </div>
  );
}

// ------------------------------------------------------------------- loans

function LoanDetail({ id, onClose, onChanged }) {
  const { data: a, loading, reload } = useApiQuery(`/finance/loans/${id}`);
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [pack, setPack] = useState(null);
  const [s, setS] = useState({ sanctionedAmount: "", sanctionedRate: "", lenderReference: "" });
  const [tranches, setTranches] = useState(null);
  const [note, setNote] = useState("");
  if (loading && !a) return <Modal open onClose={onClose} title="Loan application"><Spinner /></Modal>;
  if (!a) return null;
  const e = a.eligibility;
  const rows = tranches || a.disbursementSchedule || [];
  const setRow = (i, k, v) => setTranches(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <Modal open onClose={onClose} title={`${a.applicationNumber} · ${a.loanLabel}`} description={LOAN_STATUS[a.status]}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-xs text-ink-500">Client: <span data-no-translate>{a.customerName || "—"}</span>{a.propertyTitle ? <> · <Link className="font-semibold text-red-600" to={`/app/properties/${a.propertyId}`} data-no-translate>{a.propertyTitle}</Link></> : null}{a.dealId ? <> · <Link className="font-semibold text-red-600" to={`/app/deals/${a.dealId}`}>Open deal</Link></> : null}</p>
          <p className="mt-2">Monthly income {money(a.monthlyIncome)} · existing EMIs {money(a.existingEmi)} · property value {money(a.propertyValue)} · loan asked {money(a.loanAmountRequested)}{a.city ? <> · <span data-no-translate>{a.city}</span></> : null}</p>
        </div>
        {e && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Indicative eligibility</p>
            <p>Up to <span className="font-semibold">{money(e.eligibleAmount)}</span> · {VERDICT[e.verdict]} · limited by {e.limitedBy === "income" ? "income" : "the property value"}</p>
            <p className="text-xs text-ink-500">By income {money(e.eligibleByIncome)} ({e.foirPercent}% of income, {e.ratePercent}% for {e.tenureYears} years) · by property value {money(e.eligibleByPropertyValue)} ({e.ltvPercent}% loan-to-value) · indicative EMI {money(e.indicativeEmi)}</p>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Lender</p>
          {a.lender ? <p><span className="font-semibold" data-no-translate>{a.lender.name}</span>{a.lender.officer ? <> · loan officer <span data-no-translate>{a.lender.officer.name}</span> <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800" data-no-translate>{a.lender.officer.code}</span></> : <span className="text-xs text-ink-500"> · client's preferred lender, not referred yet</span>}{a.lenderReference ? <> · ref <span data-no-translate>{a.lenderReference}</span></> : null}</p> : <p className="text-ink-500">No lender chosen yet.</p>}
          {a.lenderOptions?.length > 0 && <p className="mt-1 text-xs text-ink-500">Options that fit: {a.lenderOptions.map((o) => `${o.name} (${o.rateFromPercent ?? "—"}%+)`).join(", ")}</p>}
        </div>
        {["started", "submitted", "referred"].includes(a.status) && <Refer kind="lender" current={a.institutionId} busy={busy} onRefer={(body) => act(`/finance/loans/${id}/refer`, { body, msg: "Referred - the client has been told and the deal is updated." })} />}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Linked documents ({a.linkedDocuments.length})</p>
          {a.linkedDocuments.length === 0 ? <p className="text-ink-500">Nothing on file yet. Ask the client to upload under Documents.</p> : a.linkedDocuments.map((d) => <p key={d.id} className="text-xs"><span data-no-translate>{d.fileName || titleCase(d.type)}</span>{d.autoLinked ? " · linked automatically" : ""}</p>)}
          {a.lender?.officer && <button className="btn-outline btn-sm mt-2" disabled={busy} onClick={() => act(`/finance/loans/${id}/handoff`, { after: setPack })}>Hand-off pack for the loan officer</button>}
        </div>
        {a.status === "referred" && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Lender's decision</p>
            <div className="grid grid-cols-3 gap-2">
              <TextField label="Sanctioned amount (₹)" type="number" value={s.sanctionedAmount} onChange={(ev) => setS({ ...s, sanctionedAmount: ev.target.value })} />
              <TextField label="Rate (%)" type="number" value={s.sanctionedRate} onChange={(ev) => setS({ ...s, sanctionedRate: ev.target.value })} />
              <TextField label="Lender reference" value={s.lenderReference} onChange={(ev) => setS({ ...s, lenderReference: ev.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason the lender did not approve"); if (reason) act(`/finance/loans/${id}/status`, { method: "PUT", body: { status: "rejected", note: reason }, msg: "Recorded." }); }}>Not approved</button>
              <button className="btn-primary btn-sm" disabled={busy || !(Number(s.sanctionedAmount) > 0)} onClick={() => act(`/finance/loans/${id}/status`, { method: "PUT", body: { status: "sanctioned", sanctionedAmount: Number(s.sanctionedAmount), sanctionedRate: s.sanctionedRate ? Number(s.sanctionedRate) : null, lenderReference: s.lenderReference || undefined }, msg: "Sanction recorded." })}>Record sanction</button>
            </div>
          </div>
        )}
        {["sanctioned", "disbursed"].includes(a.status) && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Sanction and disbursement schedule</p>
            <p>Sanctioned {money(a.sanctionedAmount)}{a.sanctionedRate ? ` at ${a.sanctionedRate}%` : ""}{a.sanctionedOn ? ` on ${formatDate(a.sanctionedOn)}` : ""}</p>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input className="field-input" type="date" value={r.dueOn || ""} onChange={(ev) => setRow(i, "dueOn", ev.target.value)} disabled={a.status === "disbursed"} />
                <input className="field-input" type="number" placeholder="Amount" value={r.amount || ""} onChange={(ev) => setRow(i, "amount", ev.target.value)} disabled={a.status === "disbursed"} />
                <input className="field-input" placeholder="Stage" value={r.note || ""} onChange={(ev) => setRow(i, "note", ev.target.value)} disabled={a.status === "disbursed"} />
                <input className="field-input" type="date" title="Paid on" value={r.paidOn || ""} onChange={(ev) => setRow(i, "paidOn", ev.target.value)} disabled={a.status === "disbursed"} />
              </div>
            ))}
            {a.status === "sanctioned" && (
              <div className="flex flex-wrap justify-end gap-2">
                <button className="btn-outline btn-sm" onClick={() => setTranches([...rows, { dueOn: "", amount: "", note: "", paidOn: "" }])}>Add tranche</button>
                <button className="btn-outline btn-sm" disabled={busy || !tranches} onClick={() => act(`/finance/loans/${id}/status`, { method: "PUT", body: { disbursementSchedule: rows.filter((r) => r.dueOn && Number(r.amount) > 0).map((r) => ({ ...r, amount: Number(r.amount) })) }, msg: "Schedule saved.", after: () => setTranches(null) })}>Save schedule</button>
                <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(`/finance/loans/${id}/status`, { method: "PUT", body: { status: "disbursed" }, msg: "Marked disbursed." })}>Mark fully disbursed</button>
              </div>
            )}
          </div>
        )}
        {!["disbursed", "rejected", "withdrawn"].includes(a.status) && (
          <div className="flex gap-2">
            <input className="field-input flex-1" placeholder="Add a note for the client" value={note} onChange={(ev) => setNote(ev.target.value)} />
            <button className="btn-outline btn-sm" disabled={busy || note.trim().length < 2} onClick={() => act(`/finance/loans/${id}/status`, { method: "PUT", body: { note: note.trim() }, msg: "Note added.", after: () => setNote("") })}>Add note</button>
          </div>
        )}
        <Timeline rows={a.timeline} labels={LOAN_STATUS} />
        <p className="text-xs text-ink-500">{a.disclaimer}</p>
      </div>
      <Pack pack={pack} onClose={() => setPack(null)} who="loan officer" />
    </Modal>
  );
}

function Loans({ dealId, clearDeal }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApiQuery(`/finance/loans${buildQuery({ status, q })}`);
  const { act, busy } = useAct(reload);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (dealId) {
      setForm({ loanType: "home_loan", dealId, monthlyIncome: "", existingEmi: "", propertyValue: "", loanAmountRequested: "" });
      clearDeal();
    }
  }, [dealId, clearDeal]);
  const rows = data?.applications || [];
  const st = data?.stats || {};
  const n = (v) => (v === "" ? null : Number(v));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Collecting details", st.started], ["To refer", st.to_refer], ["With the lender", st.with_lender], ["Sanctioned", st.sanctioned], ["Disbursed", st.disbursed]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v ?? 0}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select className="field-select h-9 w-56" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All applications</option>{Object.entries(LOAN_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search application, client, property or lender" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setForm({ loanType: "home_loan", dealId: "", monthlyIncome: "", existingEmi: "", propertyValue: "", loanAmountRequested: "" })}><LuPlus className="h-4 w-4" /> New application</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No loan applications here" subtitle="They open when a client starts one from their dashboard, a home-loan enquiry arrives, or you start one from a deal." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Application</th><th className={th}>Client / property</th><th className={th}>Asked / eligible</th><th className={th}>Lender</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => setOpen(a.id)}>
                  <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{a.applicationNumber}</span><br /><span className="text-xs text-ink-500">{a.loanLabel} · {titleCase(a.source)} · {a.documents} documents</span></td>
                  <td className={th}><span data-no-translate>{a.customerName || "—"}</span>{a.propertyTitle && <><br /><span className="text-xs text-ink-500" data-no-translate>{a.propertyTitle}</span></>}</td>
                  <td className={th}>{money(a.loanAmountRequested)}<br /><span className="text-xs text-ink-500">eligible {money(a.eligibility?.eligibleAmount)}</span></td>
                  <td className={th}>{a.lender ? <><span data-no-translate>{a.lender.name}</span>{a.lender.officer && <><br /><span className="text-xs text-ink-500" data-no-translate>{a.lender.officer.code}</span></>}</> : "—"}</td>
                  <td className={th}><StatusBadge value={LOAN_STATUS[a.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <LoanDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      <Modal open={!!form} onClose={() => setForm(null)} title="New loan application" description="For a client on a deal. Documents already on file are linked automatically.">
        {form && (
          <div className="space-y-3">
            <div><label className="field-label">Loan</label><select className="field-select" value={form.loanType} onChange={(e) => setForm({ ...form, loanType: e.target.value })}>{Object.entries(LOAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <TextField label="Deal ID (from the deal's page address)" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Monthly income (₹)" type="number" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
              <TextField label="Existing EMIs (₹ / month)" type="number" value={form.existingEmi} onChange={(e) => setForm({ ...form, existingEmi: e.target.value })} />
              <TextField label="Property value (₹)" type="number" value={form.propertyValue} onChange={(e) => setForm({ ...form, propertyValue: e.target.value })} />
              <TextField label="Loan amount wanted (₹)" type="number" value={form.loanAmountRequested} onChange={(e) => setForm({ ...form, loanAmountRequested: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !/^[0-9a-f-]{36}$/i.test(form.dealId.trim())} onClick={() => act("/finance/loans", { body: { loanType: form.loanType, dealId: form.dealId.trim(), monthlyIncome: n(form.monthlyIncome), existingEmi: n(form.existingEmi), propertyValue: n(form.propertyValue), loanAmountRequested: n(form.loanAmountRequested) }, msg: "Application started.", after: (a) => { setForm(null); setOpen(a.id); } })}>Start application</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// --------------------------------------------------------------- insurance

function InsuranceDetail({ id, onClose, onChanged }) {
  const { data: r, loading, reload } = useApiQuery(`/finance/insurance/${id}`);
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [pack, setPack] = useState(null);
  const [p, setP] = useState({ policyNumber: "", policyStart: "", policyEnd: "", premiumAmount: "" });
  if (loading && !r) return <Modal open onClose={onClose} title="Insurance request"><Spinner /></Modal>;
  if (!r) return null;
  const d = r.propertyDetails || {};
  return (
    <Modal open onClose={onClose} title={`${r.requestNumber} · ${r.coverLabel}`} description={INS_STATUS[r.status]}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="rounded-xl bg-surface-muted p-3">
          <p className="text-xs text-ink-500">Client: <span data-no-translate>{r.customerName || "—"}</span>{r.dealId ? <> · <Link className="font-semibold text-red-600" to={`/app/deals/${r.dealId}`}>Open deal</Link></> : null}</p>
          <p className="mt-2" data-no-translate>{d.title || "No property linked"}{d.city ? ` · ${[d.locality, d.city].filter(Boolean).join(", ")}` : ""}{d.areaSqft ? ` · ${d.areaSqft} sq ft` : ""}{d.propertyType ? ` · ${d.propertyType}` : ""}</p>
          <p className="text-xs text-ink-500">Sum insured {money(r.sumInsured)}{d.lender ? <> · home loan with <span data-no-translate>{d.lender}</span></> : null}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Insurer</p>
          {r.insurer ? <p><span className="font-semibold" data-no-translate>{r.insurer.name}</span>{r.insurer.officer ? <> · insurance officer <span data-no-translate>{r.insurer.officer.name}</span> <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800" data-no-translate>{r.insurer.officer.code}</span></> : <span className="text-xs text-ink-500"> · chosen by the client, not referred yet</span>}</p> : <p className="text-ink-500">Not chosen yet.</p>}
          {r.coverageOptions?.length > 0 && <p className="mt-1 text-xs text-ink-500">Insurers offering this cover: {r.coverageOptions.map((o) => o.name).join(", ")}</p>}
        </div>
        {["requested", "option_selected", "referred"].includes(r.status) && <Refer kind="insurer" current={r.institutionId} busy={busy} onRefer={(body) => act(`/finance/insurance/${id}/refer`, { body, msg: "Referred - the client has been told and the deal is updated." })} />}
        {r.insurer?.officer && <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/finance/insurance/${id}/handoff`, { after: setPack })}>Hand-off pack for the insurance officer</button>}
        {r.status === "referred" && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Confirm the policy the insurer issued</p>
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Policy number" value={p.policyNumber} onChange={(e) => setP({ ...p, policyNumber: e.target.value })} />
              <TextField label="Premium (₹, for the record)" type="number" value={p.premiumAmount} onChange={(e) => setP({ ...p, premiumAmount: e.target.value })} />
              <TextField label="Starts" type="date" value={p.policyStart} onChange={(e) => setP({ ...p, policyStart: e.target.value })} />
              <TextField label="Ends" type="date" value={p.policyEnd} onChange={(e) => setP({ ...p, policyEnd: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason the insurer declined"); if (reason) act(`/finance/insurance/${id}/status`, { method: "PUT", body: { status: "declined", note: reason }, msg: "Recorded." }); }}>Declined</button>
              <button className="btn-primary btn-sm" disabled={busy || p.policyNumber.trim().length < 3 || !p.policyStart || !p.policyEnd} onClick={() => act(`/finance/insurance/${id}/status`, { method: "PUT", body: { status: "issued", policyNumber: p.policyNumber.trim(), policyStart: p.policyStart, policyEnd: p.policyEnd, premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : null }, msg: "Policy confirmed." })}>Confirm policy</button>
            </div>
          </div>
        )}
        {r.policy && <p>Policy <span className="font-semibold" data-no-translate>{r.policy.number}</span> · {formatDate(r.policy.start)} to {formatDate(r.policy.end)}{r.policy.premiumAmount ? ` · premium ${money(r.policy.premiumAmount)} (paid to the insurer)` : ""}</p>}
        <Timeline rows={r.timeline} labels={INS_STATUS} />
        <p className="text-xs text-ink-500">{r.disclaimer}</p>
      </div>
      <Pack pack={pack} onClose={() => setPack(null)} who="insurance officer" />
    </Modal>
  );
}

function Insurance() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApiQuery(`/finance/insurance${buildQuery({ status, q })}`);
  const { act, busy } = useAct(reload);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const rows = data?.requests || [];
  const st = data?.stats || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["To refer", st.to_refer], ["With the insurer", st.with_insurer], ["Policies issued", st.issued], ["Renewing within 30 days", st.renewing_soon]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v ?? 0}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select className="field-select h-9 w-60" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All requests</option>{Object.entries(INS_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search request, client, property or insurer" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setForm({ coverType: "home_package", dealId: "" })}><LuPlus className="h-4 w-4" /> New request</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No insurance requests here" subtitle="They open when a client asks from their dashboard, an insurance enquiry arrives, or you start one from a deal." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Request</th><th className={th}>Client / property</th><th className={th}>Sum insured</th><th className={th}>Insurer</th><th className={th}>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => setOpen(r.id)}>
                  <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{r.requestNumber}</span><br /><span className="text-xs text-ink-500">{r.coverLabel} · {titleCase(r.source)}</span></td>
                  <td className={th}><span data-no-translate>{r.customerName || "—"}</span>{r.propertyTitle && <><br /><span className="text-xs text-ink-500" data-no-translate>{r.propertyTitle}</span></>}</td>
                  <td className={th}>{money(r.sumInsured)}</td>
                  <td className={th}>{r.insurer ? <span data-no-translate>{r.insurer.name}</span> : "—"}{r.policy && <><br /><span className="text-xs text-ink-500" data-no-translate>{r.policy.number}</span></>}</td>
                  <td className={th}><StatusBadge value={INS_STATUS[r.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <InsuranceDetail id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      <Modal open={!!form} onClose={() => setForm(null)} title="New insurance request" description="Property details are filled in from the deal.">
        {form && (
          <div className="space-y-3">
            <div><label className="field-label">Cover</label><select className="field-select" value={form.coverType} onChange={(e) => setForm({ ...form, coverType: e.target.value })}>{(data?.coverTypes || []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <TextField label="Deal ID (from the deal's page address)" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || !/^[0-9a-f-]{36}$/i.test(form.dealId.trim())} onClick={() => act("/finance/insurance", { body: { coverType: form.coverType, dealId: form.dealId.trim() }, msg: "Insurance request opened.", after: (r) => { setForm(null); setOpen(r.id); } })}>Open request</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------- partners

const EMPTY_INST = { kind: "bank", name: "", empanelmentRef: "", irdaiRegistration: "", loanProducts: [], insuranceProducts: [], rateFromPercent: "", rateToPercent: "", maxLtvPercent: "", maxFoirPercent: "", maxTenureYears: "", minLoanAmount: "", maxLoanAmount: "", servesNri: false, cities: "" };

function Partners({ admin }) {
  const { data, loading, reload } = useApiQuery("/finance/institutions");
  const officers = useApiQuery("/finance/officers");
  const { act, busy } = useAct(() => { reload(); officers.reload(); });
  const [form, setForm] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState("");
  const rows = data?.institutions || [];
  const insurer = form?.kind === "insurer";
  const toggle = (key, v) => setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
  const saveInst = () => act(form.id ? `/finance/institutions/${form.id}` : "/finance/institutions", { method: form.id ? "PUT" : "POST", msg: "Saved.", after: () => setForm(null),
    body: { ...form, cities: form.cities.split(",").map((x) => x.trim()).filter(Boolean), rateFromPercent: numOrNull(form.rateFromPercent), rateToPercent: numOrNull(form.rateToPercent), maxLtvPercent: numOrNull(form.maxLtvPercent), maxFoirPercent: numOrNull(form.maxFoirPercent), maxTenureYears: numOrNull(form.maxTenureYears), minLoanAmount: numOrNull(form.minLoanAmount), maxLoanAmount: numOrNull(form.maxLoanAmount) } });
  const verb = { empanel: "Empanel", suspend: "Suspend", reinstate: "Reinstate", verify: "Verify and issue code" };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">Referral only. LO and IO codes are issued after the empanelment / IRDAI licence check and never carry commission. Any commercial arrangement is with the institution, outside this system.</p>
        {admin && <button className="btn-primary shrink-0" onClick={() => setForm(EMPTY_INST)}><LuPlus className="h-4 w-4" /> Add institution</button>}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No partners yet" subtitle="Add the empanelled banks, NBFCs and insurers, then their officers." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Institution</th><th className={th}>Products</th><th className={th}>Indicative terms</th><th className={th}>Officers / cases</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{i.name}</span><br /><span className="text-xs text-ink-500">{KIND[i.kind]}{i.cities?.length ? <> · <span data-no-translate>{i.cities.join(", ")}</span></> : " · all cities"}</span></td>
                  <td className={`${th} text-xs`}>{(i.kind === "insurer" ? i.insuranceProducts.map((p) => COVER_LABEL[p]) : i.loanProducts.map((p) => LOAN_LABEL[p])).join(", ") || "—"}</td>
                  <td className={`${th} text-xs`}>{i.kind === "insurer" ? <span data-no-translate>{i.irdaiRegistration || "—"}</span> : <>{i.rateFromPercent ?? "—"}% to {i.rateToPercent ?? "—"}% · up to {i.maxTenureYears ?? "—"} yrs · LTV {i.maxLtvPercent ?? "—"}%</>}</td>
                  <td className={th}>{i.officers} verified · {i.openCases} open<br /><span className="text-xs text-ink-500">{i.referrals90d} referrals in 90 days</span></td>
                  <td className={th}><StatusBadge value={titleCase(i.status)} /></td>
                  <td className={th}>
                    {admin && (
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-outline btn-sm" onClick={() => setOfficer({ institutionId: i.id, institutionName: i.name, insurer: i.kind === "insurer", fullName: "", designation: "", licenceNumber: "", email: "", mobile: "" })}>Add officer</button>
                        <button className="btn-outline btn-sm" onClick={() => setForm({ ...EMPTY_INST, ...Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v ?? ""])), cities: (i.cities || []).join(", "), loanProducts: i.loanProducts || [], insuranceProducts: i.insuranceProducts || [], servesNri: !!i.servesNri })}>Edit</button>
                        <button className={i.status === "empanelled" ? "btn-outline btn-sm" : "btn-primary btn-sm"} onClick={() => { setNote(""); setDeciding({ path: `/finance/institutions/${i.id}/decision`, action: i.status === "pending" ? "empanel" : i.status === "empanelled" ? "suspend" : "reinstate", name: i.name }); }}>{i.status === "pending" ? "Empanel" : i.status === "empanelled" ? "Suspend" : "Reinstate"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Loan Officers and Insurance Officers</p>
        {(officers.data || []).length === 0 ? <p className="text-sm text-ink-500">No officers yet. Add one from an institution's row.</p> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Officer</th><th className={th}>Institution</th><th className={th}>Code</th><th className={th}>Licence / employee no.</th><th className={th}>Status</th><th className={th} /></tr></thead>
              <tbody>
                {officers.data.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className={th}><span className="font-semibold" data-no-translate>{o.fullName}</span><br /><span className="text-xs text-ink-500" data-no-translate>{o.designation || ""}</span></td>
                    <td className={th} data-no-translate>{o.institutionName}</td>
                    <td className={th} data-no-translate>{o.code || "—"}</td>
                    <td className={th} data-no-translate>{o.licenceNumber || "—"}</td>
                    <td className={th}><StatusBadge value={titleCase(o.status)} /></td>
                    <td className={th}>{admin && (
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-outline btn-sm" onClick={() => setOfficer({ id: o.id, institutionId: o.institutionId, institutionName: o.institutionName, insurer: o.role === "IO", fullName: o.fullName, designation: o.designation || "", licenceNumber: o.licenceNumber || "", email: o.email || "", mobile: o.mobile || "" })}>Edit</button>
                        <PartnerLoginButton kind="officer" record={o} active={o.status === "verified"} onDone={officers.reload} />
                        <button className={o.status === "verified" ? "btn-outline btn-sm" : "btn-primary btn-sm"} onClick={() => { setNote(""); setDeciding({ path: `/finance/officers/${o.id}/decision`, action: o.status === "pending" ? "verify" : o.status === "verified" ? "suspend" : "reinstate", name: o.fullName }); }}>{o.status === "pending" ? "Verify" : o.status === "verified" ? "Suspend" : "Reinstate"}</button>
                      </div>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit institution" : "Add institution"}>
        {form && (
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Kind</label><select className="field-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField label="Empanelment letter / agreement reference" value={form.empanelmentRef} onChange={(e) => setForm({ ...form, empanelmentRef: e.target.value })} />
              {insurer ? <TextField label="IRDAI registration number" value={form.irdaiRegistration} onChange={(e) => setForm({ ...form, irdaiRegistration: e.target.value })} /> : <TextField label="Cities served (blank = all)" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} />}
            </div>
            <div>
              <label className="field-label">{insurer ? "Covers offered" : "Loans offered"}</label>
              <div className="flex flex-wrap gap-2">{Object.entries(insurer ? COVER_LABEL : LOAN_LABEL).map(([k, v]) => { const key = insurer ? "insuranceProducts" : "loanProducts"; return <button key={k} type="button" onClick={() => toggle(key, k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${form[key].includes(k) ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`}>{v}</button>; })}</div>
            </div>
            {insurer ? <TextField label="Cities served (blank = all)" value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} /> : (
              <>
                <p className="text-xs text-ink-500">Indicative terms feed the eligibility guide only. They are never shown as an offer.</p>
                <div className="grid grid-cols-3 gap-3">
                  <TextField label="Rate from (%)" type="number" value={form.rateFromPercent} onChange={(e) => setForm({ ...form, rateFromPercent: e.target.value })} />
                  <TextField label="Rate to (%)" type="number" value={form.rateToPercent} onChange={(e) => setForm({ ...form, rateToPercent: e.target.value })} />
                  <TextField label="Max tenure (years)" type="number" value={form.maxTenureYears} onChange={(e) => setForm({ ...form, maxTenureYears: e.target.value })} />
                  <TextField label="Max loan-to-value (%)" type="number" value={form.maxLtvPercent} onChange={(e) => setForm({ ...form, maxLtvPercent: e.target.value })} />
                  <TextField label="Max share of income (%)" type="number" value={form.maxFoirPercent} onChange={(e) => setForm({ ...form, maxFoirPercent: e.target.value })} />
                  <TextField label="Min loan (₹)" type="number" value={form.minLoanAmount} onChange={(e) => setForm({ ...form, minLoanAmount: e.target.value })} />
                  <TextField label="Max loan (₹)" type="number" value={form.maxLoanAmount} onChange={(e) => setForm({ ...form, maxLoanAmount: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.servesNri} onChange={(e) => setForm({ ...form, servesNri: e.target.checked })} /> Lends to NRI buyers</label>
              </>
            )}
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || form.name.trim().length < 2} onClick={saveInst}>Save</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!officer} onClose={() => setOfficer(null)} title={officer?.id ? "Edit officer" : `Add officer - ${officer?.institutionName || ""}`} description={officer?.insurer ? "An Insurance Officer needs an IRDAI licence number before a code can be issued." : "A Loan Officer is the lender's own staff."}>
        {officer && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Full name" value={officer.fullName} onChange={(e) => setOfficer({ ...officer, fullName: e.target.value })} />
              <TextField label="Designation" value={officer.designation} onChange={(e) => setOfficer({ ...officer, designation: e.target.value })} />
              <TextField label={officer.insurer ? "IRDAI licence number" : "Employee / DSA code"} value={officer.licenceNumber} onChange={(e) => setOfficer({ ...officer, licenceNumber: e.target.value })} />
              <TextField label="Mobile (staff only)" value={officer.mobile} onChange={(e) => setOfficer({ ...officer, mobile: e.target.value })} />
              <TextField label="Email (staff only)" value={officer.email} onChange={(e) => setOfficer({ ...officer, email: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setOfficer(null)}>Cancel</button><button className="btn-primary" disabled={busy || officer.fullName.trim().length < 2} onClick={() => act(officer.id ? `/finance/officers/${officer.id}` : "/finance/officers", { method: officer.id ? "PUT" : "POST", body: officer, msg: "Saved.", after: () => setOfficer(null) })}>Save</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!deciding} onClose={() => setDeciding(null)} title={deciding ? `${verb[deciding.action]}: ${deciding.name}` : ""} description={deciding?.action === "suspend" ? "The reason is kept in the audit log." : "Record what was checked. It is kept against the record."}>
        <TextareaField label={deciding?.action === "suspend" ? "Reason" : "What was checked"} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2"><button className="btn-outline" onClick={() => setDeciding(null)}>Cancel</button><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => act(deciding.path, { body: { action: deciding.action, note: note.trim() }, msg: "Recorded.", after: () => setDeciding(null) })}>{deciding ? verb[deciding.action] : ""}</button></div>
      </Modal>
    </div>
  );
}

export default function FinanceDeskPage() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "loans");
  const dealId = searchParams.get("dealId");
  return (
    <div>
      <PageHeader eyebrow="Loan / Financing and Insurance" title="Loan & Insurance Desk" subtitle="Referral only: collect the details, refer to the empanelled lender or insurer, and track it. The platform never lends, disburses, issues a policy or takes a premium." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["loans", "Loans"], ["insurance", "Insurance"], ["partners", "Lenders, insurers & officers"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>{label}</button>
        ))}
      </div>
      {tab === "loans" && <Loans dealId={dealId} clearDeal={() => setSearchParams({}, { replace: true })} />}
      {tab === "insurance" && <Insurance />}
      {tab === "partners" && <Partners admin={ADMIN.includes(role)} />}
    </div>
  );
}
