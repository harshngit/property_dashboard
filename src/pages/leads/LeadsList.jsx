import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuEye, LuPencil, LuUserCheck, LuPhone, LuMessageCircle } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import QuickFormModal from "../../components/common/QuickFormModal";
import { ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { fetchLeads, assignLead, updateLeadStatus, clearLeadsError } from "../../redux/slices/leadsSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";

const LEAD_STATUSES = ["new", "contacted", "qualified", "hot", "warm", "cold", "won", "lost"];
const LEAD_SOURCES = ["website", "whatsapp", "manual", "campaign"];

const formatMoney = (value) => (value == null || value === "" ? null : `₹${Number(value).toLocaleString("en-IN")}`);

const formatBudget = (row) => {
  const min = formatMoney(row.budgetMin);
  const max = formatMoney(row.budgetMax);
  if (min && max) return `${min} - ${max}`;
  return min || max || "—";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

export default function LeadsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: rows, status } = useSelector((s) => s.leads);
  const { list: users } = useSelector((s) => s.users);

  const [assignTarget, setAssignTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchLeads({ limit: 100 }));
    dispatch(fetchUsers({ limit: 100 }));
    return () => dispatch(clearLeadsError());
  }, [dispatch]);

  const assigneeOptions = useMemo(
    () => users.filter((u) => u.role !== ROLES.CUSTOMER).map((u) => ({ value: u.id, label: u.name })),
    [users]
  );

  const leadStats = [
    { label: "Total Leads", value: rows.length, meta: "vs last update" },
    { label: "New Leads", value: rows.filter((r) => r.status === "new").length, meta: "awaiting first response" },
    { label: "Contacted", value: rows.filter((r) => r.status === "contacted").length, meta: "active follow-ups" },
    { label: "Won", value: rows.filter((r) => r.status === "won").length, meta: "converted" },
  ];

  const columns = [
    {
      key: "customerName", label: "Lead",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.customerName || "Unknown"} size={32} color="#5C6BB8" />
          <div>
            <p className="font-semibold text-ink-900">{r.customerName || "Unknown"}</p>
            <p className="text-xs text-ink-500">{r.customerMobile || r.customerEmail || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "propertyTitle", label: "Interested Property", render: (r) => r.propertyTitle || "Unlinked" },
    { key: "budget", label: "Budget", render: formatBudget },
    { key: "source", label: "Source", render: (r) => <span className="capitalize">{r.source}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    { key: "assignedToName", label: "Owner", render: (r) => r.assignedToName || "Unassigned" },
    { key: "updatedAt", label: "Updated", render: (r) => <span className="text-xs text-ink-500">{formatDate(r.updatedAt)}</span> },
  ];

  const getActions = (row) => [
    { label: "View details", icon: LuEye, onClick: () => navigate(`/app/leads/${row.id}`) },
    { label: "Edit lead", icon: LuPencil, onClick: () => navigate(`/app/leads/${row.id}/edit`), hidden: !permissions.edit },
    { label: "Reassign owner", icon: LuUserCheck, onClick: () => setAssignTarget(row), hidden: !permissions.edit },
    { label: "Call customer", icon: LuPhone, onClick: () => toast.push(`Dialing ${row.customerMobile || "—"}…`, "info") },
    { label: "WhatsApp", icon: LuMessageCircle, onClick: () => navigate("/app/whatsapp") },
  ];

  const handleAssignSave = async (data) => {
    const res = await dispatch(assignLead({ id: assignTarget.id, assignedTo: data.assignedTo }));
    if (assignLead.fulfilled.match(res)) {
      toast.push(`${assignTarget.customerName || "Lead"} reassigned.`, "success");
    } else {
      toast.push(res.payload || "Failed to reassign lead.", "error");
    }
    setAssignTarget(null);
  };

  const handleKanbanDrop = async (row, newStatus) => {
    const res = await dispatch(updateLeadStatus({ id: row.id, status: newStatus }));
    if (updateLeadStatus.fulfilled.match(res)) {
      toast.push(`${row.customerName || "Lead"} moved to ${newStatus}.`, "success");
    } else {
      toast.push(res.payload || "Failed to update lead status.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Lead Management"
        title="Leads"
        subtitle="Track every inquiry from first contact through to close."
      />

      <DataTable
        columns={columns}
        data={rows}
        statsItems={leadStats}
        loading={status === "loading"}
        toolbarActions={permissions.create ? (
          <button onClick={() => navigate("/app/leads/new")} className="btn-primary">
            <LuPlus className="h-4 w-4" /> Add lead
          </button>
        ) : undefined}
        searchKeys={["customerName", "customerMobile", "propertyTitle", "id"]}
        filters={[
          { key: "source", label: "Source", options: LEAD_SOURCES },
          { key: "status", label: "Status", options: LEAD_STATUSES },
        ]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={r.customerName || "Unknown"} size={36} color="#5C6BB8" />
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{r.customerName || "Unknown"}</p>
                <p className="text-xs text-ink-500">{r.customerMobile || r.customerEmail || "—"}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-ink-700">{r.propertyTitle || "Unlinked"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Budget: {formatBudget(r)}</p>
              <p>Owner: {r.assignedToName || "Unassigned"}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: LEAD_STATUSES }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        onExport={permissions.export ? () => toast.push("Exporting leads to CSV…", "info") : undefined}
        emptyTitle="No leads yet"
        emptySubtitle="New inquiries from your website, WhatsApp and campaigns will appear here."
      />

      <QuickFormModal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onSubmit={handleAssignSave}
        title="Reassign lead"
        description={assignTarget ? `Choose who should own ${assignTarget.customerName || "this lead"}.` : ""}
        fields={[{ key: "assignedTo", label: "Assign to", type: "select", options: assigneeOptions, full: true }]}
        initial={{ assignedTo: assignTarget?.assignedTo || assigneeOptions[0]?.value }}
        submitLabel="Reassign"
      />
    </div>
  );
}
