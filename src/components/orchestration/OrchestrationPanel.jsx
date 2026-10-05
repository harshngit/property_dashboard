import { useState } from "react";
import { LuCircleCheck, LuCircle, LuClock, LuHeartPulse, LuRefreshCw, LuCircleAlert } from "react-icons/lu";
import Modal from "../common/Modal";
import { SelectField, TextField, TextareaField } from "../common/FormField";
import { useToast } from "../common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";
import { INVOICE_KIND, InvoiceStatus, PdfButton } from "./invoices";

// Module 40 on the deal page: the stage path with the time in stage vs its
// SLA, what the next stage still needs (the deal moves on by itself once
// it is all there), the health score with its factors, execution dates
// (ATS / Sale Deed / lease) that raise the professional-fee invoices, and
// the invoices with PDF / record payment / waive.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
import { STAGE_LABEL as LABEL } from "../../lib/dealStages";
const LOAN = [["pending", "Pending"], ["not_needed", "Not needed (cash / own funds)"], ["referred", "Referred to lender"], ["sanctioned", "Sanctioned"], ["disbursed", "Disbursed"]];
const INSURANCE = [["pending", "Pending"], ["not_needed", "Not needed"], ["referred", "Referred to insurer"], ["issued", "Policy issued"]];
const label = (list, v) => (list.find(([k]) => k === v) || [v, v])[1];
const BAND = { healthy: "bg-emerald-50 text-emerald-700", at_risk: "bg-amber-50 text-amber-700", critical: "bg-red-50 text-red-700" };
const EVENT = { auto_advance: "Auto-advanced", override: "Override", sla_alert: "SLA alert", invoice: "Invoice", invoice_overdue: "Invoice overdue", blocked: "Blocked", milestone: "Milestone", referrals: "Referrals updated" };

