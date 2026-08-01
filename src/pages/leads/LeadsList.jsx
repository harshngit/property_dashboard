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

  return (
    <div>
      <PageHeader
        eyebrow="Lead Management"
        title="Leads"
        subtitle="Track every inquiry from first contact through to close."
        actions={
          permissions.create && (
            <button onClick={() => navigate("/app/leads/new")} className="btn-primary">
              <LuPlus className="h-4 w-4" /> Add lead
            </button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "phone", "property", "id"]}
        filters={[
          { key: "score", label: "Score", options: ["hot", "warm", "cold"] },
          { key: "status", label: "Status", options: ["New", "Contacted", "Site Visit", "Negotiation", "Booking", "Lost"] },
        ]}
        getActions={getActions}
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
