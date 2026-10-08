import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuCalendarCheck, LuCalendarX, LuExternalLink } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Enquiry desk. Every website enquiry sits in the tab for its kind, with
// the columns that kind needs (a home-loan enquiry shows the loan amount
// and employment, a valuation request the property, and so on) instead of
// everything being mixed into one list. Site-visit requests from customers
// have their own tab with Schedule / Decline. Admins see all enquiries;
// managers and representatives see the ones assigned to them.

const money = (v) => (v === undefined || v === null || v === "" ? "—" : Number.isFinite(Number(v)) ? formatINR(Number(v)) : String(v));
const text = (v) => (v === undefined || v === null || v === "" ? "—" : String(v));
const d = (key, fmt = text) => (r) => fmt(r.enquiry_details?.[key]);
const listing = (r) =>
  r.property_id ? (
    <Link to={`/app/properties/${r.property_id}`} className="font-semibold text-red-600 hover:underline">
      {r.property_title}
      <span className="block text-xs font-normal text-ink-500">{[r.property_locality, r.property_city].filter(Boolean).join(", ")}{r.property_price ? ` · ${r.property_price}` : ""}</span>
    </Link>
  ) : (
    "—"
  );
const topic = (r) => text(r.enquiry_topic);

// Columns specific to each kind of enquiry: [heading, cell renderer].
const COLUMNS = {
  property: [["Listing", listing]],
  home_loan: [["Loan amount", d("loanAmount", money)], ["Property value", d("propertyValue", money)], ["City", d("city")], ["Employment", d("employment")]],
  insurance: [["Cover wanted", d("coverType")], ["Property city", d("city")], ["Property value", d("propertyValue", money)]],
  legal: [["Service needed", (r) => text(r.enquiry_details?.serviceNeeded || r.enquiry_topic)], ["Property / city", d("city")], ["Listing", listing]],
  valuation: [["Property type", d("propertyType")], ["Locality / city", d("city")], ["Area (sq ft)", d("areaSqft")]],
  seller: [["Request", topic], ["Property type", d("propertyType")], ["City", d("city")], ["Expected price", d("expectedPrice", money)]],
  nri: [["Request", topic], ["Country of residence", d("country")], ["Service", d("serviceNeeded")]],
  investment: [["Interest", topic], ["Ticket size", d("ticketSize", money)], ["City", d("city")]],
  institutional: [["Request", topic], ["Institution type", d("institutionType")], ["Budget", d("budget", money)]],
  requirement: [["Responding to", topic], ["Listing", listing]],
  general: [["Topic", topic]],
};

