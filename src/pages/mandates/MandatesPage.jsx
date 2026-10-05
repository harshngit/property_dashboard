import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { LuDownload, LuEye } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import useStaffOptions from "../../hooks/useStaffOptions";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, formatINR } from "../../lib/format";

// Module 46 Mandate Management (A R staff): pending acknowledgements, active,
// expiring within 30 days, expired and breached mandates; benefit delivery;
// Instalment 1 / 2 per deal; renew / breach / cancel; PDFs. The price range
// is revealed on demand to the assigned representative / Super Admin only,
// and every reveal is logged.

const ADMIN = ["admin", "super_admin"];
const FILTERS = [
  ["", "All"],
  ["pending_rep_ack", "Awaiting ack"],
  ["active", "Active"],
  ["expiring", "Expiring 30d"],
  ["expired", "Expired"],
  ["breached", "Breached"],
  ["cancelled", "Cancelled"],
];
const STATUS_TONE = {
  pending_rep_ack: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  expired: "bg-surface-muted text-ink-600",
  breached: "bg-red-50 text-red-700",
  cancelled: "bg-surface-muted text-ink-500",
};
const BENEFIT_OPTIONS = {
  valuationStatus: ["not_requested", "requested", "in_progress", "completed", "report_uploaded"],
  dueDiligenceStatus: ["not_requested", "in_progress", "completed", "report_uploaded"],
  deedWriterWaiverStatus: ["not_applicable", "active", "utilised"],
};
const label = (v) => String(v || "").replace(/_/g, " ");
const exclusive = (t) => String(t).endsWith("_exclusive");
const party = (t) => (String(t).startsWith("seller") ? "Seller" : "Buyer");