export default function OrchestrationPanel({ dealId, onChange }) {
  const { role } = useAuth();
  const toast = useToast();
  const call = useApiCall();
  const { data: o, reload } = useApiQuery(`/orchestration/deals/${dealId}`);
  const [modal, setModal] = useState(null); // dates | pay | waive
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const staff = STAFF.includes(role);

  if (!o) return null;
  const idx = o.flow.indexOf(o.stage);
  const closed = ["closed_won", "closed_lost"].includes(o.stage);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      const r = await fn();
      const moved = r?.data?.advanced?.length ? ` Moved to ${LABEL[r.data.advanced.at(-1)]}.` : "";
      toast.push(`${message}${moved}`, "success");
      setModal(null);
      reload();
      onChange?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Transaction orchestration</h3>
        <div className="flex items-center gap-2">
          {o.health?.score != null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${BAND[o.health.band]}`}>
              <LuHeartPulse className="h-3.5 w-3.5" /> Health {o.health.score} · {titleCase(o.health.band)}
            </span>
          )}
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/orchestration/deals/${dealId}/evaluate`, { method: "POST" }), "Re-checked.")}>
            <LuRefreshCw className="h-4 w-4" /> Re-check
          </button>
        </div>
      </div>

      {/* Stage path */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {o.flow.map((s, i) => (
          <li key={s} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${i < idx || o.stage === "closed_won" ? "bg-emerald-50 text-emerald-700" : i === idx ? "bg-red-600 text-white" : "bg-surface-muted text-ink-500"}`}>
            {LABEL[s]}
          </li>
        ))}
        {o.stage === "on_hold" && <li className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">On hold</li>}
      </ol>

      {!closed && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${o.slaOverdue ? "text-red-700" : "text-ink-900"}`}>
              {o.slaOverdue ? <LuCircleAlert className="h-4 w-4" /> : <LuClock className="h-4 w-4 text-ink-400" />}
              {o.daysInStage} day(s) in {LABEL[o.stage] || titleCase(o.stage)}
              {o.slaDays ? ` · SLA ${o.slaDays} days` : ""}
            </p>
            {o.next && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-500">To move to {LABEL[o.next]}</p>
                <ul className="mt-1.5 space-y-1">
                  {o.nextRequirements.map((r) => (
                    <li key={r.key} className={`flex items-center gap-1.5 text-sm ${r.met ? "text-emerald-700" : "text-ink-700"}`}>
                      {r.met ? <LuCircleCheck className="h-4 w-4" /> : <LuCircle className="h-4 w-4 text-ink-300" />} {r.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">The deal moves on by itself as soon as everything is in place.</p>
              </>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Health factors</p>
            {(o.health?.factors || []).length === 0 ? (
              <p className="mt-1.5 text-sm text-emerald-700">No risk signals.</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {o.health.factors.map((f) => (
                  <li key={f.label} className="flex justify-between gap-2 text-sm text-ink-700">
                    <span>{f.label}</span>
                    <span className="font-semibold text-red-600">{f.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Legal coordination, loan and insurance referrals (referral-only) */}
      {o.referrals && o.stage !== "closed_lost" && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-4">
          <div className="grid gap-x-6 gap-y-1 text-sm text-ink-700 sm:grid-cols-3">
            <p>Legal: <b>{o.referrals.legalAdvocate || "advocate not recorded"}</b></p>
            <p>Loan: <b>{label(LOAN, o.referrals.loanStatus)}</b>{o.referrals.loanLender ? ` · ${o.referrals.loanLender}` : ""}</p>
            <p>Insurance: <b>{label(INSURANCE, o.referrals.insuranceStatus)}</b>{o.referrals.insuranceProvider ? ` · ${o.referrals.insuranceProvider}` : ""}</p>
          </div>
          <button
            className="btn-outline btn-sm"
            onClick={() => {
              setForm({
                legalAdvocate: o.referrals.legalAdvocate || "", legalNotes: o.referrals.legalNotes || "",
                loanStatus: o.referrals.loanStatus, loanLender: o.referrals.loanLender || "",
                insuranceStatus: o.referrals.insuranceStatus, insuranceProvider: o.referrals.insuranceProvider || "",
              });
              setModal("referrals");
            }}
          >
            Update legal / loan / insurance
          </button>
        </div>
      )}

      {/* Execution dates + invoices */}
      <div className="border-t border-line pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-700">
            {o.isRent ? (
              <>Lease executed: <b>{o.dates.leaseExecutionDate ? formatDate(o.dates.leaseExecutionDate) : "—"}</b></>
            ) : (
              <>
                ATS executed: <b>{o.dates.atsExecutionDate ? formatDate(o.dates.atsExecutionDate) : "—"}</b> · Sale Deed executed (= registration):{" "}
                <b>{o.dates.saleDeedExecutionDate ? formatDate(o.dates.saleDeedExecutionDate) : "—"}</b>
              </>
            )}
          </p>
          {o.stage !== "closed_lost" && (
            <button
              className="btn-outline btn-sm"
              onClick={() => {
                setForm({ ats: o.dates.atsExecutionDate?.slice(0, 10) || "", deed: o.dates.saleDeedExecutionDate?.slice(0, 10) || "", lease: o.dates.leaseExecutionDate?.slice(0, 10) || "" });
                setModal("dates");
              }}
            >
              Record execution dates
            </button>
          )}
        </div>
        {o.invoices.length === 0 ? (
          <p className="text-sm text-ink-500">
            {o.isRent ? "The lease invoice is raised on the lease execution date." : "Instalment 1 is raised on the ATS execution date and Instalment 2 on the Sale Deed execution date (50% each of the 1% professional fee + GST)."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {o.invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {inv.invoice_number} · {INVOICE_KIND[inv.kind]}
                  </p>
                  <p className="text-xs text-ink-500">
                    {inv.liable_name} · fee {formatINR(inv.fee_amount, { compact: false })} + {inv.gst_type === "igst" ? "IGST 18%" : "CGST 9% + SGST 9%"} = <b>{formatINR(inv.total_amount, { compact: false })}</b> · due {formatDate(inv.due_date)}
                    {inv.payment_reference ? ` · ref ${inv.payment_reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InvoiceStatus inv={inv} />
                  <PdfButton id={inv.id} />
                  {staff && !["paid", "waived"].includes(inv.status) && (
                    <button className="btn-outline btn-sm" onClick={() => { setForm({ invoiceId: inv.id }); setModal("pay"); }}>Mark paid</button>
                  )}
                  {ADMIN.includes(role) && !["paid", "waived"].includes(inv.status) && (
                    <button className="btn-outline btn-sm" onClick={() => { setForm({ invoiceId: inv.id }); setModal("waive"); }}>Waive</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {o.events.length > 0 && (
        <details className="border-t border-line pt-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-500">Orchestration log ({o.events.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {o.events.map((e) => (
              <li key={e.id} className="text-xs text-ink-600">
                <b>{EVENT[e.kind] || e.kind}</b>
                {e.to_stage ? ` → ${LABEL[e.to_stage] || e.to_stage}` : ""}
                {e.detail?.notes ? ` · ${e.detail.notes}` : ""}
                {e.detail?.number ? ` · ${e.detail.number}` : ""}
                {e.detail?.days ? ` · ${e.detail.days} days (SLA ${e.detail.limit})` : ""}
                {" · "}
                {e.actor_name || "System"} · {formatDate(e.created_at, true)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <Modal open={modal === "referrals"} onClose={() => setModal(null)} title="Legal, loan and insurance" description="A R Buildwel refers and coordinates only - advocates, lenders and insurers are engaged by the client. 'Not needed' lets the deal move on.">
        <div className="space-y-3">
          <TextField label="Advocate coordinating legal" value={form.legalAdvocate || ""} onChange={set("legalAdvocate")} />
          <TextareaField label="Legal notes" rows={2} value={form.legalNotes || ""} onChange={set("legalNotes")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Home loan" value={form.loanStatus || "pending"} onChange={set("loanStatus")} options={LOAN.map(([value, l]) => ({ value, label: l }))} />
            <TextField label="Lender" value={form.loanLender || ""} onChange={set("loanLender")} />
            <SelectField label="Property insurance" value={form.insuranceStatus || "pending"} onChange={set("insuranceStatus")} options={INSURANCE.map(([value, l]) => ({ value, label: l }))} />
            <TextField label="Insurer" value={form.insuranceProvider || ""} onChange={set("insuranceProvider")} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => run(() => call(`/orchestration/deals/${dealId}/referrals`, { method: "PUT", body: form }), "Saved.")}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "dates"} onClose={() => setModal(null)} title="Record execution dates" description="Recording a date raises the matching professional-fee invoice to the buyer (net 7 days).">
        <div className="space-y-4">
          {o.isRent ? (
            <TextField label="Lease / leave-and-licence executed on" type="date" value={form.lease || ""} onChange={set("lease")} />
          ) : (
            <>
              <TextField label="Agreement to Sell executed on (Instalment 1)" type="date" value={form.ats || ""} onChange={set("ats")} />
              <TextField label="Sale Deed executed / registered on (Instalment 2)" type="date" value={form.deed || ""} onChange={set("deed")} />
            </>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    call(`/orchestration/deals/${dealId}/dates`, {
                      method: "PUT",
                      body: o.isRent ? { leaseExecutionDate: form.lease || null } : { atsExecutionDate: form.ats || undefined, saleDeedExecutionDate: form.deed || undefined },
                    }),
                  "Dates recorded."
                )
              }
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "pay"} onClose={() => setModal(null)} title="Record invoice payment">
        <div className="space-y-4">
          <TextField label="Payment reference (UTR / cheque no.)" value={form.reference || ""} onChange={set("reference")} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => run(() => call(`/orchestration/invoices/${form.invoiceId}/payment`, { method: "POST", body: { reference: form.reference || undefined } }), "Payment recorded.")}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "waive"} onClose={() => setModal(null)} title="Waive invoice" description="Logged in the audit trail.">
        <div className="space-y-4">
          <TextareaField label="Reason" rows={3} value={form.note || ""} onChange={set("note")} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy || (form.note || "").length < 3} onClick={() => run(() => call(`/orchestration/invoices/${form.invoiceId}/waive`, { method: "POST", body: { note: form.note } }), "Invoice waived.")}>
              Waive
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