function EnquiryTable({ type }) {
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [type, status, search]);
  const { data, loading } = useApiQuery(`/enquiries${buildQuery({ type, status, search, page, limit: 25 })}`);
  const rows = data?.items || [];
  const cols = COLUMNS[type] || COLUMNS.general;
  const pages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input id={`enq-search-${type}`} className="field-input h-9 w-64" placeholder="Search name, mobile, listing" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select id={`enq-status-${type}`} className="field-select h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Open</option>
          <option value="new">New only</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="">All</option>
        </select>
        <span className="text-xs text-ink-500">{data?.pagination?.total ?? 0} enquiries</span>
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="No enquiries of this kind match the filter." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                {cols.map(([h]) => <th key={h} className="px-4 py-3">{h}</th>)}
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Representative</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{r.customer_name}</p>
                    <p className="text-xs text-ink-500">{r.customer_mobile || "—"}{r.customer_email ? ` · ${r.customer_email}` : ""}</p>
                  </td>
                  {cols.map(([h, cell]) => <td key={h} className="px-4 py-3 align-top">{cell(r)}</td>)}
                  <td className="max-w-[260px] px-4 py-3 align-top text-xs text-ink-600">{r.message || "—"}</td>
                  <td className="px-4 py-3 align-top text-xs">{r.representative_name || <span className="text-amber-700">Unassigned</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-ink-600">{formatDate(r.created_at, true)}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge value={titleCase(r.status)} />
                    {r.deal_id && <Link to={`/app/deals/${r.deal_id}`} className="mt-1 block text-[11px] font-semibold text-red-600 hover:underline">Deal open</Link>}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <Link to={`/app/leads/${r.id}`} title="Open enquiry" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-red-600">
                      Open <LuExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-ink-500">Page {page} of {pages}</span>
          <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

const toLocalInput = (iso) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function VisitRequests({ onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const { data, loading, reload } = useApiQuery(`/enquiries/visit-requests?status=${status}`);
  const [modal, setModal] = useState(null); // { kind: schedule | decline, row }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const rows = data || [];

  const act = async (path, body, message) => {
    setBusy(true);
    try {
      await call(path, { method: "POST", body });
      toast.push(message, "success");
      setModal(null);
      reload();
      onChanged?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select id="visit-status" className="field-select h-9 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Waiting for a time</option>
          <option value="scheduled">Scheduled</option>
          <option value="declined">Declined</option>
          <option value="all">All</option>
        </select>
        <span className="text-xs text-ink-500">Requested by customers from their website dashboard.</span>
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No site visit requests" subtitle="When a customer asks for a visit on one of their enquiries, it appears here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Preferred time</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Representative</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{r.customer_name}</p><p className="text-xs text-ink-500">{r.customer_mobile || "—"}</p></td>
                  <td className="px-4 py-3">
                    {r.property_id ? <Link to={`/app/properties/${r.property_id}`} className="font-semibold text-red-600 hover:underline">{r.property_title}</Link> : "—"}
                    <p className="text-xs text-ink-500">{[r.property_locality, r.property_city].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatDate(r.preferred_at, true)}</td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-ink-600">{r.note || "—"}{r.decline_reason ? ` · Declined: ${r.decline_reason}` : ""}</td>
                  <td className="px-4 py-3 text-xs">{r.representative_name || <span className="text-amber-700">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={titleCase(r.status)} />
                    {r.visit_scheduled_at && <p className="mt-1 text-[11px] text-ink-500">Visit {formatDate(r.visit_scheduled_at, true)}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.status === "pending" ? (
                      <span className="inline-flex gap-2">
                        <button className="btn-primary btn-sm" onClick={() => { setForm({ scheduledAt: toLocalInput(r.preferred_at) }); setModal({ kind: "schedule", row: r }); }}><LuCalendarCheck className="h-4 w-4" /> Schedule</button>
                        <button className="btn-outline btn-sm" onClick={() => { setForm({ reason: "" }); setModal({ kind: "decline", row: r }); }}><LuCalendarX className="h-4 w-4" /> Decline</button>
                      </span>
                    ) : r.deal_id ? (
                      <Link to={`/app/deals/${r.deal_id}`} className="text-xs font-semibold text-red-600 hover:underline">Open deal</Link>
                    ) : (
                      <Link to={`/app/leads/${r.lead_id}`} className="text-xs font-semibold text-ink-700 hover:text-red-600">Open enquiry</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal?.kind === "schedule"} onClose={() => setModal(null)} title="Schedule site visit" description={modal ? `${modal.row.customer_name} · ${modal.row.property_title || "property"} - the customer is notified, and a deal is opened for this enquiry if there is none yet.` : ""}>
        <div className="space-y-4">
          <TextField label="Date & time" type="datetime-local" value={form.scheduledAt || ""} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} />
          <TextareaField label="Notes (optional)" rows={2} value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy || !form.scheduledAt} onClick={() => act(`/enquiries/visit-requests/${modal.row.id}/schedule`, { scheduledAt: new Date(form.scheduledAt).toISOString(), notes: form.notes || undefined }, "Visit scheduled - customer notified.")}>Schedule</button>
          </div>
        </div>
      </Modal>
      <Modal open={modal?.kind === "decline"} onClose={() => setModal(null)} title="Decline this time" description="The customer is told the reason; suggest another time when you call.">
        <div className="space-y-4">
          <TextareaField label="Reason" rows={3} value={form.reason || ""} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy || (form.reason || "").trim().length < 3} onClick={() => act(`/enquiries/visit-requests/${modal.row.id}/decline`, { reason: form.reason.trim() }, "Request declined - customer notified.")}>Decline</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function EnquiriesPage() {
  const [params, setParams] = useSearchParams();
  const summary = useApiQuery("/enquiries/summary");
  const tab = params.get("tab") || "property";
  const types = summary.data?.types || [];
  const visitsPending = summary.data?.visitRequests?.pending || 0;
  const setTab = (k) => setParams(k === "property" ? {} : { tab: k }, { replace: true });

  return (
    <div>
      <PageHeader title="Enquiries" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1">
        <button onClick={() => setTab("visits")} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === "visits" ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
          Site visit requests{visitsPending ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{visitsPending}</span> : null}
        </button>
        {types.map((t) => (
          <button key={t.type} onClick={() => setTab(t.type)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === t.type ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
            {t.label}
            <span className="ml-1.5 text-ink-400">{t.open}</span>
            {t.new ? <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.new} new</span> : null}
          </button>
        ))}
      </div>
      {tab === "visits" ? <VisitRequests onChanged={summary.reload} /> : <EnquiryTable key={tab} type={tab} />}
    </div>
  );
}
