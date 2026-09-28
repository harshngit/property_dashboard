import { useMemo, useState } from "react";
import { LuEye, LuUserCheck, LuRefreshCw } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { SelectField, TextareaField } from "../../components/common/FormField";
import useAuth from "../../hooks/useAuth";
import useStaffOptions from "../../hooks/useStaffOptions";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";
import NewsletterTab from "./NewsletterTab";

// "Get Involved" / "Advertise With Us" enquiries (GET /bd-leads). They go to
// Super Admin first; admins assign them onward (audit-logged) and the
// assignee works them through the status list. City addition requests are
// also rolled up into a ranked demand view (GET /bd-leads/city-demand).

const CATEGORY_LABELS = {
  city_addition: "City Request",
  careers: "Careers",
  broker: "Broker Partner",
  builder: "Builder Partner",
  franchisee: "Franchisee",
  advertiser: "Advertiser",
};
const STATUS_OPTIONS = ["new", "under_review", "assigned", "contacted", "converted", "rejected", "closed"].map((v) => ({
  value: v,
  label: titleCase(v),
}));
const ADMIN_ROLES = ["admin", "super_admin"];

function detailOf(l) {
  return (
    l.territory_of_interest ||
    l.position_of_interest ||
    l.business_name ||
    l.city_name ||
    l.area_name ||
    "—"
  );
}

