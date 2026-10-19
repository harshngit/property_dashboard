import { useRef, useState } from "react";
import { LuDownload, LuFileUp, LuMessageSquarePlus, LuSend } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// The panel partners' own desk (contract sec. 4 and 33.8):
//   Legal Professional  active cases, document requests, drafting status, registration tracking, billing
//   Loan Officer        active applications, lender approval status, disbursement schedule
//   Insurance Officer   policy requests linked to transactions
// Only what was assigned / referred to them, without the client's phone or
// email - documents are asked for through the platform.

const KIND_OF = { legal_professional: "legal", loan_officer: "loan", insurance_officer: "insurance" };
const LIST_KEY = { legal: "cases", loan: "applications", insurance: "requests" };
const TITLE = { legal: "My legal cases", loan: "My loan applications", insurance: "My insurance requests" };
const STEP_LABEL = { in_progress: "Start work", report_ready: "Report ready", sanctioned: "Sanction", rejected: "Not approved", disbursed: "Mark disbursed", issued: "Issue policy", declined: "Decline" };
const DOC_TYPES = ["other", "title_document", "encumbrance_certificate", "sale_deed", "agreement_to_sell", "agreement", "power_of_attorney", "mutation_record", "society_noc", "bank_noc", "kyc", "id_proof", "tax_receipt", "payment_receipt"];
const th = "px-4 py-3";
const label = (s) => titleCase(String(s || "").replace(/_/g, " "));

function Summary({ me }) {
  const s = me.summary || {};
  const tiles = me.kind === "legal"
    ? [["Open cases", s.open], ["To start", s.to_start], ["Overdue", s.overdue], ["Completed", s.completed], ["Fees outstanding", formatINR(s.fees_open || 0)], ["Fees paid", formatINR(s.fees_paid || 0)]]
    : me.kind === "LO"
      ? [["Open", s.open], ["Awaiting your decision", s.awaiting_decision], ["Referrals received", s.referrals], ["Sanctioned", s.sanctioned], ["Disbursed", s.disbursed], ["Sanctioned value", formatINR(s.sanctioned_amount || 0)]]
      : [["Awaiting you", s.open], ["Referrals received", s.referrals], ["Policies issued", s.issued], ["Premium on issued policies", formatINR(s.premium || 0)]];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map(([k, v]) => (
        <div key={k} className="card p-4">
          <p className="text-xs font-semibold text-ink-500">{k}</p>
          <p className="mt-1 font-display text-xl font-extrabold text-ink-950">{v ?? 0}</p>
        </div>
      ))}
    </div>
  );
}

function Row({ kind, item, onOpen }) {
  const what = kind === "legal" ? item.serviceLabel : kind === "loan" ? `${item.loanLabel} · ${formatINR(item.loanAmountRequested || 0)}` : `${item.coverLabel}${item.sumInsured ? ` · ${formatINR(item.sumInsured)}` : ""}`;
  const where = kind === "legal" ? [item.property?.title, item.property?.city].filter(Boolean).join(", ") : item.propertyTitle || item.city || "—";
  return (
    <tr className="cursor-pointer border-b border-line hover:bg-surface-muted/50" onClick={onOpen}>
      <td className={th}><p className="font-mono text-xs font-bold" data-no-translate>{item.number}</p>{item.overdue && <span className="text-[11px] font-semibold text-coral-600">Overdue</span>}</td>
      <td className={th}>{what}</td>
      <td className={th} data-no-translate>{item.clientName || "—"}</td>
      <td className={`${th} text-xs text-ink-600`}>{where || "—"}</td>
      <td className={th}><StatusBadge value={item.status} /></td>
      <td className={`${th} text-xs text-ink-500`}>{kind === "legal" ? (item.dueOn ? `Due ${formatDate(item.dueOn)}` : "—") : item.referredAt ? `Referred ${formatDate(item.referredAt)}` : "—"}</td>
    </tr>
  );
}

