import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft, LuCalendarPlus, LuCheck, LuX, LuHandshake, LuReceiptIndianRupee, LuUpload, LuFileText, LuPlus, LuUserX,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { SelectField, TextField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";
import { STAGE_LABELS, STAGE_TRANSITIONS } from "../../redux/slices/dealsSlice";
import OrchestrationPanel from "../../components/orchestration/OrchestrationPanel";

// Deal detail (Screen 8): stage control, site visits (the customer sees
// these in their website dashboard and is notified), negotiation / booking
// log, payment milestones (record-only - buyer and seller pay each other
// directly) and deal documents.

const MILESTONE_ROLES = ["broker", "agency_admin", "admin", "super_admin"];
const DOC_TYPES = [
  { value: "agreement", label: "Agreement" },
  { value: "agreement_to_sell", label: "Agreement to Sell" },
  { value: "kyc", label: "KYC" },
  { value: "payment_receipt", label: "Payment receipt" },
  { value: "noc", label: "NOC" },
  { value: "other", label: "Other" },
];
const toLocalInput = (d) => {
  const date = d ? new Date(d) : new Date(Date.now() + 86400000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Section({ title, action, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const call = useApiCall();
  const { role, permissions } = useAuth();
  const { setTitle } = usePageTitle();
  const { data: deal, loading, error, reload } = useApiQuery(`/deals/${id}`);
  const canMilestones = MILESTONE_ROLES.includes(role);
  const { data: milestones, reload: reloadMilestones } = useApiQuery(canMilestones ? `/payments/milestones/${id}` : null);
  const { data: documents, reload: reloadDocs } = useApiQuery(`/documents/deal/${id}`);

  const [modal, setModal] = useState(null); // visit | reschedule | negotiation | booking | stage | close | milestone
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState("agreement");
  const [panelKey, setPanelKey] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    setTitle(deal?.customer_name ? `Deal - ${deal.customer_name}` : "Deal");
  }, [deal, setTitle]);

  const open = (name, initial = {}) => {
    setForm(initial);
    setModal(name);
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (fn, message, after = reload) => {
    setBusy(true);
    try {
      await fn();
      toast.push(message, "success");
      setModal(null);
      // Module 40: re-check right away so auto-advance shows immediately.
      await call(`/orchestration/deals/${id}/evaluate`, { method: "POST" }).catch(() => {});
      await after();
      if (after !== reload) reload();
      setPanelKey((k) => k + 1);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !deal) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }
  if (error || !deal) return <EmptyState title="Deal not found" subtitle={error || `No deal with id ${id}.`} />;

  const closed = ["closed_won", "closed_lost"].includes(deal.stage);
  const nextStages = (STAGE_TRANSITIONS[deal.stage] || []).filter((s) => !["closed_won", "closed_lost"].includes(s));
  const visits = deal.siteVisits || [];
  const history = [...(deal.stageHistory || [])].reverse();
  const docs = Array.isArray(documents) ? documents : documents?.items || [];

  const uploadDoc = async (file) => {
    const body = new FormData();
    body.append("file", file);
    body.append("dealId", id);
    if (deal.customer_id) body.append("customerId", deal.customer_id);
    body.append("documentType", docType);
    await run(() => call("/documents/upload", { method: "POST", body, isFormData: true }), "Document uploaded.", reloadDocs);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/app/deals")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> All deals
      </button>

      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-ink-950">{deal.customer_name || "Customer"}</h2>
            <StatusBadge value={STAGE_LABELS[deal.stage] || deal.stage} />
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {deal.property_title ? (
              <Link to={`/app/properties/${deal.property_id}`} className="font-semibold text-red-600 hover:underline">
                {deal.property_title}
              </Link>
            ) : (
              "No property linked"
            )}
            {deal.property_city ? ` · ${deal.property_city}` : ""}
            {deal.unit_number ? ` · Unit ${deal.unit_number}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {deal.customer_mobile || "—"} · {deal.customer_email || "—"} · Broker: {deal.broker_name || "—"}
            {deal.lead_id && (
              <>
                {" · "}
                <Link to={`/app/leads/${deal.lead_id}`} className="font-semibold text-red-600 hover:underline">
                  Open lead
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-ink-500">Deal value</p>
            <p className="font-bold text-ink-950">{deal.deal_value ? formatINR(deal.deal_value) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Commission</p>
            <p className="font-bold text-ink-950">
              {deal.commission_amount ? formatINR(deal.commission_amount) : "—"}
              {deal.commission_percent ? ` (${deal.commission_percent}%)` : ""}
            </p>
          </div>
        </div>
      </div>

      <OrchestrationPanel key={panelKey} dealId={id} onChange={reload} />

      {!closed && permissions.edit && (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" onClick={() => open("visit", { scheduledAt: toLocalInput() })}>
            <LuCalendarPlus className="h-4 w-4" /> Schedule site visit
          </button>
          <button className="btn-outline btn-sm" onClick={() => open("negotiation")}>
            <LuHandshake className="h-4 w-4" /> Log offer
          </button>
          <button className="btn-outline btn-sm" onClick={() => open("booking")}>
            <LuReceiptIndianRupee className="h-4 w-4" /> Record booking
          </button>
          {nextStages.length > 0 && (
            <button className="btn-outline btn-sm" onClick={() => open("stage", { stage: nextStages[0] })}>
              Move stage
            </button>
          )}
          <button className="btn-outline btn-sm" onClick={() => open("close", { outcome: "won" })}>
            <LuCheck className="h-4 w-4" /> Close deal
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title={`Site visits (${visits.length})`}>
          {visits.length === 0 ? (
            <p className="text-sm text-ink-500">No visits yet. Scheduling one notifies the customer on the website.</p>
          ) : (
            <ul className="divide-y divide-line">
              {visits.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{formatDate(v.scheduled_at, true)}</p>
                    <p className="text-xs text-ink-500">
                      {v.actual_visit_at ? `Visited ${formatDate(v.actual_visit_at, true)} · ` : ""}
                      {v.notes || "No notes"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={titleCase(v.status)} />
                    {v.status === "scheduled" && permissions.edit && (
                      <>
                        <button
                          title="Mark completed"
                          className="rounded-lg border border-line p-1.5 text-green-600 hover:bg-green-50"
                          onClick={() =>
                            run(
                              () => call(`/deals/${id}/site-visit/${v.id}`, { method: "PUT", body: { status: "completed", actualVisitAt: new Date().toISOString() } }),
                              "Visit marked completed."
                            )
                          }
                        >
                          <LuCheck className="h-4 w-4" />
                        </button>
                        <button
                          title="No show"
                          className="rounded-lg border border-line p-1.5 text-amber-600 hover:bg-amber-50"
                          onClick={() => run(() => call(`/deals/${id}/site-visit/${v.id}`, { method: "PUT", body: { status: "no_show" } }), "Marked as no-show.")}
                        >
                          <LuUserX className="h-4 w-4" />
                        </button>
                        <button
                          title="Reschedule"
                          className="rounded-lg border border-line p-1.5 text-ink-600 hover:bg-surface-muted"
                          onClick={() => open("reschedule", { visitId: v.id, scheduledAt: toLocalInput(v.scheduled_at) })}
                        >
                          <LuCalendarPlus className="h-4 w-4" />
                        </button>
                        <button
                          title="Cancel"
                          className="rounded-lg border border-line p-1.5 text-red-600 hover:bg-red-50"
                          onClick={() => run(() => call(`/deals/${id}/site-visit/${v.id}`, { method: "PUT", body: { status: "cancelled" } }), "Visit cancelled.")}
                        >
                          <LuX className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Timeline">
          {history.length === 0 ? (
            <p className="text-sm text-ink-500">No stage changes yet.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border-l-2 border-red-200 pl-3">
                  <p className="text-sm font-semibold text-ink-900">
                    {h.from_stage && h.from_stage !== h.to_stage
                      ? `${STAGE_LABELS[h.from_stage] || h.from_stage} → ${STAGE_LABELS[h.to_stage] || h.to_stage}`
                      : STAGE_LABELS[h.to_stage] || h.to_stage}
                  </p>
                  {h.notes && <p className="text-xs text-ink-600">{h.notes}</p>}
                  <p className="text-xs text-ink-400">{formatDate(h.created_at, true)}</p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {canMilestones && (
          <Section
            title="Payment milestones"
            action={
              !closed || deal.stage === "closed_won" ? (
                <button className="btn-outline btn-sm" onClick={() => open("milestone", { dueDate: new Date().toISOString().slice(0, 10) })}>
                  <LuPlus className="h-4 w-4" /> Add
                </button>
              ) : null
            }
          >
            <p className="mb-3 text-xs text-ink-500">Tracking only - buyer and seller pay each other directly.</p>
            {(milestones || []).length === 0 ? (
              <p className="text-sm text-ink-500">No milestones yet (e.g. token, agreement, registration).</p>
            ) : (
              <ul className="divide-y divide-line">
                {milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{m.milestone_name}</p>
                      <p className="text-xs text-ink-500">
                        {formatINR(m.due_amount)} · due {formatDate(m.due_date)}
                      </p>
                    </div>
                    <select
                      className="field-select h-8 w-32 text-xs"
                      value={m.status}
                      onChange={(e) =>
                        run(() => call(`/payments/milestones/${m.id}`, { method: "PUT", body: { status: e.target.value } }), "Milestone updated.", reloadMilestones)
                      }
                    >
                      {["pending", "paid", "overdue", "waived"].map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <Section
          title={`Documents (${docs.length})`}
          action={
            <div className="flex items-center gap-2">
              <select className="field-select h-8 w-36 text-xs" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button className="btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <LuUpload className="h-4 w-4" /> Upload
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])} />
            </div>
          }
        >
          {docs.length === 0 ? (
            <p className="text-sm text-ink-500">No documents on this deal yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 py-3">
                  <a href={d.document_url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink-900 hover:text-red-600">
                    <LuFileText className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="truncate">{d.file_name || titleCase(d.document_type)}</span>
                  </a>
                  <StatusBadge value={titleCase(d.status)} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Modal open={modal === "visit" || modal === "reschedule"} onClose={() => setModal(null)} title={modal === "reschedule" ? "Reschedule visit" : "Schedule site visit"} description="The customer is notified on their website dashboard.">
        <div className="space-y-4">
          <TextField label="Date & time" type="datetime-local" value={form.scheduledAt || ""} onChange={set("scheduledAt")} />
          {modal === "visit" && <TextareaField label="Notes (optional)" rows={3} value={form.notes || ""} onChange={set("notes")} />}
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy || !form.scheduledAt}
              onClick={() =>
                modal === "visit"
                  ? run(() => call(`/deals/${id}/site-visit`, { method: "POST", body: { scheduledAt: new Date(form.scheduledAt).toISOString(), notes: form.notes || undefined } }), "Visit scheduled - customer notified.")
                  : run(() => call(`/deals/${id}/site-visit/${form.visitId}`, { method: "PUT", body: { scheduledAt: new Date(form.scheduledAt).toISOString() } }), "Visit rescheduled - customer notified.")
              }
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "negotiation" || modal === "booking"} onClose={() => setModal(null)} title={modal === "booking" ? "Record booking" : "Log offer"}>
        <div className="space-y-4">
          <TextField label={modal === "booking" ? "Booking amount (₹)" : "Offer amount (₹)"} type="number" value={form.amount || ""} onChange={set("amount")} />
          <TextareaField label="Notes" rows={3} value={form.notes || ""} onChange={set("notes")} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                modal === "booking"
                  ? run(() => call(`/deals/${id}/booking`, { method: "POST", body: { bookingAmount: form.amount ? Number(form.amount) : undefined, notes: form.notes || undefined } }), "Booking recorded.")
                  : run(() => call(`/deals/${id}/negotiation`, { method: "POST", body: { offerAmount: form.amount ? Number(form.amount) : undefined, notes: form.notes || undefined } }), "Offer logged.")
              }
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "stage"} onClose={() => setModal(null)} title="Move deal stage">
        <div className="space-y-4">
          <SelectField label="New stage" value={form.stage || ""} onChange={set("stage")} options={nextStages.map((s) => ({ value: s, label: STAGE_LABELS[s] }))} />
          <TextareaField label={form.override ? "Reason for the override (required)" : "Notes (optional)"} rows={3} value={form.notes || ""} onChange={set("notes")} />
          <p className="text-xs text-ink-500">Moving forward needs the next stage's requirements met - the deal usually moves on by itself.</p>
          {["admin", "super_admin"].includes(role) && (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={!!form.override} onChange={(e) => setForm((f) => ({ ...f, override: e.target.checked }))} className="h-4 w-4 accent-red-600" />
              Override missing requirements (logged)
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy || !form.stage || (form.override && !form.notes)} onClick={() => run(() => call(`/deals/${id}/stage`, { method: "PUT", body: { stage: form.stage, notes: form.notes || undefined, override: form.override || undefined } }), "Stage updated.")}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "close"} onClose={() => setModal(null)} title="Close deal">
        <div className="space-y-4">
          <SelectField label="Outcome" value={form.outcome || "won"} onChange={set("outcome")} options={[{ value: "won", label: "Won" }, { value: "lost", label: "Lost" }]} />
          <TextareaField label={form.outcome === "lost" ? "Reason lost" : "Notes"} rows={3} value={form.reason || ""} onChange={set("reason")} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => run(() => call(`/deals/${id}/close`, { method: "PUT", body: { outcome: form.outcome || "won", reason: form.reason || undefined } }), "Deal closed.")}>
              Close deal
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "milestone"} onClose={() => setModal(null)} title="Add payment milestone">
        <div className="space-y-4">
          <TextField label="Milestone" placeholder="e.g. Token amount" value={form.milestoneName || ""} onChange={set("milestoneName")} />
          <TextField label="Amount (₹)" type="number" value={form.dueAmount || ""} onChange={set("dueAmount")} />
          <TextField label="Due date" type="date" value={form.dueDate || ""} onChange={set("dueDate")} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy || !form.milestoneName || !form.dueAmount || !form.dueDate}
              onClick={() =>
                run(
                  () => call("/payments/milestones", { method: "POST", body: { dealId: id, milestoneName: form.milestoneName, dueAmount: Number(form.dueAmount), dueDate: form.dueDate } }),
                  "Milestone added.",
                  reloadMilestones
                )
              }
            >
              Add
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