export function MandateStatus({ status }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_TONE[status] || ""}`}>{status === "pending_rep_ack" ? "Awaiting ack" : label(status)}</span>;
}

export function MandatePdfButton({ id, which, title }) {
  const token = useSelector((s) => s.auth.accessToken);
  const toast = useToast();
  const open = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mandates/${id}/${which}-pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Could not load the PDF");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <button onClick={open} className="btn-outline btn-sm inline-flex items-center gap-1">
      <LuDownload className="h-3.5 w-3.5" /> {title}
    </button>
  );
}

export default function MandatesPage() {
  const { role, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const query = buildQuery({
    status: filter === "expiring" ? "" : filter,
    expiringWithin: filter === "expiring" ? 30 : "",
    party: partyFilter,
    mine: mine ? "true" : "",
    search,
  });
  const { data, loading, reload } = useApiQuery(`/mandates${query}`);
  const openId = params.get("id");
  const rows = data?.items || [];
  const s = data?.summary || {};

  return (
    <div>
      <PageHeader title="Mandate Management" />
      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        {[
          ["Awaiting acknowledgement", s.pending, "text-amber-700"],
          ["Active exclusive", s.active_exclusive, "text-emerald-700"],
          ["Expiring in 30 days", s.expiring_30, "text-amber-700"],
          ["Expired", s.expired, "text-ink-700"],
          ["Breached", s.breached, "text-red-600"],
        ].map(([l, v, tone]) => (
          <div key={l} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{v ?? "–"}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {[["", "Both"], ["seller", "Sellers"], ["buyer", "Buyers"]].map(([k, l]) => (
            <button key={k} onClick={() => setPartyFilter(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${partyFilter === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Assigned to me
        </label>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mandate no. or client" className="field-input h-9 max-w-xs text-sm" />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No mandates" subtitle="Every posted listing and requirement gets a mandate record once its professional fee consent is confirmed by OTP." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Mandate</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Representative</th>
                <th className="px-4 py-3">Benefits</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => (
                <tr key={m.id} className="cursor-pointer hover:bg-surface-muted/60" onClick={() => setParams({ id: m.id })}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{m.mandate_number}</p>
                    <p className="text-xs text-ink-500">{party(m.mandate_type)} · {exclusive(m.mandate_type) ? "Exclusive" : "Standard"}</p>
                  </td>
                  <td className="px-4 py-3">{m.client_name || "–"}</td>
                  <td className="px-4 py-3 text-xs">{m.subject || "–"}</td>
                  <td className="px-4 py-3 text-xs">
                    {m.mandate_start_date ? `${formatDate(m.mandate_start_date)} – ${m.mandate_end_date ? formatDate(m.mandate_end_date) : "open"}` : "–"}
                    {m.status === "active" && m.days_left != null && (
                      <p className={m.days_left <= 7 ? "font-bold text-red-600" : m.days_left <= 30 ? "font-semibold text-amber-700" : "text-ink-500"}>{m.days_left} days left</p>
                    )}
                    {m.renewal_count > 0 && <p className="text-ink-500">Renewed {m.renewal_count}×</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">{m.assigned_rep_name || <span className="text-amber-700">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {exclusive(m.mandate_type) ? (
                      <>
                        {m.mandate_type === "seller_exclusive" && <p>Valuation: {label(m.valuation_status)}</p>}
                        <p>DD: {label(m.due_diligence_status)}</p>
                        <p>Deed writer: {label(m.deed_writer_waiver_status)}</p>
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="px-4 py-3"><MandateStatus status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <MandateDetail id={openId} role={role} me={user?.id} onClose={() => setParams({})} onChanged={reload} />}
    </div>
  );
}

function MandateDetail({ id, role, me, onClose, onChanged }) {
  const toast = useToast();
  const call = useApiCall();
  const { data: m, loading, reload } = useApiQuery(`/mandates/${id}`);
  const staffOptions = useStaffOptions(ADMIN.includes(role) ? ["internal_sales", "admin", "super_admin"] : []);
  const [price, setPrice] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (m) setForm({ valuationStatus: m.valuation_status, dueDiligenceStatus: m.due_diligence_status, deedWriterWaiverStatus: m.deed_writer_waiver_status, repId: m.assigned_rep_id || "" });
    setPrice(null);
  }, [m]);

  const act = async (path, { method = "POST", body, message }) => {
    setBusy(true);
    try {
      await call(path, { method, body });
      toast.push(message, "success");
      setModal(null);
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const reveal = async () => {
    try {
      const res = await call(`/mandates/${id}/price-range`);
      setPrice(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const isRep = m && (m.assigned_rep_id === me || (!m.assigned_rep_id && role === "internal_sales"));
  const canAct = ADMIN.includes(role) || isRep;

  return (
    <Modal open onClose={onClose} title={m ? `Mandate ${m.mandate_number}` : "Mandate"} description={m?.subject || ""} maxWidth="max-w-3xl">
      {loading && !m ? (
        <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div>
      ) : m ? (
        <div className="space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Type", `${party(m.mandate_type)} · ${exclusive(m.mandate_type) ? "Exclusive Mandate" : "Standard Engagement"}`],
              ["Client", m.client_name || "–"],
              ["Status", <MandateStatus key="s" status={m.status} />],
              ["Period", m.mandate_start_date ? `${formatDate(m.mandate_start_date)} – ${m.mandate_end_date ? formatDate(m.mandate_end_date) : "open"}` : "Starts on acknowledgement"],
              ["Representative", m.assigned_rep_name || "Unassigned"],
              ["Professional fee", `1% + ${m.gst_type === "IGST" ? "IGST" : "GST"} · no discount`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-surface-muted px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{k}</p>
                <div className="mt-0.5 font-semibold text-ink-900">{v}</div>
              </div>
            ))}
          </div>
          {m.status_reason && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{m.status_reason}</p>}

          {exclusive(m.mandate_type) && (
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Confidential price range</p>
                {m.can_view_price_range && m.price_range_on_file && !price && (
                  <button className="btn-outline btn-sm inline-flex items-center gap-1" onClick={reveal}><LuEye className="h-3.5 w-3.5" /> Reveal (logged)</button>
                )}
              </div>
              {price ? (
                <p className="mt-2 font-semibold text-ink-900">
                  {price.party === "seller"
                    ? `Minimum acceptable ${formatINR(price.minAcceptablePrice, { compact: false })} · Maximum listed ${formatINR(price.maxListedPrice, { compact: false })}`
                    : `Budget ${formatINR(price.minBudget, { compact: false })} – ${formatINR(price.maxBudget, { compact: false })}`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-ink-500">
                  {!m.price_range_on_file ? "Not on file." : m.can_view_price_range ? "Hidden until revealed. Every reveal is recorded." : "Visible only to the assigned representative and the Super Admin."}
                </p>
              )}
            </div>
          )}

          {(m.deals || []).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Deals on this mandate</p>
              <div className="space-y-2">
                {m.deals.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <Link to={`/app/deals/${d.id}`} className="font-semibold text-red-600 hover:underline">Deal · {label(d.stage)}</Link>
                    <span className="text-xs text-ink-500">{d.deal_value ? formatINR(d.deal_value) : "Value not set"}{d.site_visit_completed ? " · site visit completed" : ""}</span>
                    <span className="text-xs">
                      {["instalment_1", "instalment_2"].map((k, i) => {
                        const inv = (d.invoices || []).find((x) => x.kind === k);
                        return <span key={k} className="ml-2">Instalment {i + 1}: <b className="capitalize">{inv ? label(inv.status) : "not triggered"}</b></span>;
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exclusive(m.mandate_type) && m.status === "active" && canAct && (
            <div className="rounded-lg border border-line p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Benefit delivery</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(BENEFIT_OPTIONS)
                  .filter(([k]) => k !== "valuationStatus" || m.mandate_type === "seller_exclusive")
                  .map(([k, opts]) => (
                    <SelectField
                      key={k}
                      label={{ valuationStatus: "Free valuation", dueDiligenceStatus: "Legal due diligence", deedWriterWaiverStatus: "Deed writer waiver" }[k]}
                      value={form[k] || ""}
                      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                      options={opts.map((o) => ({ value: o, label: label(o) }))}
                    />
                  ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  className="btn-primary btn-sm"
                  disabled={busy}
                  onClick={() =>
                    act(`/mandates/${id}/benefits`, {
                      method: "PUT",
                      body: {
                        ...(m.mandate_type === "seller_exclusive" ? { valuationStatus: form.valuationStatus } : {}),
                        dueDiligenceStatus: form.dueDiligenceStatus,
                        deedWriterWaiverStatus: form.deedWriterWaiverStatus,
                      },
                      message: "Benefits updated.",
                    })
                  }
                >
                  Save benefits
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {m.status === "pending_rep_ack" && canAct && (
              <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(`/mandates/${id}/acknowledge`, { method: "PUT", message: "Mandate acknowledged and active." })}>
                Acknowledge &amp; activate
              </button>
            )}
            {exclusive(m.mandate_type) && ["active", "expired"].includes(m.status) && canAct && (
              <button className="btn-outline btn-sm" onClick={() => { setForm((f) => ({ ...f, reason: "" })); setModal("renew"); }}>Renew</button>
            )}
            {!["expired", "breached", "cancelled"].includes(m.status) && canAct && (
              <>
                <button className="btn-outline btn-sm" onClick={() => { setForm((f) => ({ ...f, reason: "" })); setModal("breach"); }}>Flag breach</button>
                <button className="btn-outline btn-sm" onClick={() => { setForm((f) => ({ ...f, reason: "" })); setModal("cancel"); }}>Cancel</button>
              </>
            )}
            {ADMIN.includes(role) && <button className="btn-outline btn-sm" onClick={() => setModal("assign")}>Assign representative</button>}
            <MandatePdfButton id={id} which="consent" title="Consent record" />
            {exclusive(m.mandate_type) && m.status !== "pending_rep_ack" && <MandatePdfButton id={id} which="summary" title="Mandate summary" />}
          </div>

          {(m.events || []).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Activity log (append-only)</p>
              <ul className="max-h-56 space-y-1 overflow-y-auto text-xs">
                {m.events.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-line py-1">
                    <span className="capitalize text-ink-800">
                      {label(e.kind)}
                      {e.pipeline_stage ? ` · deal at ${label(e.pipeline_stage)}` : ""}
                      {e.detail?.reason ? ` · ${e.detail.reason}` : ""}
                    </span>
                    <span className="shrink-0 text-ink-500">{e.actor_name || "System"} · {formatDate(e.created_at, true)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {["renew", "breach", "cancel"].includes(modal) && (
            <div className="rounded-lg border border-line p-3">
              <TextareaField
                label={modal === "renew" ? "Reason for renewal (optional)" : `Reason for ${modal === "breach" ? "breach" : "cancellation"}`}
                rows={2}
                value={form.reason || ""}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
              {modal === "renew" && <p className="mt-1 text-xs text-ink-500">Needs a deal past Site Visit Completed. After 2 renewals, Super Admin approval is required.</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button className="btn-outline btn-sm" onClick={() => setModal(null)}>Back</button>
                <button
                  className="btn-primary btn-sm"
                  disabled={busy || (modal !== "renew" && (form.reason || "").trim().length < 3)}
                  onClick={() => act(`/mandates/${id}/${modal}`, { body: { reason: form.reason || undefined }, message: { renew: "Mandate renewed.", breach: "Mandate flagged as breached.", cancel: "Mandate cancelled." }[modal] })}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
          {modal === "assign" && (
            <div className="rounded-lg border border-line p-3">
              <SelectField label="Representative" value={form.repId || ""} onChange={(e) => setForm((f) => ({ ...f, repId: e.target.value }))} options={staffOptions} placeholder="Choose staff member" />
              <div className="mt-2 flex justify-end gap-2">
                <button className="btn-outline btn-sm" onClick={() => setModal(null)}>Back</button>
                <button className="btn-primary btn-sm" disabled={busy || !form.repId} onClick={() => act(`/mandates/${id}/assign`, { method: "PUT", body: { repId: form.repId }, message: "Representative assigned." })}>
                  Assign
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-500">Mandate not found.</p>
      )}
    </Modal>
  );
}