// The partner's own step - with the details that step needs.
function StepForm({ kind, step, onSubmit, busy, onCancel }) {
  const [f, setF] = useState({ note: "", sanctionedAmount: "", sanctionedRate: "", lenderReference: "", sanctionedOn: "", policyNumber: "", policyStart: "", policyEnd: "", premiumAmount: "" });
  const [tranches, setTranches] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const field = (lbl, k, props = {}) => <label className="field-label">{lbl}<input className="field-input mt-1" value={f[k]} onChange={set(k)} {...props} /></label>;
  const needsReason = ["rejected", "declined"].includes(step);
  const submit = () => {
    const body = { status: step, note: f.note || undefined };
    if (step === "sanctioned") Object.assign(body, { sanctionedAmount: Number(f.sanctionedAmount), sanctionedRate: f.sanctionedRate ? Number(f.sanctionedRate) : undefined, sanctionedOn: f.sanctionedOn || undefined, lenderReference: f.lenderReference || undefined, ...(tranches.length ? { disbursementSchedule: tranches.map((t) => ({ dueOn: t.dueOn, amount: Number(t.amount), note: t.note || undefined })) } : {}) });
    if (step === "issued") Object.assign(body, { policyNumber: f.policyNumber, policyStart: f.policyStart, policyEnd: f.policyEnd, premiumAmount: f.premiumAmount ? Number(f.premiumAmount) : undefined });
    onSubmit(body);
  };
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <p className="text-sm font-bold text-ink-900">{STEP_LABEL[step] || label(step)}</p>
      {step === "sanctioned" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("Sanctioned amount (₹) *", "sanctionedAmount", { type: "number", min: 1 })}
            {field("Rate (% p.a.)", "sanctionedRate", { type: "number", step: "0.01" })}
            {field("Sanction date", "sanctionedOn", { type: "date" })}
            {field("Lender reference", "lenderReference")}
          </div>
          <div>
            <p className="field-label">Disbursement schedule (optional)</p>
            {tranches.map((t, i) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                <input type="date" className="field-input" value={t.dueOn} onChange={(e) => setTranches((x) => x.map((y, j) => (j === i ? { ...y, dueOn: e.target.value } : y)))} />
                <input type="number" className="field-input" placeholder="Amount ₹" value={t.amount} onChange={(e) => setTranches((x) => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))} />
                <input className="field-input" placeholder="Note" value={t.note} onChange={(e) => setTranches((x) => x.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} />
                <button type="button" className="btn-outline btn-sm" onClick={() => setTranches((x) => x.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="mt-2 text-xs font-semibold text-red-600" onClick={() => setTranches((x) => [...x, { dueOn: "", amount: "", note: "" }])}>+ Add a tranche</button>
          </div>
        </>
      )}
      {step === "issued" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {field("Policy number *", "policyNumber")}
          {field("Annual premium (₹)", "premiumAmount", { type: "number", min: 0 })}
          {field("Cover starts *", "policyStart", { type: "date" })}
          {field("Cover ends *", "policyEnd", { type: "date" })}
        </div>
      )}
      <label className="field-label">{needsReason ? "Reason (the client sees this) *" : "Note for the client (optional)"}<textarea className="field-input mt-1 min-h-[64px]" value={f.note} onChange={set("note")} /></label>
      {kind === "legal" && step === "report_ready" && <p className="text-xs text-ink-500">Upload the report below with “This is the report” ticked - that marks the case report-ready.</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" disabled={busy || (needsReason && f.note.trim().length < 3)} onClick={submit}>{STEP_LABEL[step] || "Save"}</button>
      </div>
    </div>
  );
}

function CaseDetail({ kind, id, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const { data: c, reload } = useApiQuery(`/partner-desk/${kind}/${id}`);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(null);
  const [note, setNote] = useState("");
  const [visible, setVisible] = useState(true);
  const [ask, setAsk] = useState("");
  const [docType, setDocType] = useState("other");
  const [asReport, setAsReport] = useState(false);
  const [fee, setFee] = useState(null);
  if (!c) return <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div>;

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
      onChanged();
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const put = (body, msg) => run(() => call(`/partner-desk/${kind}/${id}`, { method: "PUT", body }), msg);
  const upload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.push("Choose a file first.", "error");
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", docType);
    if (kind === "legal" && asReport) form.append("asReport", "true");
    return run(() => call(`/partner-desk/${kind}/${id}/documents`, { method: "POST", body: form, isFormData: true }), "Document added.").then((ok) => {
      if (ok && fileRef.current) fileRef.current.value = "";
      setAsReport(false);
    });
  };
  const open = async (docId) => {
    try {
      const r = await call(`/partner-desk/${kind}/${id}/documents/${docId}`);
      window.open(r.data.url, "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const facts = kind === "legal"
    ? [["Service", c.serviceLabel], ["Client", c.clientName], ["Property", [c.property?.title, c.property?.locality, c.property?.city].filter(Boolean).join(", ")], ["Assigned", formatDate(c.assignedAt)], ["Due", c.dueOn ? formatDate(c.dueOn) : "—"], ["Fee", c.fee ? `${formatINR(c.fee.amount)} · ${c.fee.status}` : "Not recorded"]]
    : kind === "loan"
      ? [["Loan", c.loanLabel], ["Client", c.clientName], ["Amount asked", formatINR(c.loanAmountRequested || 0)], ["Tenure", c.tenureYears ? `${c.tenureYears} years` : "—"], ["Monthly income", c.monthlyIncome ? formatINR(c.monthlyIncome) : "—"], ["Existing EMI", formatINR(c.existingEmi || 0)], ["Property value", c.propertyValue ? formatINR(c.propertyValue) : "—"], ["Employment", label(c.employmentType) || "—"], ["NRI", c.isNri ? "Yes" : "No"], ["Sanction", c.sanction ? `${formatINR(c.sanction.amount)}${c.sanction.rate ? ` at ${c.sanction.rate}%` : ""}` : "—"]]
      : [["Cover", c.coverLabel], ["Client", c.clientName], ["Sum insured", c.sumInsured ? formatINR(c.sumInsured) : "—"], ["Property", c.propertyTitle || [c.propertyDetails?.locality, c.propertyDetails?.city].filter(Boolean).join(", ") || "—"], ["Linked to", [c.linkedToLoan && "a home loan", c.linkedToDeal && "a deal"].filter(Boolean).join(" and ") || "—"], ["Policy", c.policy ? `${c.policy.number} (${formatDate(c.policy.start)} to ${formatDate(c.policy.end)})` : "—"]];

  return (
    <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={c.status} />
        {c.overdue && <span className="rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-bold text-coral-700">Overdue</span>}
      </div>
      {kind === "legal" && <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-800">{c.requirement}</p>}
      <dl className="grid gap-3 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{k}</dt><dd className="text-sm text-ink-900" data-no-translate={k === "Client" || undefined}>{v || "—"}</dd></div>
        ))}
      </dl>
      {kind === "loan" && c.disbursementSchedule?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Disbursement schedule</p>
          <ul className="space-y-1 text-sm">{c.disbursementSchedule.map((t, i) => <li key={i}>{formatDate(t.dueOn)} · {formatINR(t.amount)}{t.note ? ` · ${t.note}` : ""}{t.paidOn ? ` · paid ${formatDate(t.paidOn)}` : ""}</li>)}</ul>
        </div>
      )}

      {/* Your next step */}
      {c.next.length > 0 && !step && (
        <div className="flex flex-wrap gap-2">
          {c.next.map((s) => <button key={s} className={["rejected", "declined"].includes(s) ? "btn-outline" : "btn-primary"} disabled={busy} onClick={() => setStep(s)}>{STEP_LABEL[s] || label(s)}</button>)}
        </div>
      )}
      {c.next.length === 0 && <p className="text-xs text-ink-500">Nothing more for you to move here - A R Buildwel takes it from this stage. You can still add notes and documents.</p>}
      {step && <StepForm kind={kind} step={step} busy={busy} onCancel={() => setStep(null)} onSubmit={(body) => put(body, "Updated.").then((ok) => ok && setStep(null))} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-line p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><LuMessageSquarePlus className="h-4 w-4" /> Add a note</p>
          <textarea className="field-input min-h-[64px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "legal" ? "e.g. Draft shared for review; registration slot booked for the 12th" : "Progress update"} />
          <label className="flex items-center gap-2 text-xs text-ink-700"><input type="checkbox" className="accent-red-600" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> The client can see it</label>
          <button className="btn-outline btn-sm" disabled={busy || note.trim().length < 2} onClick={() => put({ note, clientVisible: visible }, "Note added.").then((ok) => ok && setNote(""))}>Add note</button>
        </div>
        <div className="space-y-2 rounded-xl border border-line p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><LuSend className="h-4 w-4" /> Ask for documents</p>
          <textarea className="field-input min-h-[64px]" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Which documents, and why" />
          <p className="text-[11px] text-ink-500">The client and their A R representative are told on the platform.</p>
          <button className="btn-outline btn-sm" disabled={busy || ask.trim().length < 5} onClick={() => run(() => call(`/partner-desk/${kind}/${id}/document-request`, { method: "POST", body: { note: ask } }), "Request sent.").then((ok) => ok && setAsk(""))}>Send request</button>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-line p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><LuFileUp className="h-4 w-4" /> Documents</p>
        {c.linkedDocuments.length === 0 ? <p className="text-xs text-ink-500">No documents on this case yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {c.linkedDocuments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate" data-no-translate>{d.fileName || label(d.type)} <span className="text-xs text-ink-500">· {label(d.type)}{d.autoLinked ? " · on file" : d.uploadedByMe ? " · added by you" : ""}</span></span>
                <button className="btn-outline btn-sm" onClick={() => open(d.id)}><LuDownload className="h-3.5 w-3.5" /> Open</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <input ref={fileRef} type="file" accept=".pdf,image/*,.doc,.docx" className="field-input max-w-xs py-1.5" />
          <select className="field-select w-48" value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
          {kind === "legal" && <label className="flex items-center gap-2 text-xs text-ink-700"><input type="checkbox" className="accent-red-600" checked={asReport} onChange={(e) => setAsReport(e.target.checked)} /> This is the report</label>}
          <button className="btn-primary btn-sm" disabled={busy} onClick={upload}>Upload</button>
        </div>
      </div>

      {kind === "legal" && (
        <div className="space-y-2 rounded-xl border border-line p-4">
          <p className="text-sm font-bold text-ink-900">Billing</p>
          <p className="text-xs text-ink-500">Your fee is agreed and paid directly between you and the client. It is recorded here for both of you; A R Buildwel takes no share.</p>
          {fee ? (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <input type="number" min="0" className="field-input" placeholder="Amount ₹" value={fee.amount} onChange={(e) => setFee({ ...fee, amount: e.target.value })} />
              <select className="field-select" value={fee.status} onChange={(e) => setFee({ ...fee, status: e.target.value })}><option value="quoted">Quoted</option><option value="invoiced">Invoiced</option><option value="paid">Paid</option></select>
              <input className="field-input" placeholder="What it covers" value={fee.note} onChange={(e) => setFee({ ...fee, note: e.target.value })} />
              <button className="btn-primary btn-sm" disabled={busy || fee.amount === ""} onClick={() => run(() => call(`/partner-desk/legal/${id}/fee`, { method: "PUT", body: { amount: Number(fee.amount), status: fee.status, note: fee.note || undefined } }), "Fee recorded.").then((ok) => ok && setFee(null))}>Save</button>
            </div>
          ) : (
            <button className="btn-outline btn-sm" onClick={() => setFee({ amount: c.fee?.amount ?? "", status: c.fee?.status || "quoted", note: c.fee?.note || "" })}>{c.fee ? "Update fee" : "Record fee"}</button>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Timeline</p>
        <ol className="space-y-2 border-l border-line pl-4">
          {c.timeline.map((e, i) => (
            <li key={i} className="text-sm"><span className="font-semibold text-ink-900">{label(e.kind)}</span>{e.note && <span className="text-ink-700"> - {e.note}</span>}<span className="block text-[11px] text-ink-500">{formatDate(e.at, true)}{e.mine ? " · you" : ""}</span></li>
          ))}
        </ol>
      </div>
      {c.disclaimer && <p className="rounded-lg bg-surface-muted p-3 text-xs text-ink-600">{c.disclaimer}</p>}
    </div>
  );
}

export default function PartnerDeskPage() {
  const { role } = useAuth();
  const kind = KIND_OF[role];
  const me = useApiQuery(kind ? "/partner-desk/me" : null);
  const [openOnly, setOpenOnly] = useState(true);
  const list = useApiQuery(kind ? `/partner-desk/${kind}?open=${openOnly}` : null);
  const [openId, setOpenId] = useState(null);
  if (!kind) return <EmptyState title="This desk is for panel partners" />;
  if (me.error) return <div className="card p-6 text-sm text-coral-700">{me.error}</div>;
  if (!me.data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  const items = list.data?.[LIST_KEY[kind]] || [];
  const refresh = () => {
    me.reload();
    list.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`${me.data.firm || ""} · ${me.data.code}`} title={TITLE[kind]} subtitle={`Signed in as ${me.data.name}. You see only what A R Buildwel has assigned or referred to you.`} />
      <p className="rounded-xl border border-line bg-surface-muted px-4 py-3 text-xs text-ink-600">{me.data.nonCommission}</p>
      <Summary me={me.data} />
      <div className="inline-flex rounded-lg bg-surface-sunk p-1">
        {[[true, "Open"], [false, "All"]].map(([v, l]) => (
          <button key={l} onClick={() => setOpenOnly(v)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${openOnly === v ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {!list.data ? <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div> : items.length === 0 ? (
        <div className="card"><EmptyState title={openOnly ? "Nothing open right now" : "Nothing yet"} subtitle="New work appears here as soon as A R Buildwel assigns or refers it to you." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Number</th><th className={th}>{kind === "legal" ? "Service" : kind === "loan" ? "Loan" : "Cover"}</th><th className={th}>Client</th><th className={th}>Property</th><th className={th}>Status</th><th className={th} /></tr>
            </thead>
            <tbody>{items.map((item) => <Row key={item.id} kind={kind} item={item} onOpen={() => setOpenId(item.id)} />)}</tbody>
          </table>
        </div>
      )}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title={items.find((x) => x.id === openId)?.number || ""} maxWidth="max-w-3xl">
        {openId && <CaseDetail key={openId} kind={kind} id={openId} onChanged={refresh} />}
      </Modal>
    </div>
  );
}