export default function BusinessLeadsPage() {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const [tab, setTab] = useState("enquiries");
  const { data, loading, error, reload } = useApiQuery("/bd-leads?limit=100");
  const { data: demand } = useApiQuery(isAdmin ? "/bd-leads/city-demand" : null);
  const staff = useStaffOptions(["internal_sales", "agency_admin", "admin", "super_admin"]);
  const [viewing, setViewing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [assignee, setAssignee] = useState("");
  const [statusEdit, setStatusEdit] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: "contacted", notes: "" });

  const rows = useMemo(
    () =>
      (data?.items || []).map((l) => ({
        id: l.id,
        name: l.full_name,
        category: CATEGORY_LABELS[l.category] || l.category,
        contact: [l.mobile, l.email].filter(Boolean).join(" • "),
        detail: detailOf(l),
        status: titleCase(l.status),
        assignedTo: l.assigned_to_name || "Unassigned",
        date: formatDate(l.created_at),
        raw: l,
      })),
    [data]
  );

  const counts = data?.countsByCategory || {};
  const statsItems = [
    { label: "Total enquiries", value: data?.pagination?.total ?? 0, meta: "all categories" },
    { label: "Franchisee", value: counts.franchisee || 0, meta: "territory enquiries" },
    { label: "Broker / Builder", value: (counts.broker || 0) + (counts.builder || 0), meta: "partner enquiries" },
    { label: "City requests", value: counts.city_addition || 0, meta: "demand signals" },
  ];

  const assign = async () => {
    try {
      await call(`/bd-leads/${assigning.id}/assign`, { method: "PUT", body: { assignedTo: assignee } });
      toast.push("Enquiry assigned.", "success");
      setAssigning(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const saveStatus = async () => {
    try {
      await call(`/bd-leads/${statusEdit.id}/status`, { method: "PUT", body: { status: statusForm.status, notes: statusForm.notes || undefined } });
      toast.push("Status updated.", "success");
      setStatusEdit(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Type" },
    { key: "detail", label: "City / Territory / Business" },
    { key: "contact", label: "Contact" },
    { key: "assignedTo", label: "Assigned To" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    { key: "date", label: "Received" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Business Development" title="Business Leads" subtitle="Get Involved, partner, franchise, careers and advertiser enquiries, plus newsletter sign-ups." />

      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[
          ["enquiries", "Enquiries"],
          ...(isAdmin ? [["demand", "City demand"], ["newsletter", "Newsletter"]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === key ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {tab === "enquiries" ? (
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          statsItems={statsItems}
          searchKeys={["name", "contact", "detail"]}
          filters={[
            { key: "category", label: "Type", options: Object.values(CATEGORY_LABELS) },
            { key: "status", label: "Status", options: STATUS_OPTIONS.map((o) => o.label) },
          ]}
          getActions={(row) => [
            { label: "View", icon: LuEye, onClick: () => setViewing(row.raw) },
            {
              label: "Assign",
              icon: LuUserCheck,
              hidden: !isAdmin,
              onClick: () => {
                setAssignee(row.raw.assigned_to || "");
                setAssigning(row.raw);
              },
            },
            {
              label: "Update status",
              icon: LuRefreshCw,
              onClick: () => {
                setStatusForm({ status: row.raw.status, notes: "" });
                setStatusEdit(row.raw);
              },
            },
          ]}
          renderCard={(r) => (
            <div>
              <p className="font-semibold text-ink-900">{r.name}</p>
              <p className="mt-1 text-xs text-ink-500">{r.category} • {r.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2"><StatusBadge value={r.status} /></div>
              <p className="mt-3 text-xs text-ink-500">{r.assignedTo} • {r.date}</p>
            </div>
          )}
          kanban={{ key: "category", columns: Object.values(CATEGORY_LABELS) }}
          emptyTitle="No enquiries yet"
          emptySubtitle="Submissions from the website's Get Involved page will appear here."
        />
      ) : tab === "newsletter" ? (
        <NewsletterTab />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Requests</th>
                <th className="px-5 py-3">Last requested</th>
                <th className="px-5 py-3">Platform status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(demand || []).map((d) => (
                <tr key={d.city_name}>
                  <td className="px-5 py-3 font-semibold text-ink-900">{d.city_name}</td>
                  <td className="px-5 py-3">{d.requests}</td>
                  <td className="px-5 py-3 text-ink-500">{formatDate(d.last_requested_at)}</td>
                  <td className="px-5 py-3">{d.platform_status ? <StatusBadge value={titleCase(d.platform_status)} /> : <span className="text-ink-400">Not added</span>}</td>
                </tr>
              ))}
              {(demand || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink-500">No city requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.full_name} description={CATEGORY_LABELS[viewing?.category]} maxWidth="max-w-lg">
        {viewing && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Mobile", viewing.mobile],
              ["Email", viewing.email],
              ["City", viewing.city_name],
              ["Area", viewing.area_name],
              ["Territory", viewing.territory_of_interest],
              ["Position", viewing.position_of_interest],
              ["Business", viewing.business_name],
              ["Business category", viewing.business_category && titleCase(viewing.business_category)],
              ["Placement", viewing.desired_placement],
              ["Budget", viewing.budget_range],
              ["Status", titleCase(viewing.status)],
              ["Assigned to", viewing.assigned_to_name],
              ["Received", formatDate(viewing.created_at, true)],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd className="font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            {viewing.message && (
              <div className="col-span-2">
                <dt className="text-xs text-ink-500">Message</dt>
                <dd className="whitespace-pre-line text-ink-900">{viewing.message}</dd>
              </div>
            )}
            {viewing.resume_url && (
              <div className="col-span-2">
                <a href={viewing.resume_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-red-600">
                  Open resume
                </a>
              </div>
            )}
          </dl>
        )}
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign enquiry" description={assigning?.full_name}>
        <div className="space-y-4">
          <SelectField label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)} options={staff} placeholder="Select a team member" />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setAssigning(null)}>Cancel</button>
            <button className="btn-primary" disabled={!assignee} onClick={assign}>Assign</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!statusEdit} onClose={() => setStatusEdit(null)} title="Update status" description={statusEdit?.full_name}>
        <div className="space-y-4">
          <SelectField label="Status" value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))} options={STATUS_OPTIONS} />
          <TextareaField label="Internal notes (optional)" rows={3} value={statusForm.notes} onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setStatusEdit(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveStatus}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
