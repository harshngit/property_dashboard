import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuUserCheck, LuPhone } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import { LEADS } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

export default function LeadsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(LEADS);
  const [toDelete, setToDelete] = useState(null);

  const leadStats = [
    { label: "Total Leads", value: rows.length, meta: "vs last update", badge: `+${rows.filter((row) => row.status === "New").length} new` },
    { label: "New Leads", value: rows.filter((row) => row.status === "New").length, meta: "awaiting first response" },
    { label: "Contacted", value: rows.filter((row) => row.status === "Contacted").length, meta: "active follow-ups" },
    { label: "Site Visits", value: rows.filter((row) => row.status === "Site Visit").length, meta: "scheduled or done" },
  ];

  const columns = [
    {
      key: "name", label: "Lead",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={32} color="#5C6BB8" />
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.id} • {r.phone}</p>
          </div>
        </div>
      ),
    },
    { key: "property", label: "Interested Property" },
    { key: "budget", label: "Budget" },
    { key: "source", label: "Source" },
    { key: "score", label: "Score", render: (r) => <StatusBadge value={r.score} /> },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    { key: "owner", label: "Owner" },
    { key: "updated", label: "Updated", render: (r) => <span className="text-xs text-ink-500">{r.updated}</span> },
  ];

  const getActions = (row) => [
    { label: "View details", icon: LuEye, onClick: () => navigate(`/app/leads/${row.id}`) },
    { label: "Edit lead", icon: LuPencil, onClick: () => navigate(`/app/leads/${row.id}/edit`), hidden: !permissions.edit },
    { label: "Call customer", icon: LuPhone, onClick: () => toast.push(`Dialing ${row.phone}…`, "info") },
    { label: "Reassign owner", icon: LuUserCheck, onClick: () => toast.push(`${row.name} reassigned.`, "success"), hidden: !permissions.edit },
    { label: "Delete lead", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const confirmDelete = () => {
    setRows((r) => r.filter((x) => x.id !== toDelete.id));
    toast.push(`Lead ${toDelete.id} deleted.`, "success");
    setToDelete(null);
  };

  const handleKanbanDrop = (row, status) => {
    setRows((current) => current.map((item) => (
      item.id === row.id ? { ...item, status } : item
    )));
    toast.push(`${row.name} moved to ${status}.`, "success");
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
        toolbarActions={permissions.create ? (
          <button onClick={() => navigate("/app/leads/new")} className="btn-primary">
            <LuPlus className="h-4 w-4" /> Add lead
          </button>
        ) : undefined}
        searchKeys={["name", "phone", "property", "id"]}
        filters={[
          { key: "score", label: "Score", options: ["hot", "warm", "cold"] },
          { key: "status", label: "Status", options: ["New", "Contacted", "Site Visit", "Negotiation", "Booking", "Lost"] },
        ]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={r.name} size={36} color="#5C6BB8" />
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.id} • {r.phone}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-ink-700">{r.property}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.score} />
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Budget: {r.budget}</p>
              <p>Owner: {r.owner}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: ["New", "Contacted", "Site Visit", "Negotiation", "Booking", "Lost"] }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        onExport={permissions.export ? () => toast.push("Exporting leads to CSV…", "info") : undefined}
        emptyTitle="No leads yet"
        emptySubtitle="New inquiries from your website, WhatsApp and campaigns will appear here."
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this lead?"
        description={`This will permanently remove ${toDelete?.name}'s lead record and its activity history.`}
      />
    </div>
  );
}
